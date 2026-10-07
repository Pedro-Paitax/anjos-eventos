import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, carregarDocumentoListaCompras, gerarPdfDoDocumento } = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  carregarDocumentoListaCompras: vi.fn(),
  gerarPdfDoDocumento: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/lista-compras-documento", () => ({
  carregarDocumentoListaCompras,
  gerarPdfDoDocumento,
  nomeArquivoListaCompras: (id: number) => `lista-${id}.pdf`,
}));

import { GET } from "./route";

const chamar = (id = "1") =>
  GET(new Request("http://localhost/agenda/1/lista-compras/pdf"), { params: Promise.resolve({ id }) });

describe("GET /agenda/[id]/lista-compras/pdf", () => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    carregarDocumentoListaCompras.mockReset();
    gerarPdfDoDocumento.mockReset();
  });

  it("sem sessão: 401 JSON, sem dado e sem consultar o evento", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await chamar();
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: "Não autenticado." });
    expect(carregarDocumentoListaCompras).not.toHaveBeenCalled();
  });

  it("evento sem itens confirmados: 409 e nenhum PDF", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    carregarDocumentoListaCompras.mockResolvedValue({ evento: {}, convidados: 10, itens: [] });
    const r = await chamar();
    expect(r.status).toBe(409);
    expect(gerarPdfDoDocumento).not.toHaveBeenCalled();
  });

  it("com sessão e itens: devolve application/pdf", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    carregarDocumentoListaCompras.mockResolvedValue({ evento: {}, convidados: 10, itens: [{}] });
    gerarPdfDoDocumento.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(r.headers.get("content-disposition")).toContain("lista-1.pdf");
  });
});
