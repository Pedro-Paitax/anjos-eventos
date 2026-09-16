import "server-only";
import { exigirToken } from "@/lib/nocodb";
import {
  distribuirPorcoes,
  resolverItensPorPreparoIds,
} from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import {
  calcularPrecificacaoCardapio,
  type ItemCardapioPrecificacao,
  type OpcoesPrecificacao,
  type PrecificacaoResultado,
} from "@/lib/precificacao-cardapio";

export type DebugErro = { erro: string; status: number };

export type LinhaDebugItem = {
  preparoId: number;
  preparoNome: string;
  macroCategoriaNome: string;
  unidadeMacro: string;
  unidadeRendimentoPreparo: string;
  /** true quando a unidade de rendimento do preparo diverge da unidade da macro — sintoma do bug de mistura de unidades (docs/PENDENCIAS_NOTURNAS.md). */
  unidadeDivergente: boolean;
  peso: number;
  origemPeso: string;
  somaPesosGrupo: number;
  capacidadeTeto: number;
  porcaoCalculada: number;
  porcaoMaximaIndividual: number | null;
  porcaoFinal: number;
  limitadaPorHardCap: boolean;
  volumeNecessarioTotal: number;
  /** Quantidade efetivamente usada no motor de custo — igual a volumeNecessarioTotal, exceto quando convertido de g/ml pra contagem de unidades (docs/DECISOES.md, "Correção do Bug de Mistura de Unidades"). */
  quantidadeParaCusto: number;
  rendimento: number;
  custoTotalPreparo: number;
  custoPorUnidadeRendimento: number;
  custoTotalItem: number;
};

export type DebugCalculoResultado = {
  linhas: LinhaDebugItem[];
  itensExcluidos: { preparo: string; motivo: string }[];
  resultadoFinal: PrecificacaoResultado;
};

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

/** "un" (Macro_Categorias.UOM) e "unidade" (unidade_rendimento de custo-preparo.ts) são o mesmo conceito com grafias diferentes nos dois lugares do schema — normaliza só pra comparação de exibição. */
function normalizarUnidade(unidade: string): string {
  const minuscula = unidade.toLowerCase();
  return minuscula === "un" ? "unidade" : minuscula;
}

/**
 * Camada de diagnóstico: NÃO reimplementa nenhuma regra de cálculo — só
 * chama distribuirPorcoes e calcularPrecificacaoCardapio (exatamente as
 * mesmas funções usadas pelo Simulador de Cardápio e por Criar Evento, ver
 * src/lib/precificacao-evento.ts) e expõe o resultado intermediário de cada
 * uma, item a item, que essas funções hoje descartam ao retornar só o
 * agregado. Construída para investigar o bug de mistura de unidades
 * (docs/PENDENCIAS_NOTURNAS.md, "PRIORIDADE MÁXIMA") sem corrigi-lo.
 */
