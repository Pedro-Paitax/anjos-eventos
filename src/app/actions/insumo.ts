"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { atualizarInsumo, obterInsumo, type DadosInsumo } from "@/lib/insumos";
import { atualizarOrigemInsumo } from "@/lib/precos-insumo";
import { CANAIS_COMPRA, ehUm } from "@/lib/precos-opcoes";
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

  // Campos da migração 0011: só vêm no formulário quando o histórico de preços está ativo no banco.
  const temOrigem = formData.has("canal");
  const fornecedorBruto = String(formData.get("fornecedorPrincipalId") ?? "");
  const fornecedorPrincipalId = fornecedorBruto === "" ? null : Number(fornecedorBruto);
  const canalBruto = formData.get("canal");
  const canal = ehUm(CANAIS_COMPRA, canalBruto) ? canalBruto : null;
  if (temOrigem && fornecedorPrincipalId !== null && !Number.isInteger(fornecedorPrincipalId)) {
    return { erro: "Fornecedor principal inválido.", valores: valoresEnviados(formData) };
  }

  try {
    const anterior = temOrigem ? await obterInsumo(id) : null;
    await atualizarInsumo(id, dados);
    if (temOrigem) {
      // Preço digitado aqui = fonte "manual", atualizado agora. Comparação em centavos (numeric(10,4) vs. campo de 2 casas).
      const precoMudou = Math.round((anterior?.preco ?? -1) * 100) !== Math.round(dados.preco * 100);
      await atualizarOrigemInsumo(id, { fornecedorPrincipalId, canal }, precoMudou);
    }
  } catch (erro) {
    return {
      erro: `Falha ao salvar insumo: ${(erro as Error).message}`,
      valores: valoresEnviados(formData),
    };
  }

  revalidatePath("/insumos");
  redirect("/insumos");
}
