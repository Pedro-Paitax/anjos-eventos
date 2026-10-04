import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export const dynamic = "force-dynamic";

type StatusWhatsapp = {
  status: "connected" | "disconnected" | "connecting";
  qr_code: string | null;
  /** true quando o worker não respondeu (fora do ar ou não configurado). */
  worker_offline?: boolean;
};

const OFFLINE: StatusWhatsapp = {
  status: "disconnected",
  qr_code: null,
  worker_offline: true,
};

/**
 * Proxy autenticado para o /status do WhatsApp Worker (processo separado,
 * acessado só por HTTP — nunca importado). O navegador não fala com o worker
 * nem conhece o token. Se o worker cair, o ERP segue normal: aqui só volta
 * "offline".
 */
export async function GET() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const url = process.env.WHATSAPP_WORKER_URL ?? "http://127.0.0.1:3100";
  const token = process.env.WHATSAPP_WORKER_TOKEN;
  if (!token) return NextResponse.json(OFFLINE);

  try {
    const resposta = await fetch(`${url}/status`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!resposta.ok) return NextResponse.json(OFFLINE);
    const dados = (await resposta.json()) as StatusWhatsapp;
    return NextResponse.json({ status: dados.status, qr_code: dados.qr_code });
  } catch {
    return NextResponse.json(OFFLINE);
  }
}