export async function calcularDebugCardapio(
  preparoIds: number[],
  opcoes: OpcoesPrecificacao
): Promise<DebugCalculoResultado | DebugErro> {
  if (preparoIds.length === 0) {
    return { erro: "Informe ao menos um preparo_id em ?preparos=", status: 422 };
  }
  if (!opcoes.numConvidados || opcoes.numConvidados <= 0) {
    return { erro: "Informe ?convidados= com um número maior que zero.", status: 422 };
  }

  const token = exigirToken();
  const { itensResolvidos, itensExcluidos } = await resolverItensPorPreparoIds(preparoIds, token);

  const custosPorPreparoId = new Map<
    number,
    { custoTotalPreparo: number; rendimento: number; unidadeRendimentoPreparo: string }
  >();
  const semCusto: { preparo: string; motivo: string }[] = [];
  await Promise.all(
    itensResolvidos.map(async (item) => {
      // Mesma otimização de src/lib/precificacao-evento.ts: repassa o
      // Preparo já buscado por resolverItensPorPreparoIds em vez de buscar
      // de novo (docs/DECISOES.md, "Política de Falha do Motor de Cálculo").
      const custo = await calcularCustoPreparo(item.preparoId, {
        "Nome Do Preparo": item.preparoNome,
        Rendimento: item.rendimentoPreparo,
        "UOM Rendimento": item.unidadeRendimentoPreparo,
      });
      if ("erro" in custo) {
        semCusto.push({ preparo: item.preparoNome, motivo: custo.erro });
        return;
      }
      custosPorPreparoId.set(item.preparoId, {
        custoTotalPreparo: custo.custo_total_preparo,
        rendimento: custo.rendimento,
        unidadeRendimentoPreparo: custo.unidade_rendimento,
      });
    })
  );

  const itensComCusto = itensResolvidos.filter((item) => custosPorPreparoId.has(item.preparoId));
  if (itensComCusto.length === 0) {
    return {
      erro: "Nenhum item pôde ser calculado (peso/macro-categoria ou custo não configurados).",
      status: 422,
    };
  }

  // Mesma função de dimensionamento usada em produção, chamada direto (sem
  // reimplementar a fórmula) pra expor o detalhe por item que ela calcula
  // internamente mas normalmente não retorna sozinha.
  const macroCategoriasDimensionadas = distribuirPorcoes(itensComCusto, opcoes.numConvidados);

  const itensParaPrecificacao: ItemCardapioPrecificacao[] = itensComCusto.map((item) => {
    const custo = custosPorPreparoId.get(item.preparoId)!;
    return {
      preparoId: item.preparoId,
      preparoNome: item.preparoNome,
      headerExibicao: item.headerExibicao,
      macroCategoriaChave: item.macroCategoriaChave,
      macroCategoriaNome: item.macroCategoriaNome,
      capacidadeTeto: item.capacidadeTeto,
      unidade: item.unidade,
      peso: item.peso,
      porcaoMaximaIndividual: item.porcaoMaximaIndividual,
      custoTotalPreparo: custo.custoTotalPreparo,
      rendimento: custo.rendimento,
      unidadeRendimentoPreparo: item.unidadeRendimentoPreparo,
      pesoMedioUnidadeG: item.pesoMedioUnidadeG,
    };
  });

  // Mesma função de precificação usada em produção — reaproveitada sem
  // alteração só pra chegar no agregado final (valor sugerido etc.),
  // exibido junto da tabela de diagnóstico pra dar o contexto do resultado.
  const resultadoFinal = calcularPrecificacaoCardapio(itensParaPrecificacao, opcoes);

  const linhas: LinhaDebugItem[] = [];
  for (const macro of macroCategoriasDimensionadas) {
    const somaPesosGrupo = arredondar(macro.itens.reduce((soma, item) => soma + item.peso_item, 0));

    for (const item of macro.itens) {
      const custo = custosPorPreparoId.get(item.preparo_id);
      if (!custo) continue;

      const custoPorUnidadeRendimento = arredondar(custo.custoTotalPreparo / custo.rendimento);
      // Não recalcula por conta própria — usa direto o que distribuirPorcoes
      // já produziu (o próprio campo que carrega a correção do bug).
      const custoTotalItem = arredondar(custoPorUnidadeRendimento * item.quantidade_para_custo);

      linhas.push({
        preparoId: item.preparo_id,
        preparoNome: item.preparo,
        macroCategoriaNome: macro.macro_categoria,
        unidadeMacro: macro.unidade,
        unidadeRendimentoPreparo: custo.unidadeRendimentoPreparo,
        unidadeDivergente:
          normalizarUnidade(macro.unidade) !== normalizarUnidade(custo.unidadeRendimentoPreparo),
        peso: item.peso_item,
        origemPeso: item.origem_peso,
        somaPesosGrupo,
        capacidadeTeto: macro.capacidade_teto,
        porcaoCalculada: item.porcao_calculada,
        porcaoMaximaIndividual: item.porcao_maxima_individual,
        porcaoFinal: item.porcao_final,
        limitadaPorHardCap: item.porcao_limitada_por_cap,
        volumeNecessarioTotal: item.volume_necessario_total,
        quantidadeParaCusto: item.quantidade_para_custo,
        rendimento: custo.rendimento,
        custoTotalPreparo: custo.custoTotalPreparo,
        custoPorUnidadeRendimento,
        custoTotalItem,
      });
    }
  }

  return {
    linhas,
    itensExcluidos: [...itensExcluidos, ...semCusto],
    resultadoFinal,
  };
}
