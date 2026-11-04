/**
 * Custo de um item do cardápio no evento: custo da ficha (custo_total_preparo) ÷ rendimento × quantidade.
 * O custo por unidade de rendimento NÃO é arredondado antes de multiplicar, igual ao laço de
 * calcularPrecificacaoCardapio (src/lib/precificacao-cardapio.ts); só o resultado vai a centavos.
 * Arredondar antes distorce itens medidos em g/ml (R$ 0,06918/g virava R$ 0,07/g: +1,2 %).
 */
export function custoDoItem(custoTotalPreparo: number, rendimento: number, quantidade: number): number {
  const custoPorUnidade = custoTotalPreparo / rendimento;
  return Math.round(Number((custoPorUnidade * quantidade).toFixed(8)) * 100) / 100;
}
