"use server";

import { redirect } from "next/navigation";
import { calcularPrecificacaoParaPreparos } from "@/lib/precificacao-evento";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EntradaPrecificacao = {
  preparoIds: number[];
  numConvidados: number;
  regiaoMetropolitanaCuritiba: boolean;
  quantidadeGarcom?: number;
  valorGarcom?: number;
};

/**
 * Chamada direto do client (recálculo com debounce, ver
 * formulario-evento-churrasco.tsx) — não é uma form action de submit.
 * Usada tanto no Criar Evento quanto na página do Simulador de Cardápio.
 */
export async function calcularPrecificacaoAction(entrada: EntradaPrecificacao) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return calcularPrecificacaoParaPreparos(entrada.preparoIds, {
    numConvidados: entrada.numConvidados,
    regiaoMetropolitanaCuritiba: entrada.regiaoMetropolitanaCuritiba,
    quantidadeGarcom: entrada.quantidadeGarcom,
    valorGarcom: entrada.valorGarcom,
  });
}
