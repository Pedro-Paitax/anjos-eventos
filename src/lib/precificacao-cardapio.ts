import { distribuirPorcoes, type ItemResolvido } from "@/lib/dimensionamento-cardapio";

// Constantes de docs/DECISOES.md, seção "Precificação por Cardápio
// Selecionado + Custo de Equipe Fixa".
const MARKUP_CARDAPIO = 1.4;
const TAXA_DESLOCAMENTO_METROPOLITANA = 250;
const VALOR_GARCOM_PADRAO = 230;
const VALOR_COPEIRA = 250;
const VALOR_ASSADOR = 250;
const CONVIDADOS_POR_GARCOM = 30;
const CONVIDADOS_POR_COPEIRA = 50;
const CONVIDADOS_POR_ASSADOR = 100;

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

function ceilDivisao(numerador: number, divisor: number): number {
  return Math.ceil(numerador / divisor);
}

export type ItemCardapioPrecificacao = {
  preparoId: number;
  preparoNome: string;
  headerExibicao: string;
  macroCategoriaChave: string | number;
  macroCategoriaNome: string;
  capacidadeTeto: number;
  unidade: string;
  peso: number;
  porcaoMaximaIndividual: number | null;
  /** custo_total_preparo do motor de custo (docs/REGRAS_NEGOCIO.md seção 4) */
  custoTotalPreparo: number;
  rendimento: number;
};

export type OpcoesPrecificacao = {
  numConvidados: number;
  regiaoMetropolitanaCuritiba: boolean;
  /** Se omitido, usa a sugestão (CETO(Num_Convidados/30)). */
  quantidadeGarcom?: number;
  /** Se omitido, usa o padrão de R$230 (docs/DECISOES.md). */
  valorGarcom?: number;
};

export type PrecificacaoResultado = {
  custo_cardapio_total: number;
  custo_cardapio_por_pessoa: number;
  valor_sugerido_por_pessoa: number;
  valor_sugerido_crianca: number;
  taxa_deslocamento: number;
  quantidade_garcom_sugerida: number;
  quantidade_garcom_usada: number;
  valor_garcom: number;
  quantidade_copeira_sugerida: number;
  custo_copeira_total: number;
  quantidade_assador_sugerida: number;
  custo_assador_total: number;
  valor_sugerido_total_evento: number;
};

export function calcularTaxaDeslocamento(regiaoMetropolitanaCuritiba: boolean): number {
  return regiaoMetropolitanaCuritiba ? TAXA_DESLOCAMENTO_METROPOLITANA : 0;
}

/**
 * Núcleo puro da precificação por cardápio selecionado (sem I/O). Reaproveita
 * distribuirPorcoes (motor de dimensionamento, docs/REGRAS_NEGOCIO.md seção
 * 5) pra achar a porção/volume necessário de cada item, e combina com o
 * custo_total_preparo/rendimento de cada um (motor de custo, seção 4) pra
 * chegar no custo total do cardápio — mesma composição já usada no Motor de
 * Margem (src/lib/margem-orcamento.ts).
 */
export function calcularPrecificacaoCardapio(
  itens: ItemCardapioPrecificacao[],
  opcoes: OpcoesPrecificacao
): PrecificacaoResultado {
  const { numConvidados, regiaoMetropolitanaCuritiba } = opcoes;
  const valorGarcom = opcoes.valorGarcom ?? VALOR_GARCOM_PADRAO;
  const quantidadeGarcomSugerida = ceilDivisao(numConvidados, CONVIDADOS_POR_GARCOM);
  const quantidadeGarcomUsada = opcoes.quantidadeGarcom ?? quantidadeGarcomSugerida;

  const itensResolvidos: ItemResolvido[] = itens.map((item) => ({
    preparoId: item.preparoId,
    preparoNome: item.preparoNome,
    headerExibicao: item.headerExibicao,
    peso: item.peso,
    origemPeso: "",
    porcaoMaximaIndividual: item.porcaoMaximaIndividual,
    macroCategoriaChave: item.macroCategoriaChave,
    macroCategoriaNome: item.macroCategoriaNome,
    capacidadeTeto: item.capacidadeTeto,
    unidade: item.unidade,
  }));

  const macroCategorias = distribuirPorcoes(itensResolvidos, numConvidados);
  const dadosCustoPorPreparoId = new Map(itens.map((item) => [item.preparoId, item]));

  let custoCardapioTotal = 0;
  for (const macro of macroCategorias) {
    for (const item of macro.itens) {
      const dadosCusto = dadosCustoPorPreparoId.get(item.preparo_id);
      if (!dadosCusto) continue;
      const custoPorUnidade = dadosCusto.custoTotalPreparo / dadosCusto.rendimento;
      const custoItem = arredondar(custoPorUnidade * item.volume_necessario_total);
      custoCardapioTotal = arredondar(custoCardapioTotal + custoItem);
    }
  }

  const custoCardapioPorPessoa = custoCardapioTotal / numConvidados;
  // TETO em reais inteiros — preço "redondo" pro cliente, sem centavos.
  const valorSugeridoPorPessoa = Math.ceil(custoCardapioPorPessoa * MARKUP_CARDAPIO);
  const valorSugeridoCrianca = arredondar(valorSugeridoPorPessoa / 2);

  const taxaDeslocamento = calcularTaxaDeslocamento(regiaoMetropolitanaCuritiba);

  const quantidadeCopeiraSugerida = ceilDivisao(numConvidados, CONVIDADOS_POR_COPEIRA);
  const custoCopeiraTotal = quantidadeCopeiraSugerida * VALOR_COPEIRA;

  const quantidadeAssadorSugerida = ceilDivisao(numConvidados, CONVIDADOS_POR_ASSADOR);
  const custoAssadorTotal = quantidadeAssadorSugerida * VALOR_ASSADOR;

  const valorSugeridoTotalEvento = arredondar(
    valorSugeridoPorPessoa * numConvidados + taxaDeslocamento + quantidadeGarcomUsada * valorGarcom
  );

  return {
    custo_cardapio_total: custoCardapioTotal,
    custo_cardapio_por_pessoa: arredondar(custoCardapioPorPessoa),
    valor_sugerido_por_pessoa: valorSugeridoPorPessoa,
    valor_sugerido_crianca: valorSugeridoCrianca,
    taxa_deslocamento: taxaDeslocamento,
    quantidade_garcom_sugerida: quantidadeGarcomSugerida,
    quantidade_garcom_usada: quantidadeGarcomUsada,
    valor_garcom: valorGarcom,
    quantidade_copeira_sugerida: quantidadeCopeiraSugerida,
    custo_copeira_total: custoCopeiraTotal,
    quantidade_assador_sugerida: quantidadeAssadorSugerida,
    custo_assador_total: custoAssadorTotal,
    valor_sugerido_total_evento: valorSugeridoTotalEvento,
  };
}
