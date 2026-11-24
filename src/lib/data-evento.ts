/**
 * Converte o texto de um <input type="datetime-local"> ("2027-01-16T12:00")
 * no Date que o Drizzle grava em eventos.data_evento (timestamp SEM fuso).
 *
 * O Drizzle grava esse tipo com toISOString(), isto é, em UTC. Com
 * `new Date("2027-01-16T12:00")` o texto é lido no fuso do servidor: com o
 * processo em America/Sao_Paulo, 12:00 virava 15:00 no banco e na tela
 * (encontrado em 24/11 ao testar as correções da auditoria). Lendo o texto
 * como UTC ("...Z"), o banco guarda exatamente a hora digitada, em qualquer
 * fuso do servidor — o mesmo que a edição do evento já fazia ao gravar o
 * texto direto (src/lib/eventos.ts, atualizarEvento).
 */
const FORMATO = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/;

export function dataEventoParaGravar(texto: string): Date | null {
  const m = FORMATO.exec(texto.trim());
  if (!m) return null;
  const data = new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}.000Z`);
  // Rejeita datas que o Date "corrige" sozinho (ex.: 30/02 virando 02/03).
  if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 16) !== `${m[1]}T${m[2]}`) return null;
  return data;
}
