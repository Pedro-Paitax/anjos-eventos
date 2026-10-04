// Constantes de docs/DECISOES.md, seção "Precificação por Cardápio
// Selecionado + Custo de Equipe Fixa". Arquivo sem "server-only" e sem
// dependência do motor de dimensionamento/custo — pode ser importado tanto
// no servidor (src/lib/precificacao-cardapio.ts) quanto direto no client
// (placeholder de Quantidade_Garcom e preview da Taxa_Deslocamento antes
// da resposta do servidor), evitando duplicar os números em dois lugares.

export const TAXA_DESLOCAMENTO_METROPOLITANA = 250;
export const VALOR_GARCOM_PADRAO = 230;
export const VALOR_COPEIRA = 250;
export const VALOR_ASSADOR = 250;
export const CONVIDADOS_POR_GARCOM = 30;
export const CONVIDADOS_POR_COPEIRA = 50;
export const CONVIDADOS_POR_ASSADOR = 100;
export const MARKUP_CARDAPIO = 1.4;
// Rateio Operacional Explícito: consumíveis (carvão, descartáveis etc.) =
// base fixa + valor por convidado. Entra, junto com assador e copeira, na
// base de custo ANTES do markup (nunca aparece como linha pro cliente).
export const BASE_CONSUMIVEIS_FIXA = 80.0;
export const CONSUMIVEIS_POR_CONVIDADO = 2.5;

export function ceilDivisao(numerador: number, divisor: number): number {
  return Math.ceil(numerador / divisor);
}

export function calcularTaxaDeslocamento(regiaoMetropolitanaCuritiba: boolean): number {
  return regiaoMetropolitanaCuritiba ? TAXA_DESLOCAMENTO_METROPOLITANA : 0;
}

export function sugerirQuantidadeGarcom(numConvidados: number): number {
  return ceilDivisao(numConvidados, CONVIDADOS_POR_GARCOM);
}

export function sugerirQuantidadeCopeira(numConvidados: number): number {
  return ceilDivisao(numConvidados, CONVIDADOS_POR_COPEIRA);
}

export function sugerirQuantidadeAssador(numConvidados: number): number {
  return ceilDivisao(numConvidados, CONVIDADOS_POR_ASSADOR);
}
