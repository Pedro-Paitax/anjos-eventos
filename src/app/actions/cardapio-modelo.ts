"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  atualizarCardapioModelo,
  criarCardapioModelo,
  excluirCardapioModelo,
  obterCardapioModeloComItens,
  type DadosCardapioModelo,
} from "@/lib/cardapios-modelo";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EstadoFormularioCardapioModelo = { erro?: string };

function paraTexto(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function extrairDados(formData: FormData): DadosCardapioModelo | { erro: string } {
  const nome = paraTexto(formData.get("nome"));
  if (!nome) return { erro: "Preencha o nome do cardápio." };

  return { nome, descricao: paraTexto(formData.get("descricao")) };
}

function extrairPreparoIds(formData: FormData): number[] {
  return formData
    .getAll("preparoId")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export async function criarCardapioModeloAction(
  _estadoAnterior: EstadoFormularioCardapioModelo,
  formData: FormData
): Promise<EstadoFormularioCardapioModelo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDados(formData);
  if ("erro" in dados) return dados;

  const preparoIds = extrairPreparoIds(formData);
  if (preparoIds.length === 0) {
    return { erro: "Selecione ao menos um item pro cardápio." };
  }

  let novoId: number;
  try {
    novoId = await criarCardapioModelo(dados, preparoIds);
  } catch (erro) {
    return { erro: `Falha ao salvar cardápio: ${(erro as Error).message}` };
  }

  revalidatePath("/cardapios-modelo");
  redirect(`/cardapios-modelo/${novoId}`);
}

export async function atualizarCardapioModeloAction(
  id: number,
  _estadoAnterior: EstadoFormularioCardapioModelo,
  formData: FormData
): Promise<EstadoFormularioCardapioModelo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDados(formData);
  if ("erro" in dados) return dados;

  const preparoIds = extrairPreparoIds(formData);
  if (preparoIds.length === 0) {
    return { erro: "Selecione ao menos um item pro cardápio." };
  }

  try {
    await atualizarCardapioModelo(id, dados, preparoIds);
  } catch (erro) {
    return { erro: `Falha ao salvar cardápio: ${(erro as Error).message}` };
  }

  revalidatePath("/cardapios-modelo");
  revalidatePath(`/cardapios-modelo/${id}`);
  redirect(`/cardapios-modelo/${id}`);
}

export async function excluirCardapioModeloAction(
  id: number
): Promise<{ erro: string } | void> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  await excluirCardapioModelo(id);
  revalidatePath("/cardapios-modelo");
}

/**
 * Chamada direto do client no Criar Evento, ao escolher "Começar de um
 * Cardápio Pré-Montado" — só lê os itens pra pré-popular o seletor, não
 * cria nenhum vínculo permanente entre o evento e o cardápio modelo.
 */
export async function obterItensCardapioModeloAction(
  id: number
): Promise<{ preparoIds: number[] } | { erro: string }> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const cardapio = await obterCardapioModeloComItens(id);
  if (!cardapio) return { erro: "Cardápio pré-montado não encontrado." };

  return { preparoIds: cardapio.itens.map((item) => item.preparoId) };
}
