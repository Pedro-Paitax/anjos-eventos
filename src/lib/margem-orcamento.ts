import "server-only";
import { exigirToken, nocodbGet } from "@/lib/nocodb";
import { calcularDimensionamentoOrcamento } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import { calcularPrecificacaoParaPreparos } from "@/lib/precificacao-evento";
import { dataSource } from "@/lib/data-source";

// IDs de tabela/campo do NocoDB (base Senhor_Churrasco_DB) — confirmados
// via /api/v2/meta ao criar o schema (docs/DECISOES.md, seção
// "Arquitetura Financeira do Orçamento").
const TABELA_ORCAMENTOS = "mpobqls8ibt3ay3";
const TABELA_ITENS_ADICIONAIS = "m8hw626eihfsnzs";
const CAMPO_LINK_ITENS_ADICIONAIS = "c4j5xet2j10a9y1"; // Orcamentos.Orcamento_Itens_Adicionais

type OrcamentoRegistro = {
  Id: number;
  Num_Convidados: number | null;
  Valor_Base_Por_Pessoa: number | null;
  Desconto_Tipo: string | null;
  Desconto_Valor: number | null;
};

type ItemAdicionalLinkRegistro = { Id: number };
type ItemAdicionalRegistro = {
  Id: number;
  Descricao: string | null;
  Valor: number | null;
};

export type MargemResultado = {
  orcamento_id: number;
  receita_projetada: number;
  custo_projetado: number;
  /**
   * Rateio operacional (assador + copeira + consumíveis) já embutido na
   * receita pelo preço por pessoa dinâmico — descontado aqui pra margem não
   * ficar inflada. 0 no caminho legado NocoDB (Valor_Base_Por_Pessoa manual,
   * sem rateio na receita). Ver docs/DECISOES.md, "Rateio Operacional".
   */
  custo_operacional_total: number;
  /** Aviso fixo de escopo: este número NÃO é o lucro final do evento. */
  escopo: string;
  margem_projetada: number;
  /** Só caminho Oracle: preço congelado vs. tabela de hoje. null no legado NocoDB. */
  auditoria_tabela_atual: AuditoriaTabelaAtual | null;
  detalhe: {
    valor_base: number;
    itens_adicionais: number;
    desconto_aplicado: number;
  };
  avisos: string[];
};

export type AuditoriaTabelaAtual = {
  preco_congelado_por_pessoa: number;
  preco_sugerido_hoje_por_pessoa: number;
  /** sugerido_hoje − congelado: positivo = contrato abaixo da tabela atual. */
  defasagem_por_pessoa: number;
};

/** Compara o preço congelado no Orçamento com o que a tabela de preço sugere hoje (informativo, nunca entra na receita). */
export function montarAuditoriaTabelaAtual(precoCongelado: number, precoSugeridoHoje: number): AuditoriaTabelaAtual {
  return {
    preco_congelado_por_pessoa: precoCongelado,
    preco_sugerido_hoje_por_pessoa: precoSugeridoHoje,
    defasagem_por_pessoa: arredondar(precoSugeridoHoje - precoCongelado),
  };
}

const ESCOPO_MARGEM_PROJETADA =
  "Margem sobre cardápio + equipe de cozinha (assador/copeira) + consumíveis. Exclui garçom e taxa de deslocamento. NÃO é a margem final do evento (Margem Real, ainda não implementada).";

export type MargemErro ={ erro: string; status: number };

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

/**
 * Desconto_Tipo "Percentual" incide sobre o valor recebido em `valorBase`.
 * Decisão fechada (docs/DECISOES.md, "Incidência de desconto sobre o
 * orçamento"): a regra vigente é aplicar o desconto sobre o total já somado
 * com itens adicionais — é o que calcularReceitaOracle faz hoje.
 * calcularReceitaNocodb (caminho legado, em descontinuação) ainda passa só
 * o valor base sem itens adicionais — divergência conhecida do caminho
 * legado, não corrigida aqui.
 */
/** Margem Projetada = Receita − Custo do cardápio − Custo operacional (rateio embutido na receita). */
export function calcularMargem(
  receitaProjetada: number,
  custoProjetado: number,
  custoOperacionalTotal: number
): number {
  return arredondar(receitaProjetada - custoProjetado - custoOperacionalTotal);
}

