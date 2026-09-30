import "server-only";

// Cliente HTTP do WhatsApp Worker (processo separado — nunca importado, só
// chamado por HTTP). A fila sequencial com 3 s entre envios vive no worker;
// quem chama aqui deve aguardar cada envio antes do próximo (sem Promise.all).

export type StatusWorker = {
  status: "connected" | "disconnected" | "connecting";
  qr_code: string | null;
};

function config(): { url: string; token: string } {
  const token = process.env.WHATSAPP_WORKER_TOKEN;
  if (!token) throw new Error("WHATSAPP_WORKER_TOKEN não configurado.");
  return { url: process.env.WHATSAPP_WORKER_URL ?? "http://127.0.0.1:3100", token };
}

async function chamar(caminho: string, corpo?: unknown, timeoutMs = 60_000): Promise<unknown> {
  const { url, token } = config();
  const resposta = await fetch(`${url}${caminho}`, {
    method: corpo === undefined ? "GET" : "POST",
    headers: {
      authorization: `Bearer ${token}`,
      ...(corpo === undefined ? {} : { "content-type": "application/json" }),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await resposta.json().catch(() => ({}))) as { error?: string };
  if (!resposta.ok) throw new Error(json.error ?? `Worker respondeu ${resposta.status}.`);
  return json;
}

/** null = worker inacessível (fora do ar ou sem token configurado). */
export async function statusWorker(): Promise<StatusWorker | null> {
  try {
    return (await chamar("/status", undefined, 5000)) as StatusWorker;
  } catch {
    return null;
  }
}

export async function enviarTexto(para: string, texto: string): Promise<void> {
  await chamar("/send-message", { to: para, text: texto });
}

export async function enviarDocumento(
  para: string,
  nomeArquivo: string,
  pdf: Uint8Array,
  legenda?: string,
): Promise<void> {
  await chamar("/send-document", {
    to: para,
    filename: nomeArquivo,
    pdf_base64: Buffer.from(pdf).toString("base64"),
    caption: legenda,
  });
}
