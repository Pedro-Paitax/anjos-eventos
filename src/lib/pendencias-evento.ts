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

export function calcularPendencias(entrada: EntradaPendencias): string[] {
  const pendencias: string[] = [];
  const { equipe, decisoes } = entrada;

  if (equipe.copeiras < 1) pendencias.push("Alocar ao menos 1 copeira");
  if (equipe.assadores < 1) pendencias.push("Alocar ao menos 1 assador");
  const garconsNecessarios = entrada.garconsNecessarios ?? 0;
  if (equipe.garcons < garconsNecessarios) {
    pendencias.push(
      `Alocar garçons (${equipe.garcons} de ${garconsNecessarios})`
    );
  }

  const vazio = (valor: string | null | undefined) => !valor || !valor.trim();
  if (!decisoes) {
    pendencias.push("Preencher as decisões operacionais");
  } else {
    if (vazio(decisoes.veiculo)) pendencias.push("Definir veículo");
    if (vazio(decisoes.modeloPrato)) pendencias.push("Definir modelo do prato");
    if (vazio(decisoes.tipoBebidaRecipiente)) pendencias.push("Definir copo/taça");
    if (vazio(decisoes.tipoTalher)) pendencias.push("Definir talher");
  }

  return pendencias;
}
