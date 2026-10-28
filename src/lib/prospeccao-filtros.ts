/**
 * Filtros da lista de leads (vêm da URL, ?categoria=...&prioridade=...).
 * Feito em memória: a base é de dezenas/centenas de leads.
 */
import { canaisDisponiveis } from "@/lib/prospeccao-canais";
import { semAcentos } from "@/lib/prospeccao-normalizacao";
import type { CategoriaLead, Confianca, StatusLead } from "@/lib/prospeccao-opcoes";
import type { Prioridade } from "@/lib/prospeccao-pontuacao";

export type FiltrosLeads = {
  busca?: string;
  categoria?: string;
  municipio?: string;
  /** Prioridade da qualificação vigente, ou "sem" (nunca qualificado). */
  prioridade?: string;
  status?: string;
  /** "com" = tem canal e não está bloqueado; "sem" = falta pesquisar canal. */
  canal?: string;
  confianca?: string;
  /** "pontuacao" (maior primeiro) ou padrão (atualização mais recente). */
  ordem?: string;
};

export type LeadFiltravel = {
  nomeComercial: string;
  segmento: string | null;
  categoria: CategoriaLead;
  municipio: string | null;
  status: StatusLead;
  naoContatar: boolean;
  telefone: string | null;
  instagram: string | null;
  email: string | null;
  prioridade: Prioridade | null;
  pontuacao: number | null;
  confianca: Confianca | null;
};

const chave = (t: string) => semAcentos(t.toLowerCase()).trim();

export function temCanalUtilizavel(l: LeadFiltravel): boolean {
  return !l.naoContatar && canaisDisponiveis(l).length > 0;
}

export function filtrarLeads<T extends LeadFiltravel>(leads: T[], f: FiltrosLeads): T[] {
  const busca = f.busca ? chave(f.busca) : "";
  const resultado = leads.filter(
    (l) =>
      (!busca || chave(`${l.nomeComercial} ${l.segmento ?? ""}`).includes(busca)) &&
      (!f.categoria || l.categoria === f.categoria) &&
      (!f.municipio || (l.municipio !== null && chave(l.municipio) === chave(f.municipio))) &&
      (!f.prioridade || (f.prioridade === "sem" ? l.prioridade === null : l.prioridade === f.prioridade)) &&
      (!f.status || l.status === f.status) &&
      (!f.canal || (f.canal === "com" ? temCanalUtilizavel(l) : !temCanalUtilizavel(l))) &&
      (!f.confianca || l.confianca === f.confianca),
  );
  if (f.ordem === "pontuacao") {
    return [...resultado].sort((a, b) => (b.pontuacao ?? -1) - (a.pontuacao ?? -1));
  }
  return resultado;
}

/** Municípios presentes na base, para o filtro (sem repetir variações de caixa/acento). */
export function municipiosDistintos(leads: { municipio: string | null }[]): string[] {
  const vistos = new Map<string, string>();
  for (const l of leads) if (l.municipio && !vistos.has(chave(l.municipio))) vistos.set(chave(l.municipio), l.municipio);
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
