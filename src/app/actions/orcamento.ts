"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEmpresas } from "@/lib/empresas";
import {
  criarOrcamentoChurrasco,
  criarOrcamentoGenerico,
  aprovarEConfirmarEvento,
  recusarOrcamento,
  type DadosOperacionaisEvento,
} from "@/lib/orcamentos";
import { sugerirQuantidadeGarcom, VALOR_GARCOM_PADRAO } from "@/lib/precificacao-constantes";
import { dataEventoParaGravar } from "@/lib/data-evento";

const EMPRESA_CHURRASCO = "Buffet Senhor Churrasco";

function paraTexto(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : Number(texto);
}

async function ehEmpresaChurrasco(empresaId: number): Promise<boolean> {
  const empresas = await listarEmpresas();
  return empresas.find((e) => e.id === empresaId)?.nome === EMPRESA_CHURRASCO;
}

/** Estado devolvido aos formulários de Orçamento e de confirmação (useActionState). */
export type EstadoFormularioOrcamento = { erro?: string; valores?: Record<string, string> };

/**
 * Valores de texto do formulário, para o formulário mostrar de novo o que foi
 * digitado quando a ação devolve erro (campos com vários valores, como
 * preparoIds, ficam de fora: o próprio formulário guarda esse estado).
 */
function valoresDoFormulario(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor !== "string" || chave.startsWith("$") || chave === "preparoIds") continue;
    valores[chave] = valor;
  }
  return valores;
}

/**
 * Passo 2 da Máquina de Estados (docs/PENDENCIAS_NOTURNAS.md, "Máquina de
 * Estados Orçamento → Evento Confirmado") — "Gerar Orçamento". Cria o
 * Orçamento em status Simulação: cardápio de Preparos pra Senhor Churrasco,
 * valor negociado direto pras demais empresas.
 *
 * Devolve { erro, valores } em vez de lançar: em produção o Next oculta a
 * mensagem de erros lançados por Server Actions e a tela inteira caía, com o
 * formulário perdido (auditoria de 23/11, defeito D4).
 */
export async function criarOrcamentoAction(
  _estadoAnterior: EstadoFormularioOrcamento,
  formData: FormData
): Promise<EstadoFormularioOrcamento> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const valores = valoresDoFormulario(formData);
  const falha = (erro: string): EstadoFormularioOrcamento => ({ erro, valores });

  const empresaId = Number(formData.get("empresaId"));
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const qtdAdultos = paraNumero(formData.get("qtdAdultos")) ?? 0;
  const qtdCriancasAte5 = paraNumero(formData.get("qtdCriancasAte5")) ?? 0;
  const qtdCriancas5a10 = paraNumero(formData.get("qtdCriancas5a10")) ?? 0;

  if (!empresaId) return falha("Escolha a empresa.");
  if (!clienteNome) return falha("Informe o nome do cliente.");
  if ([qtdAdultos, qtdCriancasAte5, qtdCriancas5a10].some((n) => !Number.isFinite(n) || n < 0)) {
    return falha("Os convidados precisam ser números de 0 para cima.");
  }
  if (qtdAdultos + qtdCriancasAte5 + qtdCriancas5a10 <= 0) {
    return falha("Informe ao menos 1 convidado (adultos ou crianças).");
  }

  let orcamentoId: number;
  try {
    if (await ehEmpresaChurrasco(empresaId)) {
      const preparoIds = formData.getAll("preparoIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
      const numConvidados = qtdAdultos + qtdCriancasAte5 + qtdCriancas5a10;
      const precoPessoa = paraNumero(formData.get("precoPessoa"));
      if (precoPessoa == null || !Number.isFinite(precoPessoa) || precoPessoa < 0) {
        return falha("Informe o preço por pessoa.");
      }
      orcamentoId = await criarOrcamentoChurrasco({
        empresaId,
        clienteNome,
        qtdAdultos,
        qtdCriancasAte5,
        qtdCriancas5a10,
        preparoIds,
        precoPessoa,
        usarPrecoFixoModelo: formData.get("usarPrecoFixoModelo") === "true",
        qtdGarcons: paraNumero(formData.get("qtdGarcons")) ?? sugerirQuantidadeGarcom(numConvidados),
        valorGarcom: paraNumero(formData.get("valorGarcom")) ?? VALOR_GARCOM_PADRAO,
        regiaoMetropolitanaCuritiba: formData.get("regiaoMetropolitanaCuritiba") === "true",
      });
    } else {
      const valorNegociado = paraNumero(formData.get("valorNegociado"));
      if (valorNegociado == null || !Number.isFinite(valorNegociado) || valorNegociado <= 0) {
        return falha("Informe o valor negociado.");
      }
      orcamentoId = await criarOrcamentoGenerico({
        empresaId,
        clienteNome,
        qtdAdultos,
        qtdCriancasAte5,
        qtdCriancas5a10,
        valorNegociado,
      });
    }
  } catch (e) {
    console.error("[criarOrcamentoAction]", e);
    return falha("Não foi possível salvar o orçamento. Nada foi gravado; tente de novo.");
  }

  redirect(`/orcamentos/${orcamentoId}`);
}

