import "server-only";
import { exigirToken } from "@/lib/nocodb";
import { dataSource } from "@/lib/data-source";
import { resolverItensPorPreparoIds } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import {
  calcularPrecificacaoCardapio,
  calcularPrecificacaoParaEvento,
  type DistribuicaoConvidados,
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
 * Resolve peso/macro-categoria (motor de dimensionamento) e custo (motor de
 * custo) de uma seleção de preparo_id ad-hoc — parte 100% compartilhada
 * entre calcularPrecificacaoParaPreparos (Simulador de Cardápio) e
 * calcularPrecificacaoEventoParaPreparos (Criar Evento). Nenhuma das duas
 * altera esta resolução; só divergem na fórmula final aplicada depois.
 */
async function resolverItensParaPrecificacao(
  preparoIds: number[],
  token: string
): Promise<
  | { itensParaPrecificacao: ItemCardapioPrecificacao[]; itensExcluidos: { preparo: string; motivo: string }[] }
  | PrecificacaoEventoErro
> {
  const { itensResolvidos, itensExcluidos } = await resolverItensPorPreparoIds(preparoIds, token);

  const custosPorPreparoId = new Map<number, { custoTotalPreparo: number; rendimento: number }>();
  await Promise.all(
    itensResolvidos.map(async (item) => {
      // resolverItensPorPreparoIds já buscou este Preparo — repassa pronto
      // pra calcularCustoPreparo em vez de buscar o mesmo registro de novo
      // (docs/DECISOES.md, "Política de Falha do Motor de Cálculo").
      const custo = await calcularCustoPreparo(item.preparoId, {
        "Nome Do Preparo": item.preparoNome,
        Rendimento: item.rendimentoPreparo,
        "UOM Rendimento": item.unidadeRendimentoPreparo,
      });
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
      unidadeRendimentoPreparo: item.unidadeRendimentoPreparo,
      pesoMedioUnidadeG: item.pesoMedioUnidadeG,
    });
  }

  if (itensParaPrecificacao.length === 0) {
    return {
      erro:
        "Nenhum item do cardápio selecionado pôde ser calculado (peso/macro-categoria ou custo não configurados).",
      status: 422,
    };
  }

  return { itensParaPrecificacao, itensExcluidos: [...itensExcluidos, ...semCusto] };
}

/**
 * Orquestra o cálculo de precificação pra uma seleção de cardápio ad-hoc
 * (sem Orçamento persistido) — usado EXCLUSIVAMENTE pela página do
 * Simulador de Cardápio (número de convidados total, sem faixa etária).
 * Comportamento e assinatura inalterados desde antes da extração do
 * helper acima — só delega pra calcularPrecificacaoCardapio (núcleo puro,
 * já testado), igual sempre fez.
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

  const token = dataSource() === "oracle" ? "" : exigirToken();
  const resolvido = await resolverItensParaPrecificacao(preparoIds, token);
  if ("erro" in resolvido) return resolvido;

  const resultado = calcularPrecificacaoCardapio(resolvido.itensParaPrecificacao, opcoes);

  return { resultado, itensExcluidos: resolvido.itensExcluidos };
}

/**
 * Variante EXCLUSIVA do fluxo de Criar Evento (Senhor Churrasco) — mesma
 * resolução de itens que calcularPrecificacaoParaPreparos, mas delega pra
 * calcularPrecificacaoParaEvento (aplica meia-entrada de criança no Valor
 * Sugerido Total). Ver docs/DECISOES.md, decisão do Pedro de 2026-09-08.
 */
export async function calcularPrecificacaoEventoParaPreparos(
  preparoIds: number[],
  opcoes: OpcoesPrecificacao,
  distribuicao: DistribuicaoConvidados
): Promise<PrecificacaoEventoResultado | PrecificacaoEventoErro> {
  if (preparoIds.length === 0) {
    return { erro: "Selecione ao menos um item do cardápio.", status: 422 };
  }
  if (!opcoes.numConvidados || opcoes.numConvidados <= 0) {
    return { erro: "Informe a quantidade de convidados.", status: 422 };
  }

  const token = dataSource() === "oracle" ? "" : exigirToken();
  const resolvido = await resolverItensParaPrecificacao(preparoIds, token);
  if ("erro" in resolvido) return resolvido;

  const resultado = calcularPrecificacaoParaEvento(resolvido.itensParaPrecificacao, opcoes, distribuicao);

  return { resultado, itensExcluidos: resolvido.itensExcluidos };
}