function calcularDescontoAplicado(
  valorBase: number,
  descontoTipo: string | null,
  descontoValor: number | null
): number {
  if (!descontoTipo || descontoTipo === "Nenhum" || !descontoValor) return 0;
  if (descontoTipo === "Valor Fixo") return descontoValor;
  if (descontoTipo === "Percentual") return arredondar(valorBase * (descontoValor / 100));
  return 0;
}

type ReceitaProjetada = {
  numConvidados: number;
  valorBase: number;
  totalItensAdicionais: number;
  descontoAplicado: number;
  receitaProjetada: number;
  custoOperacionalTotal: number;
  auditoriaTabelaAtual: AuditoriaTabelaAtual | null;
};

async function calcularReceitaNocodb(orcamentoId: number): Promise<ReceitaProjetada | MargemErro> {
  const token = exigirToken();

  const orcamento = await nocodbGet<OrcamentoRegistro>(
    `/tables/${TABELA_ORCAMENTOS}/records/${orcamentoId}`,
    token
  );
  if (!orcamento) {
    return { erro: "Orçamento não encontrado.", status: 404 };
  }

  const numConvidados = orcamento.Num_Convidados;
  const valorBasePorPessoa = orcamento.Valor_Base_Por_Pessoa;
  if (!numConvidados || numConvidados <= 0) {
    return { erro: "Orçamento está sem Num_Convidados válido cadastrado.", status: 422 };
  }
  if (valorBasePorPessoa == null) {
    return { erro: "Orçamento está sem Valor_Base_Por_Pessoa cadastrado.", status: 422 };
  }

  const itensAdicionaisLink = await nocodbGet<{ list: ItemAdicionalLinkRegistro[] }>(
    `/tables/${TABELA_ORCAMENTOS}/links/${CAMPO_LINK_ITENS_ADICIONAIS}/records/${orcamentoId}?limit=1000`,
    token
  );
  const itensAdicionais = await Promise.all(
    (itensAdicionaisLink?.list ?? []).map((item) =>
      nocodbGet<ItemAdicionalRegistro>(`/tables/${TABELA_ITENS_ADICIONAIS}/records/${item.Id}`, token)
    )
  );
  const totalItensAdicionais = arredondar(
    itensAdicionais.reduce((soma, item) => soma + (item?.Valor ?? 0), 0)
  );

  const valorBase = arredondar(valorBasePorPessoa * numConvidados);
  const descontoAplicado = calcularDescontoAplicado(
    valorBase,
    orcamento.Desconto_Tipo,
    orcamento.Desconto_Valor
  );
  const receitaProjetada = arredondar(valorBase + totalItensAdicionais - descontoAplicado);

  return { numConvidados, valorBase, totalItensAdicionais, descontoAplicado, receitaProjetada, custoOperacionalTotal: 0, auditoriaTabelaAtual: null };
}

/**
 * DATA_SOURCE=oracle: aplica a Lacuna 1 já decidida (docs/DECISOES.md,
 * "Arquitetura Financeira do Orçamento" + docs/schema-fisico-detalhado.md).
 * Valor_Base_Por_Pessoa é IGNORADO (dado morto do modelo antigo): o valor
 * sugerido por pessoa é calculado em tempo real pela precificação por
 * cardápio, multiplicado por Num_Convidados, somado aos itens adicionais,
 * e o desconto incide sobre esse TOTAL, nunca sobre o valor por pessoa.
 * Taxa de deslocamento e garçom ficam de fora (nunca entram no valor por
 * pessoa e o Orçamento não guarda região/quantidade de garçom).
 */
