"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { enviarDocumento, statusWorker } from "@/lib/whatsapp-worker";
import { numerosFamilia } from "@/lib/automacao-whatsapp";
import {
  carregarDocumentoChecklist,
  gerarPdfChecklist,
  MOTIVO_SEM_PDF,
  nomeArquivoChecklist,
} from "@/lib/checklist-carregamento-documento";
import { gravarItensCargaFicha } from "@/lib/checklist-carregamento-dados";

export type ResultadoEnvioChecklist =
  | { tipo: "erro"; mensagem: string }
  | { tipo: "concluido"; enviados: number; falhas: number };

const erro = (mensagem: string): ResultadoEnvioChecklist => ({ tipo: "erro", mensagem });

/**
 * Envia o PDF do checklist de carregamento aos números da família (FAMILIA_WHATSAPP_NUMEROS, como o
 * lembrete de 7 dias). Só pelo botão, sem cron (decisão de 05/11). Envio sequencial (a fila do
 * worker espaça 3 s). Nenhum número aparece em retorno, erro ou log.
 */
export async function enviarChecklistAction(eventoId: number): Promise<ResultadoEnvioChecklist> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  if (!Number.isInteger(eventoId) || eventoId <= 0) return erro("Evento inválido.");

  const numeros = numerosFamilia();
  if (numeros.length === 0) return erro("Os números da família não estão configurados no servidor. Nada foi enviado.");

  const documento = await carregarDocumentoChecklist(eventoId);
  if (documento.tipo !== "ok") return erro(MOTIVO_SEM_PDF[documento.tipo]);

  const worker = await statusWorker();
  if (!worker) return erro("O serviço de WhatsApp não está respondendo. Nada foi enviado.");
  if (worker.status !== "connected") {
    return erro("O WhatsApp está desconectado. Conecte o aparelho e tente de novo. Nada foi enviado.");
  }

  const pdf = await gerarPdfChecklist(documento.dados);
  const legenda = `Checklist de carregamento - ${documento.evento.cliente}, ${documento.dados.data}`;
  let enviados = 0;
  let falhas = 0;
  for (const numero of numeros) {
    try {
      await enviarDocumento(numero, nomeArquivoChecklist(eventoId), pdf, legenda);
      enviados++;
    } catch {
      // Mensagem fixa: o erro bruto pode trazer URL do worker.
      falhas++;
      console.error(`[checklist-carregamento] falha ao enviar o PDF do evento ${eventoId}.`);
    }
  }
  return { tipo: "concluido", enviados, falhas };
}

export type EstadoItensCargaFicha = { status: "inicial" | "salvo" | "erro"; mensagem?: string };

/** Grava os itens de carga marcados na ficha técnica (preparo). */
export async function salvarItensCargaFichaAction(
  preparoId: number,
  _anterior: EstadoItensCargaFicha,
  formData: FormData,
): Promise<EstadoItensCargaFicha> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  if (!Number.isInteger(preparoId) || preparoId <= 0) return { status: "erro", mensagem: "Ficha inválida." };

  const ids = [...new Set(formData.getAll("itemCargaId").map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  try {
    const ok = await gravarItensCargaFicha(preparoId, ids);
    if (!ok) return { status: "erro", mensagem: "Falta a migração 0016 do banco. Nada foi gravado." };
  } catch {
    return { status: "erro", mensagem: "Não foi possível gravar os itens de carga. Tente de novo." };
  }
  revalidatePath(`/preparos/${preparoId}`);
  return { status: "salvo", mensagem: "Itens de carga salvos." };
}
