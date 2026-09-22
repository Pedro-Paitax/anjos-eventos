import { distribuirPorcoes, type ItemResolvido } from "@/lib/dimensionamento-cardapio";
import {
  MARKUP_CARDAPIO,
  VALOR_GARCOM_PADRAO,
  VALOR_COPEIRA,
  VALOR_ASSADOR,
  CONVIDADOS_POR_GARCOM,
  CONVIDADOS_POR_COPEIRA,
  CONVIDADOS_POR_ASSADOR,
  ceilDivisao,
  calcularTaxaDeslocamento,
} from "@/lib/precificacao-constantes";

export { calcularTaxaDeslocamento };

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

/**
 * TETO em centavos — arredonda pra cima só o suficiente pra não deixar
 * fração de centavo, sem "embelezar" o preço pro Real inteiro (isso mudaria
 * quanto o cliente paga; não é uma decisão que foi tomada). Mesma correção
 * de ruído de ponto flutuante do `arredondar`, trocando round por ceil.
 */
function arredondarParaCimaCentavos(valor: number): number {
  return Math.ceil(Number(valor.toFixed(8)) * 100) / 100;
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
  /** UOM Rendimento cru do preparo e Peso_Medio_Unidade_G — só pra alimentar a conversão de unidade do distribuirPorcoes (docs/DECISOES.md, "Correção do Bug de Mistura de Unidades"), mesmo papel de ItemResolvido. */
  unidadeRendimentoPreparo: string;
  pesoMedioUnidadeG: number | null;
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
    unidadeRendimentoPreparo: item.unidadeRendimentoPreparo,
    pesoMedioUnidadeG: item.pesoMedioUnidadeG,
    // Não usado por distribuirPorcoes (só serve pra resolverItensPorPreparoIds
    // repassar pra calcularCustoPreparo sem buscar o Preparo de novo) — aqui
    // o rendimento já resolvido do motor de custo é equivalente.
    rendimentoPreparo: item.rendimento,
  }));

  const macroCategorias = distribuirPorcoes(itensResolvidos, numConvidados);
  const dadosCustoPorPreparoId = new Map(itens.map((item) => [item.preparoId, item]));

  let custoCardapioTotal = 0;
  for (const macro of macroCategorias) {
    for (const item of macro.itens) {
      const dadosCusto = dadosCustoPorPreparoId.get(item.preparo_id);
      if (!dadosCusto) continue;
      const custoPorUnidade = dadosCusto.custoTotalPreparo / dadosCusto.rendimento;
      const custoItem = arredondar(custoPorUnidade * item.quantidade_para_custo);
      custoCardapioTotal = arredondar(custoCardapioTotal + custoItem);
    }
  }

  // Arredonda pra centavos ANTES de aplicar o markup — não depois. Sem
  // isso, Custo_Por_Pessoa (exibido já arredondado) x 1,40 podia divergir
  // em 1 centavo de Valor_Sugerido_Por_Pessoa (que usava o valor cru, sem
  // arredondar) num arredondamento duplo silencioso. Achado ao expor os
  // dois valores lado a lado no Simulador de Cardápio — ver
  // src/lib/precificacao-cardapio.test.ts.
  const custoCardapioPorPessoa = arredondar(custoCardapioTotal / numConvidados);
  const valorSugeridoPorPessoa = arredondarParaCimaCentavos(custoCardapioPorPessoa * MARKUP_CARDAPIO);
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
    custo_cardapio_por_pessoa: custoCardapioPorPessoa,
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

export type DistribuicaoConvidados = {
  adultos: number;
  criancasAte5: number;
  criancas5a10: number;
};

/**
 * Variante de calcularPrecificacaoCardapio EXCLUSIVA do fluxo de Criar
 * Evento (Senhor Churrasco) — decisão do Pedro de 2026-09-08, registrada
 * em docs/DECISOES.md: a meia-entrada de criança só se aplica no Valor
 * Sugerido Total AQUI, nunca em calcularPrecificacaoCardapio/
 * valor_sugerido_total_evento (usado sozinho pelo Simulador de Cardápio
 * isolado, que só tem Número de Convidados total, sem faixa etária, e não
 * deve ser alterado).
 *
 * Reaproveita calcularPrecificacaoCardapio pra tudo que é compartilhado
 * (por pessoa, criança, garçom/copeira/assador, taxa) e recalcula só o
 * Valor_Sugerido_Total_Evento, com adultos pagando cheio e crianças
 * pagando meia — em vez de preço cheio × todos os convidados.
 */
export function calcularPrecificacaoParaEvento(
  itens: ItemCardapioPrecificacao[],
  opcoes: OpcoesPrecificacao,
  distribuicao: DistribuicaoConvidados
): PrecificacaoResultado {
  const base = calcularPrecificacaoCardapio(itens, opcoes);

  const valorSugeridoTotalEvento = arredondar(
    distribuicao.adultos * base.valor_sugerido_por_pessoa +
      (distribuicao.criancasAte5 + distribuicao.criancas5a10) * base.valor_sugerido_crianca +
      base.taxa_deslocamento +
      base.quantidade_garcom_usada * base.valor_garcom
  );

  return { ...base, valor_sugerido_total_evento: valorSugeridoTotalEvento };
}
