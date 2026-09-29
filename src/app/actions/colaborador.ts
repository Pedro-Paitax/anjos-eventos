"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  criarColaborador,
  atualizarColaborador,
  type DadosColaborador,
} from "@/lib/colaboradores";
import {
  FUNCOES_COLABORADOR,
  normalizarTelefoneWhatsapp,
  type FuncaoColaborador,
} from "@/lib/colaboradores-opcoes";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EstadoFormularioColaborador = { erro?: string };

function extrairDados(formData: FormData): DadosColaborador | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const funcao = String(formData.get("funcao") ?? "");
  const telefone = normalizarTelefoneWhatsapp(
    String(formData.get("telefoneWhatsapp") ?? "")
  );

  if (!nome || !FUNCOES_COLABORADOR.includes(funcao as FuncaoColaborador)) {
    return { erro: "Preencha nome e função." };
  }
  if (telefone === "invalido") {
    return {
      erro: "WhatsApp inválido: use DDI + DDD + número (ex.: 5541999999999).",
    };
  }

  return {
    nome,
    funcao: funcao as FuncaoColaborador,
    telefoneWhatsapp: telefone,
    ativo: formData.get("ativo") === "on",
  };
}

export async function criarColaboradorAction(
  _estadoAnterior: EstadoFormularioColaborador,
  formData: FormData
): Promise<EstadoFormularioColaborador> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDados(formData);
  if ("erro" in dados) return dados;

  try {
    await criarColaborador(dados);
  } catch (erro) {
    return { erro: `Falha ao salvar colaborador: ${(erro as Error).message}` };
  }

  revalidatePath("/colaboradores");
  redirect("/colaboradores");
}

export async function atualizarColaboradorAction(
  id: number,
  _estadoAnterior: EstadoFormularioColaborador,
  formData: FormData
): Promise<EstadoFormularioColaborador> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDados(formData);
  if ("erro" in dados) return dados;

  try {
    await atualizarColaborador(id, dados);
  } catch (erro) {
    return { erro: `Falha ao salvar colaborador: ${(erro as Error).message}` };
  }

  revalidatePath("/colaboradores");
  redirect("/colaboradores");
}
