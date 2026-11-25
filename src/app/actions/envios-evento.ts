"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { enviarLembreteEvento, enviarOrdemAcaoManual } from "@/lib/automacao-whatsapp";

/** Resultado enviado ao navegador: só texto pronto, nunca número de telefone. */
export type ResultadoEnvioEvento =
  | { tipo: "erro"; mensagem: string }
  /** A Ordem já foi enviada antes; o botão pede a confirmação do reenvio. */
  | { tipo: "confirmar-reenvio"; enviadaEm: string }
  | { tipo: "concluido"; mensagem: string; parcial: boolean };

const erro = (mensagem: string): ResultadoEnvioEvento => ({ tipo: "erro", mensagem });
const SEM_ENVIO = "Nada foi enviado.";

/**
 * Botão "Enviar Ordem de Ação" da tela do evento. Manda o PDF de cada colaborador alocado
 * (com WhatsApp). Mesmas travas do envio automático (sem pendência, sem duplicar).
 */
export async function enviarOrdemAcaoAction(
  eventoId: number,
  confirmarReenvio: boolean
): Promise<ResultadoEnvioEvento> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  if (!Number.isInteger(eventoId) || eventoId <= 0) return erro("Evento inválido.");

  const r = await enviarOrdemAcaoManual(eventoId, confirmarReenvio);
  revalidatePath(`/agenda/${eventoId}`);
  if (r.ok) {
    const total = r.enviados + r.falhas;
    return {
      tipo: "concluido",
      parcial: r.falhas > 0,
      mensagem:
        r.falhas === 0
          ? `Ordem de Ação enviada para ${r.enviados} ${r.enviados === 1 ? "pessoa" : "pessoas"}.`
          : `Ordem de Ação enviada para ${r.enviados} de ${total}. ${r.falhas} ${r.falhas === 1 ? "falhou ou está sem WhatsApp" : "falharam ou estão sem WhatsApp"}.`,
    };
  }
  switch (r.motivo) {
    case "ja_enviada":
      return r.enviadaEm
        ? { tipo: "confirmar-reenvio", enviadaEm: r.enviadaEm }
        : erro("A Ordem de Ação já foi enviada.");
    case "pendente":
      return erro(`Há pendências nas decisões operacionais. ${SEM_ENVIO}`);
    case "sem_destinatarios":
      return erro(`Nenhum colaborador alocado tem WhatsApp cadastrado. ${SEM_ENVIO}`);
    case "worker_desconectado":
      return erro(`O WhatsApp está desconectado ou não responde. ${SEM_ENVIO}`);
    default:
      return erro("Só eventos confirmados do Senhor Churrasco recebem Ordem de Ação.");
  }
}

/** Botão "Enviar lembrete de pendências" da tela do evento (números da família). */
export async function enviarLembreteEventoAction(eventoId: number): Promise<ResultadoEnvioEvento> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  if (!Number.isInteger(eventoId) || eventoId <= 0) return erro("Evento inválido.");

  const r = await enviarLembreteEvento(eventoId);
  if (r.ok) {
    return {
      tipo: "concluido",
      parcial: r.falhas > 0,
      mensagem:
        r.falhas === 0
          ? `Lembrete enviado para ${r.enviadas} ${r.enviadas === 1 ? "número" : "números"} da família.`
          : `Lembrete enviado para ${r.enviadas} de ${r.enviadas + r.falhas} números. ${r.falhas} falhou.`,
    };
  }
  switch (r.motivo) {
    case "sem_pendencias":
      return erro(`Este evento não tem pendências. ${SEM_ENVIO}`);
    case "destinatarios_nao_configurados":
      return erro(`Os números da família não estão configurados no servidor. ${SEM_ENVIO}`);
    case "worker_desconectado":
      return erro(`O WhatsApp está desconectado ou não responde. ${SEM_ENVIO}`);
    default:
      return erro("Só eventos confirmados do Senhor Churrasco têm lembrete.");
  }
}
