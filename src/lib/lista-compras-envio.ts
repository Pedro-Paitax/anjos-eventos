import "server-only";
import { pool } from "@/lib/db";

/**
 * Registro do último envio da lista de compras (migração 0007: coluna
 * lista_compras_enviada_em). Leitura e gravação FICAM FORA das consultas de
 * decisões operacionais e da Ordem de Ação, e com try/catch: se a coluna ainda
 * não existir no banco, a tela do evento abre normalmente (sem "Último envio")
 * e o erro vai para o log.
 */

function registrarFalha(contexto: string, erro: unknown): void {
  // Só o texto do erro do driver (sem DATABASE_URL, sem número de telefone).
  console.error(`[lista-compras] ${contexto}:`, erro instanceof Error ? erro.message : "erro desconhecido");
}

/** ISO do último envio, ou null (nunca enviado, linha inexistente ou coluna ausente). */
export async function obterUltimoEnvioListaCompras(eventoId: number): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ enviada_em: Date | string | null }>(
      `SELECT lista_compras_enviada_em AS enviada_em
         FROM decisoes_operacionais_evento WHERE evento_id = $1`,
      [eventoId],
    );
    const valor = rows[0]?.enviada_em;
    return valor ? new Date(valor).toISOString() : null;
  } catch (erro) {
    registrarFalha("leitura do último envio", erro);
    return null;
  }
}

/** Upsert: a linha de decisões do evento pode não existir. Devolve false se a gravação falhar. */
export async function registrarEnvioListaCompras(eventoId: number): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO decisoes_operacionais_evento (evento_id, lista_compras_enviada_em)
       VALUES ($1, NOW())
       ON CONFLICT (evento_id) DO UPDATE SET lista_compras_enviada_em = NOW()`,
      [eventoId],
    );
    return true;
  } catch (erro) {
    registrarFalha("gravação do envio", erro);
    return false;
  }
}

/** Destino na variável LISTA_COMPRAS_WHATSAPP; nunca no Git nem em log. */
export function destinoListaCompras(): string | null {
  const valor = process.env.LISTA_COMPRAS_WHATSAPP?.trim();
  return valor ? valor : null;
}

/** "•••• 1234": só os 4 últimos dígitos. Menos de 4 dígitos: não revela nada. */
export function mascararDestino(destino: string): string {
  const digitos = destino.replace(/\D/g, "");
  return digitos.length >= 4 ? `•••• ${digitos.slice(-4)}` : "••••";
}
