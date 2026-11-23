import "server-only";
import { pool } from "@/lib/db";
import type { ItemCargaCadastro, MarcacaoFicha, TemperoFicha } from "@/lib/checklist-carregamento";

/**
 * Acesso às tabelas da migração 0016 (itens_carga, preparo_itens_carga, insumos.eh_tempero).
 * Fica fora das consultas de evento, ficha e insumo: se o deploy chegar antes da migração, a tela
 * do evento e a ficha abrem normalmente, o botão do checklist explica que falta a migração e a
 * lista de marcar da ficha não aparece (mesmo padrão de lista-compras-envio.ts e embalagem-insumo.ts).
 */

/** undefined_table / undefined_column: a migração 0016 ainda não está no banco. */
function migracaoPendente(erro: unknown): boolean {
  const code = (erro as { code?: string })?.code;
  return code === "42P01" || code === "42703";
}

/**
 * sem-migracao: tabelas/coluna ausentes; sem-itens: migração aplicada, mas o cadastro de itens
 * (scripts/dados-0016-checklist-carregamento.sql) ainda não foi carregado.
 */
export type SituacaoChecklist = "ok" | "sem-migracao" | "sem-itens";

export const MENSAGEM_SITUACAO: Record<Exclude<SituacaoChecklist, "ok">, string> = {
  "sem-migracao": "O checklist precisa da migração 0016 do banco, que ainda não foi aplicada.",
  "sem-itens": "O cadastro de itens de carga está vazio: falta rodar o script de dados da migração 0016.",
};

export async function situacaoChecklist(): Promise<SituacaoChecklist> {
  try {
    const { rows } = await pool.query<{ itens: number }>(
      `SELECT (SELECT count(*) FROM itens_carga WHERE ativo)::int AS itens,
              (SELECT count(*) FROM insumos WHERE eh_tempero)::int AS temperos`,
    );
    return rows[0].itens > 0 ? "ok" : "sem-itens";
  } catch (erro) {
    if (migracaoPendente(erro)) return "sem-migracao";
    throw erro;
  }
}

export type DadosCargaEvento = {
  itensCarga: ItemCargaCadastro[];
  marcacoes: MarcacaoFicha[];
  temperosFicha: TemperoFicha[];
};

type LinhaItem = {
  id: number;
  nome: string;
  categoria: string;
  subgrupo: string | null;
  sempre: boolean;
  marcavel_ficha: boolean;
  regra: string | null;
  insumo_id: number | null;
  ordem: number;
};

const paraItem = (r: LinhaItem): ItemCargaCadastro => ({
  id: r.id,
  nome: r.nome,
  categoria: r.categoria,
  subgrupo: r.subgrupo,
  sempre: r.sempre,
  marcavelFicha: r.marcavel_ficha,
  regra: r.regra,
  insumoId: r.insumo_id,
  ordem: r.ordem,
});

const COLUNAS_ITEM = "id, nome, categoria, subgrupo, sempre, marcavel_ficha, regra, insumo_id, ordem";

/** Cadastro, marcações e temperos das fichas do cardápio. null = migração pendente. */
export async function obterDadosCargaEvento(preparoIds: number[]): Promise<DadosCargaEvento | null> {
  try {
    const [itens, marcacoes, temperos] = await Promise.all([
      pool.query<LinhaItem>(`SELECT ${COLUNAS_ITEM} FROM itens_carga WHERE ativo ORDER BY categoria, ordem, nome`),
      pool.query<{ preparo_id: number; item_carga_id: number }>(
        `SELECT pic.preparo_id, pic.item_carga_id
           FROM preparo_itens_carga pic JOIN itens_carga ic ON ic.id = pic.item_carga_id
          WHERE ic.ativo AND pic.preparo_id = ANY($1::int[])`,
        [preparoIds],
      ),
      pool.query<{ preparo_id: number; insumo_id: number; nome: string }>(
        `SELECT DISTINCT c.preparo_id, i.id AS insumo_id, i.nome
           FROM composicao c JOIN insumos i ON i.id = c.insumo_id
          WHERE i.eh_tempero AND c.preparo_id = ANY($1::int[])`,
        [preparoIds],
      ),
    ]);
    return {
      itensCarga: itens.rows.map(paraItem),
      marcacoes: marcacoes.rows.map((r) => ({ preparoId: r.preparo_id, itemCargaId: r.item_carga_id })),
      temperosFicha: temperos.rows.map((r) => ({ preparoId: r.preparo_id, insumoId: r.insumo_id, nome: r.nome })),
    };
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

export type ItemMarcavel = { id: number; nome: string; categoria: string };
export type ItensCargaFicha = {
  itens: ItemMarcavel[];
  marcados: number[];
  /** preparos.apresentacao_utensilio: só referência para marcar (C20), nunca apagado nem migrado. */
  textoAntigo: string | null;
};

/**
 * Para a tela da ficha: itens marcáveis (e os já marcados, mesmo que deixem de ser marcáveis).
 * null = migração pendente (a lista não aparece).
 */
export async function obterItensCargaFicha(preparoId: number): Promise<ItensCargaFicha | null> {
  try {
    const [itens, marcados, texto] = await Promise.all([
      pool.query<ItemMarcavel>(
        `SELECT id, nome, categoria FROM itens_carga ic
          WHERE ativo AND (marcavel_ficha OR EXISTS (
            SELECT 1 FROM preparo_itens_carga p WHERE p.item_carga_id = ic.id AND p.preparo_id = $1))
          ORDER BY ordem, nome`,
        [preparoId],
      ),
      pool.query<{ item_carga_id: number }>(
        "SELECT item_carga_id FROM preparo_itens_carga WHERE preparo_id = $1",
        [preparoId],
      ),
      pool.query<{ texto: string | null }>("SELECT apresentacao_utensilio AS texto FROM preparos WHERE id = $1", [
        preparoId,
      ]),
    ]);
    const textoAntigo = texto.rows[0]?.texto?.trim() || null;
    return { itens: itens.rows, marcados: marcados.rows.map((r) => r.item_carga_id), textoAntigo };
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

/**
 * Troca as marcações da ficha pelas recebidas (só itens ativos existentes), em transação.
 * false = migração pendente.
 */
export async function gravarItensCargaFicha(preparoId: number, itemIds: number[]): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM preparo_itens_carga WHERE preparo_id = $1", [preparoId]);
    if (itemIds.length > 0) {
      await client.query(
        `INSERT INTO preparo_itens_carga (preparo_id, item_carga_id)
         SELECT $1, id FROM itens_carga WHERE ativo AND id = ANY($2::int[])`,
        [preparoId, itemIds],
      );
    }
    await client.query("COMMIT");
    return true;
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    if (migracaoPendente(erro)) return false;
    throw erro;
  } finally {
    client.release();
  }
}
