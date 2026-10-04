import type { AddressInfo } from "node:net";
import type http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { FilaEnvio } from "./fila-envio.js";
import { criarServidor } from "./servidor.js";
import { NaoConectadoError, type ClienteWhatsapp, type Status } from "./whatsapp.js";

const TOKEN = "token-de-teste-1234567890";

function clienteFalso(status: Status = { status: "connected", qr_code: null }) {
  const chamadas: string[] = [];
  const cliente: ClienteWhatsapp = {
    obterStatus: () => status,
    enviarTexto: async (jid, texto) => {
      if (status.status !== "connected") throw new NaoConectadoError();
      chamadas.push(`texto:${jid}:${texto}`);
    },
    enviarDocumento: async (jid, arquivo, nome) => {
      chamadas.push(`doc:${jid}:${nome}:${arquivo.length}`);
    },
    deslogar: async () => {
      chamadas.push("logout");
    },
  };
  return { cliente, chamadas };
}

let servidor: http.Server | null = null;

async function subir(cliente: ClienteWhatsapp): Promise<string> {
  servidor = criarServidor({ token: TOKEN, cliente, fila: new FilaEnvio(0) });
  await new Promise<void>((ok) => servidor!.listen(0, "127.0.0.1", ok));
  return `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await new Promise((ok) => (servidor ? servidor.close(ok) : ok(null)));
  servidor = null;
});

const auth = { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" };

describe("API do worker", () => {
  it("/health responde sem token", async () => {
    const url = await subir(clienteFalso().cliente);
    const r = await fetch(`${url}/health`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
  });

  it("/status exige token e devolve {status, qr_code}", async () => {
    const url = await subir(clienteFalso({ status: "disconnected", qr_code: "data:image/png;base64,xx" }).cliente);
    expect((await fetch(`${url}/status`)).status).toBe(401);
    const r = await fetch(`${url}/status`, { headers: auth });
    expect(await r.json()).toEqual({ status: "disconnected", qr_code: "data:image/png;base64,xx" });
  });

  it("/send-message envia texto ao JID normalizado", async () => {
    const { cliente, chamadas } = clienteFalso();
    const url = await subir(cliente);
    const r = await fetch(`${url}/send-message`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ to: "+55 00 90000-0000", text: "oi" }),
    });
    expect(r.status).toBe(200);
    expect(chamadas).toEqual(["texto:5500900000000@s.whatsapp.net:oi"]);
  });

  it("/send-message valida destinatário e texto", async () => {
    const url = await subir(clienteFalso().cliente);
    const ruim = await fetch(`${url}/send-message`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ to: "123", text: "oi" }),
    });
    expect(ruim.status).toBe(400);
    const semTexto = await fetch(`${url}/send-message`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ to: "5500900000000" }),
    });
    expect(semTexto.status).toBe(400);
  });

  it("devolve 503 quando o WhatsApp não está conectado", async () => {
    const url = await subir(clienteFalso({ status: "disconnected", qr_code: null }).cliente);
    const r = await fetch(`${url}/send-message`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ to: "5500900000000", text: "oi" }),
    });
    expect(r.status).toBe(503);
  });

  it("/send-document aceita PDF em base64 e rejeita não-PDF", async () => {
    const { cliente, chamadas } = clienteFalso();
    const url = await subir(cliente);
    const pdf = Buffer.from("%PDF-1.4 conteudo").toString("base64");
    const ok = await fetch(`${url}/send-document`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ to: "5500900000000", filename: "ficha.pdf", pdf_base64: pdf }),
    });
    expect(ok.status).toBe(200);
    expect(chamadas).toEqual(["doc:5500900000000@s.whatsapp.net:ficha.pdf:17"]);

    const naoPdf = await fetch(`${url}/send-document`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        to: "5500900000000",
        filename: "x.pdf",
        pdf_base64: Buffer.from("texto qualquer").toString("base64"),
      }),
    });
    expect(naoPdf.status).toBe(400);
  });

  it("/logout aciona o cliente; rota desconhecida dá 404", async () => {
    const { cliente, chamadas } = clienteFalso();
    const url = await subir(cliente);
    expect((await fetch(`${url}/logout`, { method: "POST", headers: auth })).status).toBe(200);
    expect(chamadas).toEqual(["logout"]);
    expect((await fetch(`${url}/nada`, { headers: auth })).status).toBe(404);
  });
});
