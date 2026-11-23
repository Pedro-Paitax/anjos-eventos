import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, carregarDocumentoChecklist, gerarPdfChecklist } = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  carregarDocumentoChecklist: vi.fn(),
  gerarPdfChecklist: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/checklist-carregamento-documento", () => ({
  carregarDocumentoChecklist,
  gerarPdfChecklist,
  nomeArquivoChecklist: (id: number) => `checklist-${id}.pdf`,
  MOTIVO_SEM_PDF: {
    "nao-encontrado": "Evento não encontrado.",
    "nao-churrasco": "Só Senhor Churrasco.",
    "sem-cardapio": "Sem cardápio.",
    "sem-migracao": "Falta a migração 0016.",
  },
}));

import { GET } from "./route";

const chamar = (id = "1") =>
  GET(new Request("http://localhost/agenda/1/checklist-carregamento/pdf"), { params: Promise.resolve({ id }) });

describe("GET /agenda/[id]/checklist-carregamento/pdf", () => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    carregarDocumentoChecklist.mockReset();
    gerarPdfChecklist.mockReset();
  });

  it("sem sessão: 401, sem consultar o evento", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await chamar();
    expect(r.status).toBe(401);
    expect(carregarDocumentoChecklist).not.toHaveBeenCalled();
  });

  it("id inválido: 400", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    expect((await chamar("abc")).status).toBe(400);
  });

  it("sem a migração: 503 explicando, sem PDF", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    carregarDocumentoChecklist.mockResolvedValue({ tipo: "sem-migracao" });
    const r = await chamar();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: "Falta a migração 0016." });
    expect(gerarPdfChecklist).not.toHaveBeenCalled();
  });

  it("sem cardápio confirmado: 409", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    carregarDocumentoChecklist.mockResolvedValue({ tipo: "sem-cardapio" });
    expect((await chamar()).status).toBe(409);
  });

  it("com sessão e dados: devolve application/pdf", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    carregarDocumentoChecklist.mockResolvedValue({ tipo: "ok", evento: {}, dados: {} });
    gerarPdfChecklist.mockResolvedValue(new TextEncoder().encode("%PDF-1.7"));
    const r = await chamar();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/pdf");
    expect(r.headers.get("content-disposition")).toContain("checklist-1.pdf");
  });
});
