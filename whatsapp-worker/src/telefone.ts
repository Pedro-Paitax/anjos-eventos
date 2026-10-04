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
