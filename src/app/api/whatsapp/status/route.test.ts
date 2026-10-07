import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual } = vi.hoisted(() => ({ obterUsuarioAtual: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));

import { GET } from "./route";

describe("GET /api/whatsapp/status", () => {
  const fetchOriginal = globalThis.fetch;
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    process.env.WHATSAPP_WORKER_TOKEN = "token-de-teste-com-mais-de-16-chars";
    globalThis.fetch = vi.fn(async () =>
      Response.json({ status: "connecting", qr_code: "data:image/png;base64,SEGREDO" }),
    ) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    delete process.env.WHATSAPP_WORKER_TOKEN;
  });

  it("sem sessão: 401, sem qr_code e sem falar com o worker", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await GET();
    expect(r.status).toBe(401);
    const texto = await r.text();
    expect(texto).not.toContain("qr_code");
    expect(texto).not.toContain("SEGREDO");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("com sessão: devolve o QR do worker", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    const r = await GET();
    expect(r.status).toBe(200);
    expect((await r.json()).qr_code).toContain("SEGREDO");
  });
});
