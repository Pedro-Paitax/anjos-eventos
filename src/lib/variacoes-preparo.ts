/**
 * Agrupamento visual de versões de preparo (migration 0012). Sem "server-only": usado pela
 * lista de preparos e pelos seletores de cardápio. Só muda a ORDEM e o RÓTULO exibidos;
 * a seleção continua por nome/id do próprio preparo (payload dos formulários intacto).
 */

export type ItemComVariacao = { id: number; nome: string; variacaoDe?: number | null };

export type GrupoPreparo<T extends ItemComVariacao> = { item: T; variacoes: T[] };

/**
 * Base seguida das suas versões. Versão cujo base não está na lista (filtro, outra categoria)
 * aparece sozinha, com o nome completo. Mantém a ordem recebida para bases e versões.
 */
export function agruparPorBase<T extends ItemComVariacao>(itens: T[]): GrupoPreparo<T>[] {
  const ids = new Set(itens.map((i) => i.id));
  const versoes = new Map<number, T[]>();
  for (const i of itens) {
    if (i.variacaoDe != null && ids.has(i.variacaoDe)) {
      const lista = versoes.get(i.variacaoDe) ?? [];
      lista.push(i);
      versoes.set(i.variacaoDe, lista);
    }
  }
  return itens
    .filter((i) => i.variacaoDe == null || !ids.has(i.variacaoDe))
    .map((item) => ({ item, variacoes: versoes.get(item.id) ?? [] }));
}

/** "Fraldinha com Chimichurri" sob "Fraldinha" → "com Chimichurri". Sem o prefixo, devolve o nome inteiro. */
export function rotuloVariacao(nomeBase: string, nome: string): string {
  const base = nomeBase.trim();
  if (nome.toLocaleLowerCase("pt-BR").startsWith(base.toLocaleLowerCase("pt-BR"))) {
    const resto = nome.slice(base.length).replace(/^[\s+\-–—:,]+/, "").trim();
    if (resto) return resto;
  }
  return nome;
}

/**
 * Nome completo da versão dividido em "parte igual ao base" e "o que muda", para destacar a diferença
 * sem esconder o nome ("Pão de Alho Tradicional" + "com Chimichurri"). Sem o prefixo, tudo vai em `diferenca`.
 */
export function partesNomeVariacao(nomeBase: string, nome: string): { comum: string; diferenca: string } {
  const diferenca = rotuloVariacao(nomeBase, nome);
  if (diferenca === nome) return { comum: "", diferenca: nome };
  // Tudo antes da diferença, inclusive um separador ("+", "-"), para o nome lido em sequência ficar inteiro.
  const fim = nome.trimEnd();
  return { comum: fim.slice(0, fim.length - diferenca.length).trimEnd(), diferenca };
}

/** Lista plana para menus: base, depois as versões dele com `nomeBase` (para recuar e encurtar o rótulo). */
export function emOrdemDeVersoes<T extends ItemComVariacao>(itens: T[]): { item: T; nomeBase?: string }[] {
  return agruparPorBase(itens).flatMap(({ item, variacoes }) => [
    { item },
    ...variacoes.map((v) => ({ item: v, nomeBase: item.nome })),
  ]);
}
