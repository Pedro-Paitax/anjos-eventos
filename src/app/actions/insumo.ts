"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { atualizarInsumo, type DadosInsumo } from "@/lib/insumos";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { valoresEnviados, type ValoresFormulario } from "@/lib/formulario-valores";
import { UNIDADES_INSUMO, type UnidadeInsumo } from "@/lib/preparos-opcoes";

export type EstadoFormularioInsumo = { erro?: string; valores?: ValoresFormulario };

function extrairDadosInsumo(formData: FormData): DadosInsumo | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const udm = String(formData.get("udm") ?? "");
  const preco = Number(formData.get("preco"));
  const fatorCorrecao = Number(formData.get("fatorCorrecao"));

  if (
    !nome ||
    !UNIDADES_INSUMO.includes(udm as UnidadeInsumo) ||
    !(preco >= 0) ||
    !(fatorCorrecao > 0)
  ) {
    return {
      erro: "Preencha nome, unidade, preço e fator de correção (maior que zero).",
    };
  }

  return { nome, udm: udm as UnidadeInsumo, preco, fatorCorrecao };
}

export async function atualizarInsumoAction(
  id: number,
  _estadoAnterior: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDadosInsumo(formData);
  if ("erro" in dados) return { ...dados, valores: valoresEnviados(formData) };

  try {
    await atualizarInsumo(id, dados);
  } catch (erro) {
    return {
      erro: `Falha ao salvar insumo: ${(erro as Error).message}`,
      valores: valoresEnviados(formData),
    };
  }

  revalidatePath("/insumos");
  redirect("/insumos");
}
