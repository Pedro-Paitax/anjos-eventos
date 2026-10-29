/**
 * Converte um número em formato internacional (só dígitos, com DDI; aceita
 * "+", espaços, parênteses e hífens) para o JID do WhatsApp. Não presume DDI.
 */
export function paraJid(numero: string): string {
  const digitos = numero.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 15) {
    throw new Error("Número inválido: use DDI + DDD + número (10 a 15 dígitos).");
  }
  return `${digitos}@s.whatsapp.net`;
}

export class NumeroSemWhatsappError extends Error {
  constructor() {
    super("Número sem WhatsApp.");
  }
}

/**
 * Escolhe o JID que o próprio WhatsApp devolveu para o número (`onWhatsApp`).
 * Não dá para montar o JID só com os dígitos: no Brasil, contas antigas de vários
 * DDDs (ex.: 41) existem SEM o nono dígito. Enviar para o JID "com 9" não dá erro,
 * mas a mensagem nunca chega.
 */
export function jidDoWhatsapp(
  resultado: { exists?: unknown; jid: string }[] | undefined,
): string {
  // No Baileys 6.7.24 o tipo de `exists` é `unknown`; na prática é boolean (contato "in").
  const achado = resultado?.find((r) => r.exists === true);
  if (!achado) throw new NumeroSemWhatsappError();
  return achado.jid;
}
