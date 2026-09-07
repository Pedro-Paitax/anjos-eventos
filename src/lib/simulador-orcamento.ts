import "server-only";
import { exigirToken, nocodbGet } from "@/lib/nocodb";
import { calcularDimensionamentoOrcamento } from "@/lib/dimensionamento-cardapio";

const TABELA_ORCAMENTOS = "mpobqls8ibt3ay3";

type OrcamentoRegistro = {
  Id: number;
  Num_Convidados: number | null;
  Valor_Base_Por_Pessoa: number | null;
};

// Contrato exato de docs/DECISOES.md, seção "Contrato do Simulador de
// Orçamento (payload público)". NUNCA adicionar aqui: Peso_Atratividade,
// Origem_Dado, Custo_Unitario, Subcategoria_Proteina, ou qualquer dado de
// custo interno.
export type ItemSimulador = {
  preparo_id: number;
  preparo_nome: string;
  header_exibicao: string;
  macro_categoria: string;
  porcao_por_pessoa: number;
  unidade: "g" | "ml" | "unidade";
  porcao_limitada_por_cap: boolean;
  volume_total_necessario: number;
};

export type SimuladorResultado = {
  orcamento_id: number;
  num_convidados: number;
  valor_total_estimado: number;
  itens: ItemSimulador[];
  avisos: string[];
};

export type SimuladorErro = { erro: string; status: number };

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

function unidadeValida(valor: string): valor is ItemSimulador["unidade"] {
  return valor === "g" || valor === "ml" || valor === "unidade";
}

export async function calcularSimuladorOrcamento(
  orcamentoId: number
): Promise<SimuladorResultado | SimuladorErro> {
  const token = exigirToken();

  const orcamento = await nocodbGet<OrcamentoRegistro>(
    `/tables/${TABELA_ORCAMENTOS}/records/${orcamentoId}`,
    token
  );
  if (!orcamento) {
    return { erro: "Orçamento não encontrado.", status: 404 };
  }

  const numConvidados = orcamento.Num_Convidados;
  if (!numConvidados || numConvidados <= 0) {
    return { erro: "Orçamento está sem Num_Convidados válido cadastrado.", status: 422 };
  }

  const dimensionamento = await calcularDimensionamentoOrcamento(orcamentoId);
  if ("erro" in dimensionamento) {
    return dimensionamento;
  }

  // Itens sem peso/macro-categoria resolvidos (dimensionamento.itens_excluidos)
  // são deliberadamente omitidos aqui, sem aviso — não revelar ao público
  // detalhes internos de cadastro (Peso_Atratividade, Subcategoria_Proteina)
  // que os motivos de exclusão mencionam. Ver BRIEFING.MD seção 5, regra 3.
  const itens: ItemSimulador[] = [];
  for (const macro of dimensionamento.macro_categorias) {
    if (!unidadeValida(macro.unidade)) continue;
    for (const item of macro.itens) {
      itens.push({
        preparo_id: item.preparo_id,
        preparo_nome: item.preparo,
        header_exibicao: item.header_exibicao,
        macro_categoria: macro.macro_categoria,
        porcao_por_pessoa: item.porcao_final,
        unidade: macro.unidade,
        porcao_limitada_por_cap: item.porcao_limitada_por_cap,
        volume_total_necessario: item.volume_necessario_total,
      });
    }
  }

  const valorTotalEstimado = arredondar((orcamento.Valor_Base_Por_Pessoa ?? 0) * numConvidados);

  return {
    orcamento_id: orcamentoId,
    num_convidados: numConvidados,
    valor_total_estimado: valorTotalEstimado,
    itens,
    avisos: [],
  };
}
