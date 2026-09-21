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
  margem_projetada: number;
  detalhe: {
    valor_base: number;
    itens_adicionais: number;
    desconto_aplicado: number;
  };
  avisos: string[];
};

export type MargemErro = { erro: string; status: number };

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

/**
 * Desconto_Tipo "Percentual" incide sobre o valor base (Valor_Base_Por_Pessoa
 * x Num_Convidados), antes de somar itens adicionais — convenção comum de
 * negócio (desconto na diária, não nas taxas extras). Não documentado
 * explicitamente em docs/BRIEFING.MD/DECISOES.md; se a intenção for outra,
 * ajustar aqui.
 */
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

  return { numConvidados, valorBase, totalItensAdicionais, descontoAplicado, receitaProjetada };
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

  const precificacao = await calcularPrecificacaoParaPreparos(preparoIds, {
    numConvidados,
    regiaoMetropolitanaCuritiba: false,
  });
  if ("erro" in precificacao) return precificacao;

  const valorBase = arredondar(precificacao.resultado.valor_sugerido_por_pessoa * numConvidados);
  const totalAntesDoDesconto = arredondar(valorBase + totalItensAdicionais);
  const descontoAplicado = calcularDescontoAplicado(totalAntesDoDesconto, descontoTipo, descontoValor);
  const receitaProjetada = arredondar(totalAntesDoDesconto - descontoAplicado);

  return { numConvidados, valorBase, totalItensAdicionais, descontoAplicado, receitaProjetada };
}

export async function calcularMargemProjetada(
  orcamentoId: number
): Promise<MargemResultado | MargemErro> {
  const receita =
    dataSource() === "oracle"
      ? await calcularReceitaOracle(orcamentoId)
      : await calcularReceitaNocodb(orcamentoId);
  if ("erro" in receita) return receita;
  const { valorBase, totalItensAdicionais, descontoAplicado, receitaProjetada } = receita;

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
      custoProjetado = arredondar(custoProjetado + custoPorUnidade * item.volume_necessario_total);
    }
  }
  custoProjetado = arredondar(custoProjetado);

  const margemProjetada = arredondar(receitaProjetada - custoProjetado);

  return {
    orcamento_id: orcamentoId,
    receita_projetada: receitaProjetada,
    custo_projetado: custoProjetado,
    margem_projetada: margemProjetada,
    detalhe: {
      valor_base: valorBase,
      itens_adicionais: totalItensAdicionais,
      desconto_aplicado: descontoAplicado,
    },
    avisos,
  };
}
