"use server";

import { redirect } from "next/navigation";
import {
  calcularPrecificacaoEventoParaPreparos,
  calcularPrecificacaoParaPreparos,
} from "@/lib/precificacao-evento";
import { calcularDebugCardapio } from "@/lib/debug-calculo-cardapio";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EntradaPrecificacao = {
  preparoIds: number[];
  numConvidados: number;
  regiaoMetropolitanaCuritiba: boolean;
  quantidadeGarcom?: number;
  valorGarcom?: number;
};

/**
 * Chamada direto do client pela página do Simulador de Cardápio (recálculo
 * com debounce) — não é uma form action de submit. EXCLUSIVA do Simulador
 * isolado (número de convidados total, sem faixa etária, sem meia-entrada
 * de criança no Total) — não usar no Criar Evento, ver
 * calcularPrecificacaoEventoAction.
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

export type EntradaPrecificacaoEvento = EntradaPrecificacao & {
  distribuicaoConvidados: {
    adultos: number;
    criancasAte5: number;
    criancas5a10: number;
  };
};

/**
 * Variante EXCLUSIVA do Criar Evento (Senhor Churrasco, ver
 * formulario-evento-churrasco.tsx) — aplica meia-entrada de criança no
 * Valor Sugerido Total, decisão do Pedro de 2026-09-08 (docs/DECISOES.md).
 * Não usar na página do Simulador de Cardápio isolado.
 */
export async function calcularPrecificacaoEventoAction(entrada: EntradaPrecificacaoEvento) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return calcularPrecificacaoEventoParaPreparos(
    entrada.preparoIds,
    {
      numConvidados: entrada.numConvidados,
      regiaoMetropolitanaCuritiba: entrada.regiaoMetropolitanaCuritiba,
      quantidadeGarcom: entrada.quantidadeGarcom,
      valorGarcom: entrada.valorGarcom,
    },
    entrada.distribuicaoConvidados
  );
}

/**
 * "Ver cálculos" no Simulador de Cardápio — recebe exatamente a mesma
 * seleção/opções em uso na tela no momento do clique (não uma cópia
 * separada) e devolve o passo a passo por item, pra investigar o bug de
 * mistura de unidades (docs/PENDENCIAS_NOTURNAS.md) sem sair do fluxo
 * normal de simulação. Reaproveita distribuirPorcoes/
 * calcularPrecificacaoCardapio sem alteração — ver
 * src/lib/debug-calculo-cardapio.ts.
 */
export async function calcularDebugCardapioAction(entrada: EntradaPrecificacao) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return calcularDebugCardapio(entrada.preparoIds, {
    numConvidados: entrada.numConvidados,
    regiaoMetropolitanaCuritiba: entrada.regiaoMetropolitanaCuritiba,
    quantidadeGarcom: entrada.quantidadeGarcom,
    valorGarcom: entrada.valorGarcom,
  });
}