function extrairDadosOperacionais(formData: FormData): DadosOperacionaisEvento {
  return {
    contato: paraTexto(formData.get("contato")),
    telefone: paraTexto(formData.get("telefone")),
    enderecoEvento: paraTexto(formData.get("enderecoEvento")),
    dataEvento: String(formData.get("dataEvento") ?? ""),
    tipoEvento: paraTexto(formData.get("tipoEvento")),
    horaChegadaEquipe: paraTexto(formData.get("horaChegadaEquipe")),
    horaAperitivo: paraTexto(formData.get("horaAperitivo")),
    horaAlmoco: paraTexto(formData.get("horaAlmoco")),
    horaEncerramento: paraTexto(formData.get("horaEncerramento")),
    qtdFornecedores: paraNumero(formData.get("qtdFornecedores")),
    // Só usado pro caminho genérico — pro Senhor Churrasco, qtdGarcons vem
    // do Orçamento (definido no Passo 2, ver montarValoresEvento).
    qtdGarcons: paraNumero(formData.get("qtdGarcons")),
    qtdCopeiras: paraNumero(formData.get("qtdCopeiras")),
    // Só usado pro caminho genérico (valor final editável, default = valor
    // negociado no Orçamento) — pro Senhor Churrasco, o valor vem inteiro
    // do Orçamento, nunca deste campo.
    valor: paraNumero(formData.get("valor")),
    prazoPagamento: paraTexto(formData.get("prazoPagamento")),
    chavePix: paraTexto(formData.get("chavePix")),
    caminhoContrato: paraTexto(formData.get("caminhoContrato")),
    observacoes: paraTexto(formData.get("observacoes")),
  };
}

/**
 * Recusar Orçamento (Simulação → Recusado). Devolve { erro } em vez de lançar:
 * em produção o Next oculta a mensagem de erros lançados por Server Actions.
 */
export async function recusarOrcamentoAction(orcamentoId: number): Promise<{ erro: string | null }> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const resultado = await recusarOrcamento(orcamentoId);
  if (resultado) return { erro: resultado.erro };

  revalidatePath(`/orcamentos/${orcamentoId}`);
  return { erro: null };
}

/**
 * Passo 3 — "Aprovar e Confirmar Evento": a Ação de Conversão em si.
 * Devolve { erro, valores } em vez de lançar (D4, ver criarOrcamentoAction).
 */
export async function aprovarConfirmarEventoAction(
  orcamentoId: number,
  _estadoAnterior: EstadoFormularioOrcamento,
  formData: FormData
): Promise<EstadoFormularioOrcamento> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const valores = valoresDoFormulario(formData);
  const dadosOperacionais = extrairDadosOperacionais(formData);
  if (!dadosOperacionais.dataEvento) {
    return { erro: "Preencha a data e a hora do evento.", valores };
  }
  if (!dataEventoParaGravar(dadosOperacionais.dataEvento)) {
    return { erro: "Data e hora do evento inválidas. Use o seletor de data do campo.", valores };
  }

  let eventoId: number;
  try {
    const resultado = await aprovarEConfirmarEvento(orcamentoId, dadosOperacionais);
    if (typeof resultado !== "number") return { erro: resultado.erro, valores };
    eventoId = resultado;
  } catch (e) {
    console.error("[aprovarConfirmarEventoAction]", e);
    return { erro: "Não foi possível confirmar o evento. Nada foi gravado; tente de novo.", valores };
  }

  redirect(`/agenda/${eventoId}`);
}
