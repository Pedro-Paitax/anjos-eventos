import "server-only";
import { pool } from "@/lib/db";
import { dataSource } from "@/lib/data-source";
import {
  validarParametrosAjuste,
  type ParametrosAjusteAcompanhamentos,
} from "@/lib/ajuste-acompanhamentos";

export type MacroAjuste = { pesoAcompanhamento: number; ajustaPorAcompanhamentos: boolean };

export type ConfigAjusteAcompanhamentos = {
  parametros: ParametrosAjusteAcompanhamentos | null;
  aviso: string | null;
  /** Por id de macro_categorias. Vazio = colunas ainda não existem (migração 0014 pendente). */
  macros: Map<number, MacroAjuste>;
};

const DESLIGADO = (): ConfigAjusteAcompanhamentos => ({ parametros: null, aviso: null, macros: new Map() });

const numeroOuNull = (v: string | number | null) => (v == null ? null : Number(v));

/**
 * Leitura DEFENSIVA (mesmo padrão de lista-compras-envio.ts): fora das consultas do motor e com
 * try/catch. Se a migração 0014 ainda não foi aplicada (coluna ausente) ou a leitura falhar, o
 * ajuste fica desligado e o cálculo segue igual ao de antes. Legado NocoDB: sempre desligado.
 */
export async function carregarAjusteAcompanhamentos(): Promise<ConfigAjusteAcompanhamentos> {
  if (dataSource() !== "oracle") return DESLIGADO();
  try {
    const [globais, macros] = await Promise.all([
      pool.query<{ referencia: string | null; reducao: string | null; piso: string | null }>(
        `SELECT acomp_referencia AS referencia, acomp_reducao_por_item AS reducao, teto_carne_piso_g AS piso
           FROM configuracoes_globais ORDER BY id LIMIT 1`
      ),
      pool.query<{ id: number; peso: string; ajusta: boolean }>(
        `SELECT id, peso_acompanhamento AS peso, ajusta_por_acompanhamentos AS ajusta FROM macro_categorias`
      ),
    ]);
    const g = globais.rows[0];
    const { parametros, aviso } = validarParametrosAjuste({
      referencia: numeroOuNull(g?.referencia ?? null),
      reducaoPorItem: numeroOuNull(g?.reducao ?? null),
      pisoG: numeroOuNull(g?.piso ?? null),
    });
    return {
      parametros,
      aviso,
      macros: new Map(
        macros.rows.map((m) => [m.id, { pesoAcompanhamento: Number(m.peso), ajustaPorAcompanhamentos: m.ajusta }])
      ),
    };
  } catch (erro) {
    const codigo = (erro as { code?: string }).code;
    // 42703 = coluna inexistente: migração 0014 ainda não aplicada. Silencioso (é o esperado).
    if (codigo !== "42703") {
      console.error("[ajuste-acompanhamentos] leitura falhou:", erro instanceof Error ? erro.message : "erro desconhecido");
    }
    return DESLIGADO();
  }
}
