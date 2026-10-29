"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { confirmarEnvio, descartarMensagem } from "@/lib/prospeccao";
import {
  cancelarItemFila,
  desligarEnvio,
  enfileirarLead,
  ligarEnvio,
  resolverConferencia,
} from "@/lib/prospeccao-envio-auto";

const PAGINA = "/prospeccao/envio-automatico";

async function exigirUsuario() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

function voltar(aviso: { erro?: string; ok?: string }): never {
  revalidatePath(PAGINA);
  const q = new URLSearchParams(aviso.erro ? { erro: aviso.erro } : { ok: aviso.ok ?? "" });
  redirect(`${PAGINA}?${q.toString()}`);
}

export async function ligarEnvioAction(fd: FormData): Promise<void> {
  const usuario = await exigirUsuario();
  if (fd.get("confirmo") !== "on") voltar({ erro: "Marque a confirmação para ligar o envio automático." });
  const r = await ligarEnvio(
    usuario.id,
    Number(fd.get("mensagem_id")),
    String(fd.get("nome_remetente") ?? ""),
    Number(fd.get("limite_diario")),
  );
  voltar("erro" in r ? { erro: r.erro } : { ok: "Envio automático ligado." });
}

export async function desligarEnvioAction(): Promise<void> {
  await exigirUsuario();
  await desligarEnvio();
  voltar({ ok: "Envio automático desligado." });
}

export async function enfileirarLeadAction(leadId: number): Promise<void> {
  const usuario = await exigirUsuario();
  const r = await enfileirarLead(leadId, usuario.id);
  voltar("erro" in r ? { erro: r.erro } : { ok: "Lead na fila." });
}

export async function cancelarItemAction(itemId: number): Promise<void> {
  await exigirUsuario();
  const r = await cancelarItemFila(itemId);
  voltar("erro" in r ? { erro: r.erro } : { ok: "Item cancelado." });
}

/** Item "conferir": a pessoa olhou o WhatsApp e diz se a mensagem saiu. */
export async function conferirItemAction(itemId: number, enviou: boolean): Promise<void> {
  const usuario = await exigirUsuario();
  const r = await resolverConferencia(itemId, enviou);
  if ("erro" in r) voltar({ erro: r.erro });
  const { leadId, mensagemId } = r;
  const resultado = enviou
    ? await confirmarEnvio(leadId, mensagemId, usuario.id)
    : await descartarMensagem(leadId, mensagemId);
  revalidatePath("/prospeccao");
  voltar("erro" in resultado ? { erro: resultado.erro } : { ok: "Conferência registrada." });
}