async function calcularReceitaOracle(orcamentoId: number): Promise<ReceitaProjetada | MargemErro> {
  let numConvidados: number;
  let preparoIds: number[];
  let totalItensAdicionais: number;
  let descontoTipo: string | null;
  let descontoValor: number | null;
  let precoCongelado: number | null;
  try {
    const { db } = await import("@/db/client");
    const { eq } = await import("drizzle-orm");
    const { orcamentos, itensOrcamento } = await import("@/db/schema/orcamentos");
    const { orcamentoItensAdicionais } = await import("@/db/schema/catalogo-complementar");

    const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId));
    if (!orcamento) return { erro: "Orçamento não encontrado.", status: 404 };
    numConvidados = orcamento.numConvidados;
    descontoTipo = orcamento.descontoTipo;
    descontoValor = orcamento.descontoValor == null ? null : Number(orcamento.descontoValor);
    precoCongelado = orcamento.precoPessoa == null ? null : Number(orcamento.precoPessoa);

    const itens = await db
      .select({ preparoId: itensOrcamento.preparoId })
      .from(itensOrcamento)
      .where(eq(itensOrcamento.orcamentoId, orcamentoId));
    preparoIds = [...new Set(itens.map((i) => i.preparoId))];

    const adicionais = await db
      .select({ valor: orcamentoItensAdicionais.valor })
      .from(orcamentoItensAdicionais)
      .where(eq(orcamentoItensAdicionais.orcamentoId, orcamentoId));
    totalItensAdicionais = arredondar(adicionais.reduce((soma, i) => soma + Number(i.valor), 0));
  } catch (erro) {
    return { erro: `Falha ao consultar Postgres: ${(erro as Error).message}`, status: 502 };
  }

  if (!numConvidados || numConvidados <= 0) {
    return { erro: "Orçamento está sem Num_Convidados válido cadastrado.", status: 422 };
  }

  // Receita = preço CONGELADO no Orçamento (contrato real), nunca o dinâmico
  // recalculado — ver docs/DECISOES.md, "Margem Projetada: preço congelado".
  if (precoCongelado == null) {
    return { erro: "Orçamento sem preco_pessoa congelado — não há receita contratada pra calcular a margem.", status: 422 };
  }

  // Ainda chama a precificação dinâmica só pra (a) custo operacional (depende
  // só de Num_Convidados) e (b) o bloco informativo de auditoria.
  const precificacao = await calcularPrecificacaoParaPreparos(preparoIds, {
    numConvidados,
    regiaoMetropolitanaCuritiba: false,
  });
  if ("erro" in precificacao) return precificacao;

  const valorBase = arredondar(precoCongelado * numConvidados);
  const totalAntesDoDesconto = arredondar(valorBase + totalItensAdicionais);
  const descontoAplicado = calcularDescontoAplicado(totalAntesDoDesconto, descontoTipo, descontoValor);
  const receitaProjetada = arredondar(totalAntesDoDesconto - descontoAplicado);

  return {
    numConvidados,
    valorBase,
    totalItensAdicionais,
    descontoAplicado,
    receitaProjetada,
    custoOperacionalTotal: precificacao.resultado.custo_operacional_total,
    auditoriaTabelaAtual: montarAuditoriaTabelaAtual(
      precoCongelado,
      precificacao.resultado.valor_sugerido_por_pessoa
    ),
  };
}

export async function calcularMargemProjetada(
  orcamentoId: number
): Promise<MargemResultado | MargemErro> {
  const receita =
    dataSource() === "oracle"
      ? await calcularReceitaOracle(orcamentoId)
      : await calcularReceitaNocodb(orcamentoId);
  if ("erro" in receita) return receita;
  const { valorBase, totalItensAdicionais, descontoAplicado, receitaProjetada, custoOperacionalTotal, auditoriaTabelaAtual } = receita;

  const dimensionamento = await calcularDimensionamentoOrcamento(orcamentoId);
  if ("erro" in dimensionamento) {
    return dimensionamento;
  }

  const avisos: string[] = dimensionamento.itens_excluidos.map(
    (item) => `${item.preparo}: excluído do custo projetado (${item.motivo})`
  );

  let custoProjetado = 0;
  for (const macro of dimensionamento.macro_categorias) {
    for (const item of macro.itens) {
      const custoPreparo = await calcularCustoPreparo(item.preparo_id);
      if ("erro" in custoPreparo) {
        avisos.push(`${item.preparo}: falha ao calcular custo (${custoPreparo.erro})`);
        continue;
      }
      const custoPorUnidade = custoPreparo.custo_total_preparo / custoPreparo.rendimento;
      custoProjetado = arredondar(custoProjetado + custoPorUnidade * item.quantidade_para_custo);
    }
  }
  custoProjetado = arredondar(custoProjetado);

  const margemProjetada = calcularMargem(receitaProjetada, custoProjetado, custoOperacionalTotal);

  return {
    orcamento_id: orcamentoId,
    receita_projetada: receitaProjetada,
    custo_projetado: custoProjetado,
    custo_operacional_total: custoOperacionalTotal,
    escopo: ESCOPO_MARGEM_PROJETADA,
    margem_projetada: margemProjetada,
    auditoria_tabela_atual: auditoriaTabelaAtual,
    detalhe: {
      valor_base: valorBase,
      itens_adicionais: totalItensAdicionais,
      desconto_aplicado: descontoAplicado,
    },
    avisos,
  };
}
