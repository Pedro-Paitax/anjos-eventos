import type { StatusLead } from "@/lib/prospeccao-opcoes";

/**
 * Regras PURAS do envio automático de WhatsApp da prospecção (decisão do Pedro,
 * 2026-10-29): texto gerado pelo Gemini, só a primeira mensagem passa por
 * validação humana, sem frase de saída, teto de 10 envios por dia.
 * Sem acesso a banco, rede ou relógio: tudo recebe os dados por parâmetro.
 */

export const LIMITE_DIARIO_MAXIMO = 10;
export const LIMITE_DIARIO_PADRAO = 10;
export const MAX_TENTATIVAS = 3;

const FUSO = "America/Sao_Paulo";
/** Janela comercial: seg–sex, 09:00 até 17:59 (horário de São Paulo). */
const HORA_INICIO = 9;
const HORA_FIM = 18;

/** Dia civil em São Paulo no formato AAAA-MM-DD (base do teto diário). */
export function diaSaoPaulo(agora: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    agora,
  );
}

export function dentroDoHorarioComercial(agora: Date): boolean {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  if (dia === "Sat" || dia === "Sun") return false;
  return hora >= HORA_INICIO && hora < HORA_FIM;
}

/**
 * Telefone do lead pronto para o worker: só dígitos, com DDI 55 (12 ou 13 dígitos).
 * Qualquer outra coisa é recusada em vez de "consertada" (não presumimos DDI nem DDD).
 */
export function telefoneParaEnvio(telefone: string | null): string | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digitos) ? digitos : null;
}

/** Quem já foi abordado, está em conversa ou pediu para sair nunca entra no envio automático. */
const STATUS_BLOQUEADOS: StatusLead[] = [
  "contatado",
  "em_conversa",
  "reuniao_proposta",
  "convertido",
  "sem_interesse",
  "nao_contatar",
];

export type LeadParaEnvio = {
  status: StatusLead;
  naoContatar: boolean;
  telefone: string | null;
  /** Já existe interação "envio_confirmado" ou mensagem enviada para o lead. */
  jaContatado: boolean;
};

/** null = pode receber a abordagem; texto = motivo (vai para a fila, sem dados pessoais). */
export function motivoLeadNaoElegivel(lead: LeadParaEnvio): string | null {
  if (lead.naoContatar) return "Lead marcado como não contatar.";
  if (STATUS_BLOQUEADOS.includes(lead.status)) return "Lead já foi abordado ou saiu do funil.";
  if (lead.jaContatado) return "Lead já recebeu uma mensagem.";
  if (!telefoneParaEnvio(lead.telefone)) return "Telefone ausente ou fora do formato 55 + DDD + número.";
  return null;
}

export type ConfigEnvio = {
  ativo: boolean;
  limiteDiario: number;
  nomeRemetente: string | null;
  /** Mensagem do Gemini aprovada por uma pessoa (a validação da primeira mensagem). */
  modelo: { gerador: string; canal: string; aprovada: boolean } | null;
};

/** A liberação só vale se a mensagem-modelo continua sendo uma do Gemini, de WhatsApp, aprovada. */
export function liberacaoValida(config: ConfigEnvio | null): config is ConfigEnvio {
  return (
    !!config &&
    config.ativo &&
    !!config.nomeRemetente?.trim() &&
    config.modelo?.gerador === "gemini" &&
    config.modelo.canal === "whatsapp" &&
    config.modelo.aprovada
  );
}

export type Contexto = {
  config: ConfigEnvio | null;
  workerConectado: boolean;
  /** Envios do dia (concluídos + em andamento + a conferir), fuso de São Paulo. */
  enviadosHoje: number;
  agora: Date;
};

export type Decisao = { processar: true } | { processar: false; motivo: string };

export function decidirRodada(ctx: Contexto): Decisao {
  if (!liberacaoValida(ctx.config)) return { processar: false, motivo: "Envio automático desligado ou sem mensagem validada." };
  if (!dentroDoHorarioComercial(ctx.agora)) return { processar: false, motivo: "Fora do horário comercial." };
  if (!ctx.workerConectado) return { processar: false, motivo: "WhatsApp desconectado." };
  const limite = Math.min(ctx.config.limiteDiario, LIMITE_DIARIO_MAXIMO);
  if (ctx.enviadosHoje >= limite) return { processar: false, motivo: "Limite diário atingido." };
  return { processar: true };
}

export type DestinoFalha = "tentar_depois" | "descartar_lead" | "conferir";

/**
 * O que fazer com o item da fila quando o worker falha.
 * - 503 (WhatsApp desconectado): nada foi enviado → volta para a fila sem gastar tentativa.
 * - 422 (número sem WhatsApp): definitivo para este lead.
 * - qualquer outra coisa (timeout, 502, rede): PODE ter sido enviado → "conferir", nunca reenvia sozinho.
 */
export function classificarFalhaWorker(status: number | null): DestinoFalha {
  if (status === 503) return "tentar_depois";
  if (status === 422) return "descartar_lead";
  return "conferir";
}
