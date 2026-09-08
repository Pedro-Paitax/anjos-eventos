import "server-only";
import { exigirToken } from "@/lib/nocodb";
import { resolverItensPorPreparoIds } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import {
  calcularPrecificacaoCardapio,
  type ItemCardapioPrecificacao,
  type OpcoesPrecificacao,
  type PrecificacaoResultado,
} from "@/lib/precificacao-cardapio";

export type PrecificacaoEventoErro = { erro: string; status: number };

export type PrecificacaoEventoResultado = {
  resultado: PrecificacaoResultado;
  /** Preparos selecionados que não entraram no cálculo (nome + motivo), pra avisar quem está cadastrando o evento — nunca exibido ao cliente. */
  itensExcluidos: { preparo: string; motivo: string }[];
};

/**
 * Orquestra o cálculo de precificação pra uma seleção de cardápio ad-hoc
 * (sem Orçamento persistido) — usado pelo formulário de Criar Evento
 * (Senhor Churrasco) e pela página do Simulador de Cardápio. Busca peso/
 * macro-categoria (motor de dimensionamento) e custo (motor de custo) de
 * cada preparo, depois delega a matemática pra calcularPrecificacaoCardapio
 * (núcleo puro, já testado).
 */
export async function calcularPrecificacaoParaPreparos(
  preparoIds: number[],
  opcoes: OpcoesPrecificacao
): Promise<PrecificacaoEventoResultado | PrecificacaoEventoErro> {
  if (preparoIds.length === 0) {
    return { erro: "Selecione ao menos um item do cardápio.", status: 422 };
  }
  if (!opcoes.numConvidados || opcoes.numConvidados <= 0) {
    return { erro: "Informe a quantidade de convidados.", status: 422 };
  }

  const token = exigirToken();

  const { itensResolvidos, itensExcluidos } = await resolverItensPorPreparoIds(preparoIds, token);

  const custosPorPreparoId = new Map<number, { custoTotalPreparo: number; rendimento: number }>();
  await Promise.all(
    itensResolvidos.map(async (item) => {
      const custo = await calcularCustoPreparo(item.preparoId);
      if (!("erro" in custo)) {
        custosPorPreparoId.set(item.preparoId, {
          custoTotalPreparo: custo.custo_total_preparo,
          rendimento: custo.rendimento,
        });
      }
    })
  );

  const itensParaPrecificacao: ItemCardapioPrecificacao[] = [];
  const semCusto: { preparo: string; motivo: string }[] = [];
  for (const item of itensResolvidos) {
    const custo = custosPorPreparoId.get(item.preparoId);
    if (!custo) {
      semCusto.push({ preparo: item.preparoNome, motivo: "Falha ao calcular o custo do preparo." });
      continue;
    }
    itensParaPrecificacao.push({
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
    });
  }

  if (itensParaPrecificacao.length === 0) {
    return {
      erro:
        "Nenhum item do cardápio selecionado pôde ser calculado (peso/macro-categoria ou custo não configurados).",
      status: 422,
    };
  }

  const resultado = calcularPrecificacaoCardapio(itensParaPrecificacao, opcoes);

  return { resultado, itensExcluidos: [...itensExcluidos, ...semCusto] };
}
