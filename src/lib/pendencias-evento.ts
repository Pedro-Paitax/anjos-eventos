/**
 * "Item pendente" de um evento do Senhor Churrasco (Home e Decisões
 * Operacionais). Função pura — quem monta a entrada é
 * `src/lib/decisoes-operacionais.ts`.
 *
 * Regras (definidas pelo Pedro; interpretações marcadas abaixo):
 * - equipe mínima: ≥ 1 copeira, ≥ 1 assador e garçons alocados ≥
 *   `eventos.qtd_garcons` (INTERPRETAÇÃO: sem garçons contratados no
 *   evento, nenhum garçom é exigido);
 * - campos logísticos: veículo, modelo do prato, copo/taça
 *   (`tipo_bebida_recipiente`) e talher preenchidos (texto não vazio).
 *   Sousplat e as taças (furta-cor/champanhe) são booleanos com "não" como
 *   valor válido — contam como preenchidos assim que as Decisões
 *   Operacionais foram salvas ao menos uma vez (INTERPRETAÇÃO).
 */

import type { CampoOpcao } from "@/lib/decisoes-operacionais-opcoes";

export type EquipeAlocada = {
  copeiras: number;
  assadores: number;
  garcons: number;
};

export type DecisoesParaPendencia = {
  veiculo: string | null;
  modeloPrato: string | null;
  tipoBebidaRecipiente: string | null;
  tipoTalher: string | null;
};

export type EntradaPendencias = {
  garconsNecessarios: number | null;
  equipe: EquipeAlocada;
  /** null = as Decisões Operacionais nunca foram salvas. */
  decisoes: DecisoesParaPendencia | null;
};

export type ItemPendencia =
  | { tipo: "equipe"; funcao: "copeira" | "assador" | "garcom"; faltam: number; texto: string }
  | { tipo: "logistica"; campo: CampoOpcao | "decisoes"; texto: string };

/**
 * Fonte única da regra de pendência. Um valor legado (texto livre fora da
 * lista de opções) conta como preenchido: só vazio/espaços é pendente.
 */
export function calcularItensPendencia(entrada: EntradaPendencias): ItemPendencia[] {
  const itens: ItemPendencia[] = [];
  const { equipe, decisoes } = entrada;

  if (equipe.copeiras < 1) {
    itens.push({ tipo: "equipe", funcao: "copeira", faltam: 1, texto: "Alocar ao menos 1 copeira" });
  }
  if (equipe.assadores < 1) {
    itens.push({ tipo: "equipe", funcao: "assador", faltam: 1, texto: "Alocar ao menos 1 assador" });
  }
  const garconsNecessarios = entrada.garconsNecessarios ?? 0;
  if (equipe.garcons < garconsNecessarios) {
    itens.push({
      tipo: "equipe",
      funcao: "garcom",
      faltam: garconsNecessarios - equipe.garcons,
      texto: `Alocar garçons (${equipe.garcons} de ${garconsNecessarios})`,
    });
  }

  const vazio = (valor: string | null | undefined) => !valor || !valor.trim();
  if (!decisoes) {
    itens.push({ tipo: "logistica", campo: "decisoes", texto: "Preencher as decisões operacionais" });
  } else {
    if (vazio(decisoes.veiculo)) itens.push({ tipo: "logistica", campo: "veiculo", texto: "Definir veículo" });
    if (vazio(decisoes.modeloPrato)) {
      itens.push({ tipo: "logistica", campo: "modeloPrato", texto: "Definir modelo do prato" });
    }
    if (vazio(decisoes.tipoBebidaRecipiente)) {
      itens.push({ tipo: "logistica", campo: "tipoBebidaRecipiente", texto: "Definir copo/taça" });
    }
    if (vazio(decisoes.tipoTalher)) itens.push({ tipo: "logistica", campo: "tipoTalher", texto: "Definir talher" });
  }

  return itens;
}

export function calcularPendencias(entrada: EntradaPendencias): string[] {
  return calcularItensPendencia(entrada).map((i) => i.texto);
}

export const ANCORA_DECISOES_OPERACIONAIS = "decisoes-operacionais";

export type AtivosPorFuncao = Record<"copeira" | "assador" | "garcom", number>;

/**
 * Para onde o item leva: Decisões Operacionais do evento, ou o cadastro de
 * colaboradores quando não há nenhum ativo da função faltante.
 */
export function destinoItemPendencia(
  item: ItemPendencia,
  eventoId: number,
  ativos: AtivosPorFuncao
): { href: string; texto: string } {
  if (item.tipo === "equipe" && ativos[item.funcao] < 1) {
    return {
      href: "/colaboradores",
      texto: `${item.texto} — nenhum ativo cadastrado, cadastre em Colaboradores`,
    };
  }
  return { href: `/agenda/${eventoId}#${ANCORA_DECISOES_OPERACIONAIS}`, texto: item.texto };
}
