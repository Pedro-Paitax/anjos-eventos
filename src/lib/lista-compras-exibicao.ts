import { textoUnidadeComEmbalagem } from "@/lib/embalagem-compra";

type ItemExibicao = {
  unidade: string;
  quantidadeCompra: number;
  embalagem?: { nome: string; tamanho: number; embalagens: number };
};

/**
 * O que a tela e o PDF mostram nas colunas "Qtd. a comprar" e "Unidade".
 * Sem embalagem: a quantidade e a unidade do insumo, como sempre.
 * Com embalagem: "12" + "bandejas (69 unidades)". Não mostra a sobra.
 */
export function linhaDeCompra(item: ItemExibicao): { quantidadeCompra: number; unidade: string } {
  if (!item.embalagem) {
    return { quantidadeCompra: item.quantidadeCompra, unidade: item.unidade };
  }
  return {
    quantidadeCompra: item.embalagem.embalagens,
    unidade: textoUnidadeComEmbalagem(item.embalagem, item.quantidadeCompra, item.unidade),
  };
}
