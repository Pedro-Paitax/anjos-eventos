"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  atualizarPreparo,
  criarPreparo,
  excluirPreparo,
  preparoEstaReferenciado,
  type ComposicaoLinhaForm,
  type DadosPreparoForm,
} from "@/lib/preparos";
import { criarInsumo, type DadosInsumo, type Insumo } from "@/lib/insumos";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EstadoFormularioPreparo = { erro?: string };

function paraTexto(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : Number(texto);
}

function extrairDadosPreparo(formData: FormData): DadosPreparoForm | { erro: string } {
  const nome = paraTexto(formData.get("nome"));
  const categoria = paraTexto(formData.get("categoria"));
  const rendimento = paraNumero(formData.get("rendimento"));
  const unidadeRendimento = paraTexto(formData.get("unidadeRendimento"));

  if (!nome || !categoria || rendimento == null || rendimento <= 0 || !unidadeRendimento) {
    return { erro: "Preencha nome, categoria, rendimento e unidade do rendimento." };
  }

  return {
    nome,
    categoria,
    rendimento,
    unidadeRendimento,
    restricoes: formData.getAll("restricoes").map(String),
    modoPreparo: paraTexto(formData.get("modoPreparo")),
    tempoPreparoMinutos: paraNumero(formData.get("tempoPreparoMinutos")),
    pesoAtratividade: paraNumero(formData.get("pesoAtratividade")),
    subcategoriaProteina: paraTexto(formData.get("subcategoriaProteina")),
    porcaoMaximaIndividual: paraNumero(formData.get("porcaoMaximaIndividual")),
  };
}

function extrairComposicao(formData: FormData): ComposicaoLinhaForm[] {
  const ids = formData.getAll("composicaoId").map(String);
  const insumoIds = formData.getAll("composicaoInsumoId").map(String);
  const quantidades = formData.getAll("composicaoQuantidade").map(String);

  const linhas: ComposicaoLinhaForm[] = [];
  for (let i = 0; i < insumoIds.length; i++) {
    const insumoId = Number(insumoIds[i]);
    const quantidade = Number(quantidades[i]);
    if (!insumoId || !quantidade) continue;
    linhas.push({
      id: ids[i] ? Number(ids[i]) : null,
      insumoId,
      quantidade,
    });
  }
  return linhas;
}

export async function criarPreparoAction(
  _estadoAnterior: EstadoFormularioPreparo,
  formData: FormData
): Promise<EstadoFormularioPreparo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDadosPreparo(formData);
  if ("erro" in dados) return dados;

  const composicao = extrairComposicao(formData);

  let novoId: number;
  try {
    novoId = await criarPreparo(dados, composicao);
  } catch (erro) {
    return { erro: `Falha ao salvar preparo: ${(erro as Error).message}` };
  }

  revalidatePath("/preparos");
  redirect(`/preparos/${novoId}`);
}

export async function atualizarPreparoAction(
  id: number,
  _estadoAnterior: EstadoFormularioPreparo,
  formData: FormData
): Promise<EstadoFormularioPreparo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDadosPreparo(formData);
  if ("erro" in dados) return dados;

  const composicao = extrairComposicao(formData);

  try {
    await atualizarPreparo(id, dados, composicao);
  } catch (erro) {
    return { erro: `Falha ao salvar preparo: ${(erro as Error).message}` };
  }

  revalidatePath("/preparos");
  revalidatePath(`/preparos/${id}`);
  redirect(`/preparos/${id}`);
}

export async function excluirPreparoAction(
  id: number
): Promise<{ erro: string } | void> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const referenciado = await preparoEstaReferenciado(id);
  if (referenciado) {
    return {
      erro: "Este preparo já foi usado em um orçamento/evento e não pode ser excluído.",
    };
  }

  await excluirPreparo(id);
  revalidatePath("/preparos");
}

export async function criarInsumoInlineAction(dados: DadosInsumo): Promise<Insumo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  if (!dados.nome.trim() || !dados.udm || !(dados.preco >= 0) || !(dados.fatorCorrecao > 0)) {
    throw new Error("Preencha nome, unidade, preço e fator de correção (maior que zero).");
  }

  return criarInsumo(dados);
}
