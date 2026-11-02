/**
 * Domínios de fornecedores e histórico de preços. Os CHECKs de src/db/schema/precos.ts
 * e src/db/schema/insumos.ts repetem estas listas — mudar aqui exige migration.
 * Sem "server-only": os formulários (client components) usam as listas e os rótulos.
 */

export const CANAIS_COMPRA = ["atacado", "varejo"] as const;
export type CanalCompra = (typeof CANAIS_COMPRA)[number];

export const ROTULOS_CANAL: Record<CanalCompra, string> = {
  atacado: "Atacado",
  varejo: "Varejo",
};

export const FONTES_PRECO = ["cotacao_pdf", "nota_fiscal", "pesquisa_web", "ceasa", "manual"] as const;
export type FontePreco = (typeof FONTES_PRECO)[number];

export const ROTULOS_FONTE: Record<FontePreco, string> = {
  cotacao_pdf: "Cotação (PDF)",
  nota_fiscal: "Nota fiscal",
  pesquisa_web: "Pesquisa web",
  ceasa: "Ceasa",
  manual: "Manual",
};

/** Fontes que se registram à mão na tela do insumo. A cotação em PDF tem fluxo próprio (com conferência). */
export const FONTES_REGISTRO_MANUAL: FontePreco[] = ["nota_fiscal", "manual", "ceasa", "pesquisa_web"];

export function ehUm<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor);
}

/** Dias inteiros entre duas datas de calendário ("AAAA-MM-DD" ou Date), sem depender de fuso. */
export function diasEntre(de: string | Date, ate: string | Date): number {
  const dia = (d: string | Date) => {
    const s = typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
    const [a, m, dd] = s.split("-").map(Number);
    return Date.UTC(a, m - 1, dd);
  };
  return Math.round((dia(ate) - dia(de)) / 86_400_000);
}

/** "hoje", "ontem", "há 5 dias", "há 3 meses". Sem juízo de "velho": o prazo ainda não foi decidido. */
export function idadeTexto(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 60) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  return `há ${meses} meses`;
}

/** "AAAA-MM-DD" → "12/10/2026" (data de calendário, sem conversão de fuso). */
export function formatarDiaCurto(dia: string): string {
  const [a, m, d] = dia.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarReais(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Marca o menor preço por insumo entre fornecedores diferentes. Itens sem insumo ligado
 * não entram (não dá para saber se "Picanha 2" e "Picanha 3" são a mesma coisa).
 * Só marca quando há pelo menos dois fornecedores para o mesmo insumo.
 */
export function idsMenorPreco(
  itens: { id: number; insumoId: number | null; fornecedorId: number | null; preco: number }[],
): Set<number> {
  const porInsumo = new Map<number, typeof itens>();
  for (const item of itens) {
    if (item.insumoId == null || item.fornecedorId == null) continue;
    const lista = porInsumo.get(item.insumoId) ?? [];
    lista.push(item);
    porInsumo.set(item.insumoId, lista);
  }
  const ids = new Set<number>();
  for (const lista of porInsumo.values()) {
    if (new Set(lista.map((i) => i.fornecedorId)).size < 2) continue;
    const menor = Math.min(...lista.map((i) => i.preco));
    for (const i of lista) if (i.preco === menor) ids.add(i.id);
  }
  return ids;
}

/** "AAAA-MM-DD" de hoje no fuso da equipe (America/Sao_Paulo). */
export function hojeNaEquipe(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/**
 * Preço de cadastro a partir do preço bruto do fornecedor: + 10 % (decisão do Pedro, 2026-11-02;
 * `insumos.preco` sempre carrega essa margem interna — docs/DECISOES.md). Arredonda em centavos.
 */
export const MARGEM_INTERNA_FORNECEDOR = 0.1;

export function precoComMargem(bruto: number): number {
  return Math.round(bruto * (1 + MARGEM_INTERNA_FORNECEDOR) * 100) / 100;
}

/** Preço com mais de 14 dias é desatualizado (decisão do Pedro, 2026-11-02; vale para todos os insumos). */
export const PRAZO_PRECO_DIAS = 14;

export type EstadoPreco = "em_dia" | "desatualizado" | "sem_data";

export function estadoPreco(atualizadoEm: string | null, hoje: string): EstadoPreco {
  if (!atualizadoEm) return "sem_data";
  return diasEntre(atualizadoEm, hoje) > PRAZO_PRECO_DIAS ? "desatualizado" : "em_dia";
}
