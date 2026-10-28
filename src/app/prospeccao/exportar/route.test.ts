import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, listarLeads } = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  listarLeads: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/prospeccao", () => ({ listarLeads }));

import { GET } from "./route";

describe("GET /prospeccao/exportar", () => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    listarLeads.mockReset();
    listarLeads.mockResolvedValue([]);
  });

  it("sem sessão: 401 e não consulta leads", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await GET(new Request("http://localhost/prospeccao/exportar"));
    expect(r.status).toBe(401);
    expect(listarLeads).not.toHaveBeenCalled();
  });

  it("com sessão: CSV para download", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    const r = await GET(new Request("http://localhost/prospeccao/exportar"));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toMatch(/text\/csv/);
    expect(r.headers.get("content-disposition")).toMatch(/attachment; filename="leads-/);
    // BOM (EF BB BF) para o Excel abrir em UTF-8; Response.text() o remove, então confere os bytes.
    const bytes = new Uint8Array(await r.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes)).toMatch(/^id;nome_comercial/);
  });
});
