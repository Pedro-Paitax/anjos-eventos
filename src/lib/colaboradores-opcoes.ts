export const FUNCOES_COLABORADOR = ["copeira", "assador", "garcom"] as const;
export type FuncaoColaborador = (typeof FUNCOES_COLABORADOR)[number];

export const ROTULOS_FUNCAO: Record<FuncaoColaborador, string> = {
  copeira: "Copeira",
  assador: "Assador",
  garcom: "Garçom",
};

/**
 * Normaliza WhatsApp para dígitos com DDI (ex.: "+55 (41) 99999-9999" →
 * "5541999999999"). Retorna null se vazio, e "invalido" se não tiver entre
 * 10 e 15 dígitos (limite E.164) — não presume DDI quando ele falta.
 */
export function normalizarTelefoneWhatsapp(
  bruto: string
): string | null | "invalido" {
  const digitos = bruto.replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.length >= 10 && digitos.length <= 15 ? digitos : "invalido";
}
