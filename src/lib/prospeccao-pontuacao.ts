/**
 * Qualificação comercial explicável (0–100). Funções puras.
 *
 * Os pesos e as faixas ficam só aqui: "configurável" = mudar este arquivo.
 * Avaliações antigas guardam os pontos e o máximo de cada dimensão no JSON,
 * então mudar os pesos não reescreve o histórico.
 *
 * Dimensão desconhecida (pontos = null) não vale zero: entra só na completude
 * e deixa a pontuação provisória. Com menos da metade dos pesos avaliada, a
 * prioridade é "indefinida" (precisa pesquisar mais, não é lead ruim).
 */
import type { Confianca } from "@/lib/prospeccao-opcoes";

export const DIMENSOES = [
  {
    chave: "compatibilidade",
    rotulo: "Compatibilidade com parrilla / fogo ao vivo",
    maximo: 30,
    ajuda: "Cardápio, proposta ou estrutura que combinam com carne na brasa e fogo ao vivo.",
  },
  {
    chave: "demanda",
    rotulo: "Sinais de demanda por eventos e experiências",
    maximo: 25,
    ajuda: "Programação, eventos, festivais, ativações ou experiências documentadas.",
  },
  {
    chave: "viabilidade",
    rotulo: "Viabilidade operacional aparente",
    maximo: 20,
    ajuda: "Espaço externo, área para fogo, porte compatível. Só o que a fonte mostra.",
  },
  {
    chave: "potencial",
    rotulo: "Potencial comercial e de recorrência",
    maximo: 15,
    ajuda: "Frequência de eventos, público, chance de parceria repetida.",
  },
  {
    chave: "canal",
    rotulo: "Canal comercial apropriado",
    maximo: 10,
    ajuda: "Existe contato comercial público e adequado (telefone, e-mail, perfil).",
  },
] as const;

export type ChaveDimensao = (typeof DIMENSOES)[number]["chave"];

export type DimensaoAvaliada = {
  chave: ChaveDimensao;
  /** null = desconhecida (dados insuficientes). */
  pontos: number | null;
  maximo: number;
  justificativa: string;
  evidenciaIds: number[];
  confianca: Confianca;
};

export type Prioridade = "A" | "B" | "C" | "baixa" | "indefinida";

export const ROTULOS_PRIORIDADE: Record<Prioridade, string> = {
  A: "A (80–100)",
  B: "B (60–79)",
  C: "C (40–59)",
  baixa: "Baixa (< 40)",
  indefinida: "Indefinida (dados insuficientes)",
};

export type ResultadoQualificacao = {
  /** Soma das dimensões conhecidas. */
  pontuacao: number;
  /** O que a pontuação poderia chegar se as desconhecidas tirassem nota máxima. */
  pontuacaoMaxima: number;
  /** % dos pesos com dimensão avaliada. */
  completude: number;
  prioridade: Prioridade;
  provisoria: boolean;
  confianca: Confianca;
};

export function faixaPrioridade(pontos: number): Exclude<Prioridade, "indefinida"> {
  if (pontos >= 80) return "A";
  if (pontos >= 60) return "B";
  if (pontos >= 40) return "C";
  return "baixa";
}

export type ErroDimensao = { chave: ChaveDimensao; erro: string };

/** Valida uma dimensão vinda do formulário. Nota sem justificativa não é aceita. */
export function validarDimensao(d: DimensaoAvaliada): string | null {
  const def = DIMENSOES.find((x) => x.chave === d.chave);
  if (!def) return "dimensão desconhecida";
  if (d.pontos === null) return null;
  if (!Number.isInteger(d.pontos) || d.pontos < 0 || d.pontos > def.maximo) {
    return `nota deve ser inteira entre 0 e ${def.maximo}`;
  }
  if (!d.justificativa.trim()) return "nota sem justificativa";
  if (d.pontos > 0 && d.evidenciaIds.length === 0 && d.confianca !== "baixa") {
    return "nota sem evidência só com confiança baixa";
  }
  return null;
}

export function calcularQualificacao(dimensoes: DimensaoAvaliada[]): ResultadoQualificacao {
  const conhecidas = dimensoes.filter((d) => d.pontos !== null);
  const pesoTotal = DIMENSOES.reduce((s, d) => s + d.maximo, 0);
  const pesoConhecido = conhecidas.reduce((s, d) => s + d.maximo, 0);
  const pontuacao = conhecidas.reduce((s, d) => s + (d.pontos ?? 0), 0);
  const pontuacaoMaxima = pontuacao + (pesoTotal - pesoConhecido);
  const completude = Math.round((pesoConhecido / pesoTotal) * 100);
  const provisoria = conhecidas.length < DIMENSOES.length || conhecidas.some((d) => d.confianca === "baixa");

  let prioridade: Prioridade;
  if (completude < 50) prioridade = "indefinida";
  else if (pontuacaoMaxima < 40) prioridade = "baixa"; // nem com nota máxima nas desconhecidas chega a C
  else prioridade = faixaPrioridade(pontuacao);

  let confianca: Confianca;
  if (completude < 60 || conhecidas.some((d) => d.confianca === "baixa")) confianca = "baixa";
  else if (completude === 100 && conhecidas.every((d) => d.confianca === "alta")) confianca = "alta";
  else confianca = "media";

  return { pontuacao, pontuacaoMaxima, completude, prioridade, provisoria, confianca };
}

/** Campos que um lead precisa ter para sair da fila de pesquisa. */
export type DadosCompletude = {
  municipio: string | null;
  site: string | null;
  instagram: string | null;
  telefone: string | null;
  email: string | null;
  sinaisDemanda: string | null;
  compatibilidadeParrilla: string | null;
  evidenciasVerificadas: number;
  temQualificacao: boolean;
};

export function pendenciasCadastro(d: DadosCompletude): string[] {
  const p: string[] = [];
  if (!d.municipio) p.push("município");
  if (!d.site && !d.instagram) p.push("site ou Instagram");
  if (!d.telefone && !d.email && !d.instagram) p.push("canal de contato");
  if (!d.sinaisDemanda) p.push("sinais de demanda");
  if (!d.compatibilidadeParrilla) p.push("compatibilidade com parrilla");
  if (d.evidenciasVerificadas === 0) p.push("fonte verificada");
  if (!d.temQualificacao) p.push("qualificação");
  return p;
}
