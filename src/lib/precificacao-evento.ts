import "server-only";
import { exigirToken } from "@/lib/nocodb";
import { dataSource } from "@/lib/data-source";
import { resolverItensPorPreparoIds } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo, type MotivoFalhaRede } from "@/lib/custo-preparo";
import {
  calcularPrecificacaoCardapio,
  calcularPrecificacaoParaEvento,
  type DistribuicaoConvidados,
  type ItemCardapioPrecificacao,
  type OpcoesPrecificacao,
  type PrecificacaoResultado,
} from "@/lib/precificacao-cardapio";

export type PrecificacaoEventoErro = { erro: string; status: number };

/**
 * Payload de fail-hard exato de docs/DECISOES.md, "Política de Falha do
 * Motor de Cálculo": timeout/erro de rede em QUALQUER item do cardápio
 * derruba o cálculo inteiro, nunca vira exclusão silenciosa com total
 * parcial (diferente de "peso/subcategoria ausente" — dado faltando, que
 * continua fail-fast normal, ver PrecificacaoEventoErro/itensExcluidos).
 * Deliberadamente sem preparo_nome — o front-end já tem a lista completa
 * dos preparos selecionados (com nome) em memória, é quem cruza o ID.
 */
export type FalhaCalculoErro = {
  erro: "falha_calculo";
  mensagem: string;
  itens_com_falha: { preparo_id: number; motivo: MotivoFalhaRede }[];
  status: 503;
};

function falhaCalculo(itensComFalha: { preparo_id: number; motivo: MotivoFalhaRede }[]): FalhaCalculoErro {
  return {
    erro: "falha_calculo",
    mensagem: "Não foi possível calcular o cardápio agora. Tente novamente.",
    itens_com_falha: itensComFalha,
    status: 503,
  };
}

export type PrecificacaoEventoResultado = {
  resultado: PrecificacaoResultado;
  /** Preparos selecionados que não entraram no cálculo (nome + motivo), pra avisar quem está cadastrando o evento — nunca exibido ao cliente. Só dado faltando (peso/subcategoria/rendimento) chega aqui — falha de rede é fail-hard, ver FalhaCalculoErro. */
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
  | FalhaCalculoErro
> {
  let itensResolvidos: Awaited<ReturnType<typeof resolverItensPorPreparoIds>>["itensResolvidos"];
  let itensExcluidos: Awaited<ReturnType<typeof resolverItensPorPreparoIds>>["itensExcluidos"];
  try {
    ({ itensResolvidos, itensExcluidos } = await resolverItensPorPreparoIds(preparoIds, token));
  } catch {
    // Mesma política de fail-hard abaixo, mas na etapa de resolver
    // peso/macro-categoria (antes até de chegar no motor de custo) — sem
    // isso, uma falha de rede aqui vira uma exceção não tratada (500
    // genérico), o exato "nunca 500/503 genérico" que a política proíbe.
    // Sem como saber qual preparo_id individual falhou (Promise.all rejeita
    // no primeiro erro), reporta todos os selecionados.
    return falhaCalculo(preparoIds.map((preparoId) => ({ preparo_id: preparoId, motivo: "timeout_preparo" })));
  }

  const custosPorPreparoId = new Map<number, { custoTotalPreparo: number; rendimento: number }>();
  const itensComFalhaDeRede: { preparo_id: number; motivo: MotivoFalhaRede }[] = [];
  const semCusto: { preparo: string; motivo: string }[] = [];

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
      if ("erro" in custo) {
        if (custo.motivoFalhaRede) {
          // Timeout/erro de rede: categoria DIFERENTE de "peso/subcategoria
          // ausente" — não pode ser excluído e seguir com total parcial.
          itensComFalhaDeRede.push({ preparo_id: item.preparoId, motivo: custo.motivoFalhaRede });
        } else {
          // Dado faltando (ex.: Rendimento não cadastrado) — mesma
          // categoria de fail-fast já documentada, continua excluindo o
          // item normalmente.
          semCusto.push({ preparo: item.preparoNome, motivo: "Falha ao calcular o custo do preparo." });
        }
        return;
      }
      custosPorPreparoId.set(item.preparoId, {
        custoTotalPreparo: custo.custo_total_preparo,
        rendimento: custo.rendimento,
      });
    })
  );

  // FAIL-HARD: qualquer item com falha de rede derruba o cálculo inteiro,
  // mesmo que outros itens tenham custo válido — nunca segue com total
  // parcial (docs/DECISOES.md).
  if (itensComFalhaDeRede.length > 0) {
    return falhaCalculo(itensComFalhaDeRede);
  }

  const itensParaPrecificacao: ItemCardapioPrecificacao[] = [];
  for (const item of itensResolvidos) {
    const custo = custosPorPreparoId.get(item.preparoId);
    if (!custo) continue; // dado faltando, já registrado em semCusto acima
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
): Promise<PrecificacaoEventoResultado | PrecificacaoEventoErro | FalhaCalculoErro> {
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
): Promise<PrecificacaoEventoResultado | PrecificacaoEventoErro | FalhaCalculoErro> {
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
