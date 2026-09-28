"use server";

import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEmpresas } from "@/lib/empresas";
import {
  criarOrcamentoChurrasco,
  criarOrcamentoGenerico,
  aprovarEConfirmarEvento,
  type DadosOperacionaisEvento,
} from "@/lib/orcamentos";
import { sugerirQuantidadeGarcom, VALOR_GARCOM_PADRAO } from "@/lib/precificacao-constantes";

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

/**
 * Passo 2 da Máquina de Estados (docs/PENDENCIAS_NOTURNAS.md, "Máquina de
 * Estados Orçamento → Evento Confirmado") — "Gerar Orçamento". Cria o
 * Orçamento em status Simulação: cardápio de Preparos pra Senhor Churrasco,
 * valor negociado direto pras demais empresas.
 */
export async function criarOrcamentoAction(formData: FormData) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const empresaId = Number(formData.get("empresaId"));
  const clienteNome = String(formData.get("clienteNome") ?? "").trim();
  const qtdAdultos = paraNumero(formData.get("qtdAdultos")) ?? 0;
  const qtdCriancasAte5 = paraNumero(formData.get("qtdCriancasAte5")) ?? 0;
  const qtdCriancas5a10 = paraNumero(formData.get("qtdCriancas5a10")) ?? 0;

  if (!empresaId || !clienteNome) {
    throw new Error("Preencha empresa e cliente.");
  }
  if (qtdAdultos + qtdCriancasAte5 + qtdCriancas5a10 <= 0) {
    throw new Error("Informe ao menos 1 convidado.");
  }

  let orcamentoId: number;
  if (await ehEmpresaChurrasco(empresaId)) {
    const preparoIds = formData.getAll("preparoIds").map(Number).filter((n) => Number.isInteger(n) && n > 0);
    const numConvidados = qtdAdultos + qtdCriancasAte5 + qtdCriancas5a10;
    const precoPessoa = paraNumero(formData.get("precoPessoa"));
    if (precoPessoa == null || precoPessoa < 0) {
      throw new Error("Informe o preço por pessoa.");
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
    if (valorNegociado == null || valorNegociado <= 0) {
      throw new Error("Informe o valor negociado.");
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
 * Passo 3 — "Aprovar e Confirmar Evento": a Ação de Conversão em si.
 */
export async function aprovarConfirmarEventoAction(orcamentoId: number, formData: FormData) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const dadosOperacionais = extrairDadosOperacionais(formData);
  if (!dadosOperacionais.dataEvento) {
    throw new Error("Preencha a data do evento.");
  }

  const resultado = await aprovarEConfirmarEvento(orcamentoId, dadosOperacionais);
  if (typeof resultado !== "number") {
    throw new Error(resultado.erro);
  }

  redirect(`/agenda/${resultado}`);
}
