import { timingSafeEqual } from "node:crypto";
import http from "node:http";
import { FilaEnvio } from "./fila-envio.js";
import { paraJid } from "./telefone.js";
import { NaoConectadoError, type ClienteWhatsapp } from "./whatsapp.js";

// PDF em base64 dentro de JSON: 20 MB cobre com folga uma ficha técnica.
const LIMITE_CORPO_BYTES = 20 * 1024 * 1024;
const LIMITE_PDF_BYTES = 15 * 1024 * 1024;

class ErroHttp extends Error {
  constructor(
    readonly codigo: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

function responder(res: http.ServerResponse, codigo: number, corpo: unknown): void {
  const json = JSON.stringify(corpo);
  res.writeHead(codigo, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(json);
}

function tokenValido(recebido: string | undefined, esperado: string): boolean {
  const a = Buffer.from(recebido ?? "");
  const b = Buffer.from(`Bearer ${esperado}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function lerJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = [];
  let total = 0;
  for await (const parte of req) {
    total += (parte as Buffer).length;
    if (total > LIMITE_CORPO_BYTES) throw new ErroHttp(413, "Corpo grande demais.");
    partes.push(parte as Buffer);
  }
  try {
    const valor: unknown = JSON.parse(Buffer.concat(partes).toString("utf8"));
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new Error();
    return valor as Record<string, unknown>;
  } catch {
    throw new ErroHttp(400, "JSON inválido.");
  }
}

function textoObrigatorio(corpo: Record<string, unknown>, campo: string): string {
  const valor = corpo[campo];
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErroHttp(400, `Campo obrigatório: ${campo}.`);
  }
  return valor;
}

function destinatario(corpo: Record<string, unknown>): string {
  try {
    return paraJid(textoObrigatorio(corpo, "to"));
  } catch (erro) {
    throw erro instanceof ErroHttp ? erro : new ErroHttp(400, (erro as Error).message);
  }
}

export type OpcoesServidor = {
  token: string;
  cliente: ClienteWhatsapp;
  fila: FilaEnvio;
};

/**
 * API HTTP local do worker. Endpoints:
 *  GET  /health         → {ok:true} (sem auth; só prova que o processo vive)
 *  GET  /status         → {status, qr_code}
 *  POST /send-message   → {to, text}
 *  POST /send-document  → {to, filename, pdf_base64, caption?}
 *  POST /logout         → desvincula o aparelho e apaga a sessão
 * Tudo, exceto /health, exige `Authorization: Bearer <WORKER_TOKEN>`.
 * Respostas nunca ecoam números de telefone nem conteúdo.
 */
export function criarServidor({ token, cliente, fila }: OpcoesServidor): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const rota = `${req.method} ${(req.url ?? "").split("?")[0]}`;

      if (rota === "GET /health") return responder(res, 200, { ok: true });

      if (!tokenValido(req.headers.authorization, token)) {
        throw new ErroHttp(401, "Não autorizado.");
      }

      switch (rota) {
        case "GET /status":
          return responder(res, 200, cliente.obterStatus());

        case "POST /send-message": {
          const corpo = await lerJson(req);
          const jid = destinatario(corpo);
          const texto = textoObrigatorio(corpo, "text");
          await fila.enfileirar(() => cliente.enviarTexto(jid, texto));
          return responder(res, 200, { ok: true });
        }

        case "POST /send-document": {
          const corpo = await lerJson(req);
          const jid = destinatario(corpo);
          const nome = textoObrigatorio(corpo, "filename");
          const pdf = Buffer.from(textoObrigatorio(corpo, "pdf_base64"), "base64");
          if (pdf.length === 0 || pdf.length > LIMITE_PDF_BYTES) {
            throw new ErroHttp(400, "PDF vazio ou grande demais.");
          }
          if (pdf.subarray(0, 4).toString("latin1") !== "%PDF") {
            throw new ErroHttp(400, "O arquivo não é um PDF.");
          }
          const legenda = typeof corpo.caption === "string" ? corpo.caption : undefined;
          await fila.enfileirar(() => cliente.enviarDocumento(jid, pdf, nome, legenda));
          return responder(res, 200, { ok: true });
        }

        case "POST /logout":
          await cliente.deslogar();
          return responder(res, 200, { ok: true });

        default:
          throw new ErroHttp(404, "Rota inexistente.");
      }
    } catch (erro) {
      if (erro instanceof ErroHttp) {
        return responder(res, erro.codigo, { ok: false, error: erro.message });
      }
      if (erro instanceof NaoConectadoError) {
        return responder(res, 503, { ok: false, error: erro.message });
      }
      return responder(res, 502, { ok: false, error: "Falha ao enviar pelo WhatsApp." });
    }
  });
}
