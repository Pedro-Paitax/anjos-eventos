import "server-only";
import { pool } from "@/lib/db";
import type { EmbalagemCompra } from "@/lib/embalagem-compra";

/**
 * Embalagem de compra do insumo (colunas da migração 0015). Fica fora das consultas de
 * src/lib/insumos.ts: sem a migração, a leitura devolve vazio/null (a lista de compras e a tela
 * de insumo funcionam como antes) e a escrita é ignorada.
 */

/** undefined_column: a migração 0015 ainda não está no banco. */
function migracaoPendente(erro: unknown): boolean {
  return (erro as { code?: string })?.code === "42703";
}

/** null = migração pendente. */
async function lerEmbalagens(ids: number[]): Promise<Map<number, EmbalagemCompra> | null> {
  const mapa = new Map<number, EmbalagemCompra>();
  if (ids.length === 0) return mapa;
  try {
    const { rows } = await pool.query<{ id: number; nome: string; qtd: string }>(
      `SELECT id, embalagem_compra_nome AS nome, embalagem_compra_qtd AS qtd
         FROM insumos WHERE id = ANY($1::int[]) AND embalagem_compra_nome IS NOT NULL`,
      [ids],
    );
    for (const r of rows) mapa.set(r.id, { nome: r.nome, quantidade: Number(r.qtd) });
    return mapa;
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

/** Embalagens por insumo (só os que têm). Vazio sem a migração. */
export async function obterEmbalagensCompra(ids: number[]): Promise<Map<number, EmbalagemCompra>> {
  return (await lerEmbalagens(ids)) ?? new Map();
}

/** Para a tela de edição: `undefined` = migração pendente (o formulário esconde os campos). */
export async function obterEmbalagemCompraDoInsumo(id: number): Promise<EmbalagemCompra | null | undefined> {
  const mapa = await lerEmbalagens([id]);
  return mapa === null ? undefined : (mapa.get(id) ?? null);
}

/** Grava (ou limpa, com null). Devolve false se a migração ainda não existe. */
export async function gravarEmbalagemCompra(id: number, embalagem: EmbalagemCompra | null): Promise<boolean> {
  try {
    await pool.query(`UPDATE insumos SET embalagem_compra_nome = $2, embalagem_compra_qtd = $3 WHERE id = $1`, [
      id,
      embalagem?.nome ?? null,
      embalagem?.quantidade ?? null,
    ]);
    return true;
  } catch (erro) {
    if (migracaoPendente(erro)) return false;
    throw erro;
  }
}
