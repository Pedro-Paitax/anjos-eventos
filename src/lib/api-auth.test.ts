import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual } = vi.hoisted(() => ({ obterUsuarioAtual: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));

import { exigirUsuarioApi, tokenServicoValido } from "@/lib/api-auth";

const TOKEN = "token-de-teste-com-mais-de-16-chars";
const req = (cabecalhos: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", { headers: cabecalhos });

describe("exigirUsuarioApi", () => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    delete process.env.SMOKE_TOKEN;
  });
  afterEach(() => {
    delete process.env.SMOKE_TOKEN;
  });

  it("sem usuário e sem token: 401 JSON, sem dado", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await exigirUsuarioApi(req());
    expect(r?.status).toBe(401);
    expect(await r?.json()).toEqual({ erro: "Não autenticado." });
  });

  it("com usuário logado: autorizado (null)", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    expect(await exigirUsuarioApi(req())).toBeNull();
  });

  it("token de serviço válido autoriza sem consultar usuário", async () => {
    process.env.SMOKE_TOKEN = TOKEN;
    expect(await exigirUsuarioApi(req({ "x-smoke-token": TOKEN }))).toBeNull();
    expect(obterUsuarioAtual).not.toHaveBeenCalled();
  });

  it("token errado ou de tamanho diferente: 401", async () => {
    process.env.SMOKE_TOKEN = TOKEN;
    obterUsuarioAtual.mockResolvedValue(null);
    expect((await exigirUsuarioApi(req({ "x-smoke-token": TOKEN + "x" })))?.status).toBe(401);
    expect(
      (await exigirUsuarioApi(req({ "x-smoke-token": "x".repeat(TOKEN.length) })))?.status
    ).toBe(401);
  });

  it("sem SMOKE_TOKEN no servidor (ou curto), nenhum token vale", () => {
    expect(tokenServicoValido(req({ "x-smoke-token": "" }))).toBe(false);
    process.env.SMOKE_TOKEN = "curto";
    expect(tokenServicoValido(req({ "x-smoke-token": "curto" }))).toBe(false);
  });
});
