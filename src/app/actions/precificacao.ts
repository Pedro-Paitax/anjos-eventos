"use server";

import { redirect } from "next/navigation";
import { calcularPrecificacaoEventoParaPreparos } from "@/lib/precificacao-evento";
import { calcularDebugCardapio } from "@/lib/debug-calculo-cardapio";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EntradaPrecificacao = {
  preparoIds: number[];
  numConvidados: number;
  regiaoMetropolitanaCuritiba: boolean;
  quantidadeGarcom?: number;
  valorGarcom?: number;
};

export type EntradaPrecificacaoEvento = EntradaPrecificacao & {
  distribuicaoConvidados: {
    adultos: number;
    criancasAte5: number;
    criancas5a10: number;
  };
  /** Ver OpcoesPrecificacao.precoPorPessoaEscolhido — preço fixo/editado escolhido na tela, no lugar do dinâmico. */
  precoPorPessoaEscolhido?: number;
};

/**
 * Precificação com faixa etária — aplica meia-entrada de criança no Valor
 * Sugerido Total (decisão do Pedro de 2026-09-08, docs/DECISOES.md). Usada
 * pelo Orçamento (formulario-orcamento-churrasco.tsx) e, desde 2026-11-04,
 * também pelo Simulador de Cardápio, que passou a ter adultos e crianças
 * (decisão do Pedro; docs/DECISOES.md, "Simulador de Cardápio com crianças").
 * Chamada direto do client, com debounce — não é form action de submit.
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
      precoPorPessoaEscolhido: entrada.precoPorPessoaEscolhido,
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
