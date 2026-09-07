"use server";

import { redirect } from "next/navigation";
import {
  criarEvento,
  atualizarEvento,
  type DadosEvento,
  type StatusEvento,
} from "@/lib/eventos";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import {
  calcularTaxaDeslocamento,
  sugerirQuantidadeCopeira,
  sugerirQuantidadeAssador,
  VALOR_COPEIRA,
  VALOR_ASSADOR,
} from "@/lib/precificacao-constantes";

function paraTexto(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : Number(texto);
}

function paraListaTexto(formData: FormData, nome: string): string | null {
  const selecionados = formData.getAll(nome).map(String).filter(Boolean);
  return selecionados.length === 0 ? null : selecionados.join(", ");
}

function extrairDados(formData: FormData): DadosEvento {
  // Num_Convidados pra fins de precificação (docs/DECISOES.md,
  // "Precificação por Cardápio Selecionado...") = todo mundo que come,
  // adultos + crianças de qualquer faixa.
  const numConvidados =
    (paraNumero(formData.get("qtdAdultos")) ?? 0) +
    (paraNumero(formData.get("qtdCriancasAte5")) ?? 0) +
    (paraNumero(formData.get("qtdCriancas5a10")) ?? 0);

  const regiaoMetropolitanaCuritiba = formData.get("regiaoMetropolitanaCuritiba") === "true";
  const quantidadeCopeiraSugerida = sugerirQuantidadeCopeira(numConvidados);
  const quantidadeAssadorSugerida = sugerirQuantidadeAssador(numConvidados);

  return {
    empresaId: Number(formData.get("empresaId")),
    cliente: String(formData.get("cliente") ?? "").trim(),
    contato: paraTexto(formData.get("contato")),
    telefone: paraTexto(formData.get("telefone")),
    enderecoEvento: paraTexto(formData.get("enderecoEvento")),
    dataEvento: String(formData.get("dataEvento") ?? ""),
    tipoEvento: paraTexto(formData.get("tipoEvento")),
    horaChegadaEquipe: paraTexto(formData.get("horaChegadaEquipe")),
    horaAperitivo: paraTexto(formData.get("horaAperitivo")),
    horaAlmoco: paraTexto(formData.get("horaAlmoco")),
    horaEncerramento: paraTexto(formData.get("horaEncerramento")),
    qtdAdultos: paraNumero(formData.get("qtdAdultos")),
    qtdCriancasAte5: paraNumero(formData.get("qtdCriancasAte5")),
    qtdCriancas5a10: paraNumero(formData.get("qtdCriancas5a10")),
    qtdFornecedores: paraNumero(formData.get("qtdFornecedores")),
    cardapioEntrada: paraListaTexto(formData, "cardapioEntrada"),
    cardapioCarnes: paraListaTexto(formData, "cardapioCarnes"),
    cardapioAcompanhamentos: paraListaTexto(formData, "cardapioAcompanhamentos"),
    cardapioSaladas: paraListaTexto(formData, "cardapioSaladas"),
    cardapioBebidas: paraListaTexto(formData, "cardapioBebidas"),
    cardapioSobremesa: paraListaTexto(formData, "cardapioSobremesa"),
    precoPessoa: paraNumero(formData.get("precoPessoa")),
    precoCriancaMeia: paraNumero(formData.get("precoCriancaMeia")),
    valorGarcom: paraNumero(formData.get("valorGarcom")),
    // Taxa_Deslocamento nunca é digitada — vem só do toggle de região
    // metropolitana (docs/DECISOES.md).
    taxaDeslocamento: calcularTaxaDeslocamento(regiaoMetropolitanaCuritiba),
    qtdGarcons: paraNumero(formData.get("qtdGarcons")),
    // qtd_churrasqueiros ("Assador" na doc) deixou de ser digitado — é
    // sempre a sugestão calculada (CETO(Num_Convidados/100)).
    qtdChurrasqueiros: quantidadeAssadorSugerida,
    qtdCopeiras: paraNumero(formData.get("qtdCopeiras")),
    regiaoMetropolitanaCuritiba,
    quantidadeCopeiraSugerida,
    custoCopeiraTotal: quantidadeCopeiraSugerida * VALOR_COPEIRA,
    custoAssadorTotal: quantidadeAssadorSugerida * VALOR_ASSADOR,
    prazoPagamento: paraTexto(formData.get("prazoPagamento")),
    chavePix: paraTexto(formData.get("chavePix")),
    caminhoContrato: paraTexto(formData.get("caminhoContrato")),
    status: String(formData.get("status")) as StatusEvento,
    valor: paraNumero(formData.get("valor")),
    observacoes: paraTexto(formData.get("observacoes")),
  };
}

export async function criarEventoAction(formData: FormData) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const dados = extrairDados(formData);
  if (!dados.cliente || !dados.dataEvento || !dados.empresaId) {
    throw new Error("Preencha empresa, cliente e data do evento.");
  }
  const id = await criarEvento(dados);
  redirect(`/agenda/${id}`);
}

export async function atualizarEventoAction(id: number, formData: FormData) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const dados = extrairDados(formData);
  if (!dados.cliente || !dados.dataEvento || !dados.empresaId) {
    throw new Error("Preencha empresa, cliente e data do evento.");
  }
  await atualizarEvento(id, dados);
  redirect(`/agenda/${id}`);
}
