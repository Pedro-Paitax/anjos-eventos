import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErroWorker, enviarTexto } from "./whatsapp-worker";

describe("cliente do worker — erros com status", () => {
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_WORKER_TOKEN", "token-de-teste-1234567890");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("devolve o status HTTP do worker em ErroWorker (503 = desconectado, 422 = sem WhatsApp)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: false, error: "Número sem WhatsApp." }), { status: 422 })));
    const erro = await enviarTexto("5500900000000", "oi").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroWorker);
    expect((erro as ErroWorker).status).toBe(422);
    expect((erro as ErroWorker).message).toBe("Número sem WhatsApp.");
  });

  it("falha de rede ou timeout vira ErroWorker com status null (resultado incerto)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const erro = await enviarTexto("5500900000000", "oi").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroWorker);
    expect((erro as ErroWorker).status).toBeNull();
  });

  it("envia com Bearer e sem vazar o telefone na mensagem de erro", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    await enviarTexto("5500900000000", "oi");
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer token-de-teste-1234567890");
  });
});
