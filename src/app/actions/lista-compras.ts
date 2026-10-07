"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { enviarDocumento, enviarTexto, statusWorker } from "@/lib/whatsapp-worker";
import {
  carregarDocumentoListaCompras,
  gerarPdfDoDocumento,
  nomeArquivoListaCompras,
} from "@/lib/lista-compras-documento";
import {
  destinoListaCompras,
  obterUltimoEnvioListaCompras,
  registrarEnvioListaCompras,
} from "@/lib/lista-compras-envio";
import { formatarData } from "@/lib/formatacao";

export type ResultadoEnvioListaCompras =
  | { tipo: "erro"; mensagem: string }
  /** Já houve envio e o usuário ainda não confirmou o reenvio. */
  | { tipo: "confirmar-reenvio"; ultimoEnvio: string }
  | {
      tipo: "concluido";
      pdf: { ok: boolean; mensagem: string };
      texto: { ok: boolean; mensagem: string } | null;
      gravado: boolean;
    };

const erro = (mensagem: string): ResultadoEnvioListaCompras => ({ tipo: "erro", mensagem });

/**
 * Envia a lista de compras (PDF + mensagem curta) ao destino fixo da variável
 * LISTA_COMPRAS_WHATSAPP. Exige usuário logado. Os dois envios são
 * sequenciais (a fila do worker espaça 3 s). O número nunca aparece em
 * retorno, erro ou log.
 */
export async function enviarListaComprasAction(
  eventoId: number,
  confirmarReenvio: boolean,
): Promise<ResultadoEnvioListaCompras> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  if (!Number.isInteger(eventoId) || eventoId <= 0) return erro("Evento inválido.");

  const destino = destinoListaCompras();
  if (!destino) return erro("Destino da lista de compras não configurado no servidor.");

  const documento = await carregarDocumentoListaCompras(eventoId);
  if (!documento) return erro("Evento não encontrado.");
  if (documento.itens.length === 0) return erro("Este evento não tem cardápio confirmado.");

  const ultimoEnvio = await obterUltimoEnvioListaCompras(eventoId);
  if (ultimoEnvio && !confirmarReenvio) return { tipo: "confirmar-reenvio", ultimoEnvio };

  const worker = await statusWorker();
  if (!worker) return erro("O serviço de WhatsApp não está respondendo. Nada foi enviado.");
  if (worker.status !== "connected") {
    return erro("O WhatsApp está desconectado. Conecte o aparelho e tente de novo. Nada foi enviado.");
  }

  const pdf = await gerarPdfDoDocumento(documento);
  const resultadoPdf = await tentar(() => enviarDocumento(destino, nomeArquivoListaCompras(eventoId), pdf));
  if (!resultadoPdf.ok) {
    return { tipo: "concluido", pdf: resultadoPdf, texto: null, gravado: false };
  }

  // Grava só depois de o PDF ter sido aceito pelo worker.
  const gravado = await registrarEnvioListaCompras(eventoId);

  const { evento } = documento;
  const mensagem = `Lista de compras - ${evento.cliente}, ${formatarData(evento.data_evento)}. O PDF segue acima.`;
  const resultadoTexto = await tentar(() => enviarTexto(destino, mensagem));

  revalidatePath(`/agenda/${eventoId}`);
  return { tipo: "concluido", pdf: resultadoPdf, texto: resultadoTexto, gravado };
}

async function tentar(envio: () => Promise<void>): Promise<{ ok: boolean; mensagem: string }> {
  try {
    await envio();
    return { ok: true, mensagem: "Enviado." };
  } catch {
    // Mensagem fixa: o erro bruto pode trazer URL do worker.
    return { ok: false, mensagem: "Falha no envio pelo WhatsApp." };
  }
}
