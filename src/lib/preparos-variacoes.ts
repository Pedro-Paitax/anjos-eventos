import "server-only";
import { pool } from "@/lib/db";

/**
 * Versões de preparo (tabela preparo_variacoes, migration 0012). Só agrupamento de tela:
 * nenhum cálculo de custo, porção ou preço lê daqui.
 * Leituras devolvem `null` com a migration pendente; as telas seguem sem agrupar.
 */

function migracaoPendente(erro: unknown): boolean {
  const codigo = (erro as { code?: string })?.code;
  return codigo === "42P01" || codigo === "42703";
}

/** preparo_id da versão → preparo_id do base. */
export async function mapaVariacoes(): Promise<Map<number, number> | null> {
  try {
    const { rows } = await pool.query<{ preparoId: number; baseId: number }>(
      `SELECT preparo_id AS "preparoId", base_preparo_id AS "baseId" FROM preparo_variacoes`,
    );
    return new Map(rows.map((r) => [r.preparoId, r.baseId]));
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

export type SituacaoVariacao = {
  /** Base deste preparo (se ele for uma versão). */
  base: { id: number; nome: string } | null;
  /** Versões deste preparo (se ele for base). */
  versoes: { id: number; nome: string }[];
};

export async function situacaoVariacao(preparoId: number): Promise<SituacaoVariacao | null> {
  try {
    const [base, versoes] = await Promise.all([
      pool.query<{ id: number; nome: string }>(
        `SELECT p.id, p.nome_preparo AS nome FROM preparo_variacoes v JOIN preparos p ON p.id = v.base_preparo_id
          WHERE v.preparo_id = $1`,
        [preparoId],
      ),
      pool.query<{ id: number; nome: string }>(
        `SELECT p.id, p.nome_preparo AS nome FROM preparo_variacoes v JOIN preparos p ON p.id = v.preparo_id
          WHERE v.base_preparo_id = $1 ORDER BY p.nome_preparo`,
        [preparoId],
      ),
    ]);
    return { base: base.rows[0] ?? null, versoes: versoes.rows };
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

/**
 * Liga (ou desliga, com `baseId = null`) o preparo como versão de outro. Um nível só:
 * o base não pode ser versão, e um preparo que já tem versões não pode virar versão.
 * Roda sob trava para duas telas abertas não montarem uma cadeia.
 */
export async function definirVariacaoDe(preparoId: number, baseId: number | null): Promise<{ ok: true } | { erro: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('preparo_variacoes'))");
    if (baseId === null) {
      await client.query(`DELETE FROM preparo_variacoes WHERE preparo_id = $1`, [preparoId]);
      await client.query("COMMIT");
      return { ok: true };
    }
    const erro =
      baseId === preparoId
        ? "Um preparo não pode ser versão dele mesmo."
        : !(await client.query(`SELECT 1 FROM preparos WHERE id = $1`, [baseId])).rowCount
          ? "O preparo base escolhido não existe mais."
          : (await client.query(`SELECT 1 FROM preparo_variacoes WHERE preparo_id = $1`, [baseId])).rowCount
            ? "O preparo escolhido já é uma versão de outro. Escolha o preparo base."
            : (await client.query(`SELECT 1 FROM preparo_variacoes WHERE base_preparo_id = $1`, [preparoId])).rowCount
              ? "Este preparo tem versões ligadas a ele, então não pode virar versão de outro."
              : null;
    if (erro) {
      await client.query("ROLLBACK");
      return { erro };
    }
    await client.query(
      `INSERT INTO preparo_variacoes (preparo_id, base_preparo_id) VALUES ($1, $2)
       ON CONFLICT (preparo_id) DO UPDATE SET base_preparo_id = EXCLUDED.base_preparo_id`,
      [preparoId, baseId],
    );
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    if (migracaoPendente(e)) return { erro: "As versões de preparo ainda não estão ativas neste banco." };
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Versão criada pela tela herda o header do base, se ainda não tiver nenhum. O formulário de
 * preparo não edita header, e preparo sem header sai do cálculo do cardápio em silêncio
 * (docs/PENDENCIAS_NOTURNAS.md, "Achado complementar").
 */
export async function copiarHeadersDoBase(preparoId: number, baseId: number): Promise<void> {
  await pool.query(
    `INSERT INTO header_preparo (header_ui_id, preparo_id)
     SELECT hp.header_ui_id, $1 FROM header_preparo hp
      WHERE hp.preparo_id = $2
        AND NOT EXISTS (SELECT 1 FROM header_preparo x WHERE x.preparo_id = $1)
     ON CONFLICT DO NOTHING`,
    [preparoId, baseId],
  );
}
