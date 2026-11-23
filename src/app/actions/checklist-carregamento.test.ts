import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  statusWorker: vi.fn(),
  enviarDocumento: vi.fn(),
  carregar: vi.fn(),
  gerarPdf: vi.fn(),
  numeros: vi.fn(),
  gravar: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual: m.obterUsuarioAtual }));
vi.mock("@/lib/whatsapp-worker", () => ({ statusWorker: m.statusWorker, enviarDocumento: m.enviarDocumento }));
vi.mock("@/lib/automacao-whatsapp", () => ({ numerosFamilia: m.numeros }));
vi.mock("@/lib/checklist-carregamento-dados", () => ({ gravarItensCargaFicha: m.gravar }));
vi.mock("@/lib/checklist-carregamento-documento", () => ({
  carregarDocumentoChecklist: m.carregar,
  gerarPdfChecklist: m.gerarPdf,
  nomeArquivoChecklist: () => "checklist.pdf",
  MOTIVO_SEM_PDF: { "sem-migracao": "Falta a migração 0016.", "sem-cardapio": "Sem cardápio." },
}));

import { enviarChecklistAction, salvarItensCargaFichaAction } from "./checklist-carregamento";

const NUMEROS = ["5511900000001", "5511900000002"];
const documento = { tipo: "ok", evento: { cliente: "Cliente" }, dados: { data: "sáb, 12/12/2026" } };

describe("enviarChecklistAction", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    m.obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    m.numeros.mockReturnValue(NUMEROS);
    m.carregar.mockResolvedValue(documento);
    m.statusWorker.mockResolvedValue({ status: "connected" });
    m.gerarPdf.mockResolvedValue(new Uint8Array([1]));
  });

  it("sem sessão: redireciona e não envia", async () => {
    m.obterUsuarioAtual.mockResolvedValue(null);
    await expect(enviarChecklistAction(1)).rejects.toThrow("NEXT_REDIRECT");
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("sem números da família: erro, nada enviado", async () => {
    m.numeros.mockReturnValue([]);
    expect(await enviarChecklistAction(1)).toMatchObject({ tipo: "erro" });
    expect(m.carregar).not.toHaveBeenCalled();
  });

  it("sem a migração: explica e não envia", async () => {
    m.carregar.mockResolvedValue({ tipo: "sem-migracao" });
    expect(await enviarChecklistAction(1)).toEqual({ tipo: "erro", mensagem: "Falta a migração 0016." });
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("WhatsApp desconectado: nada enviado", async () => {
    m.statusWorker.mockResolvedValue({ status: "disconnected" });
    expect(await enviarChecklistAction(1)).toMatchObject({ tipo: "erro" });
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("envia o mesmo PDF a cada número da família e conta as falhas", async () => {
    m.enviarDocumento.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("http://worker"));
    const r = await enviarChecklistAction(7);
    expect(r).toEqual({ tipo: "concluido", enviados: 1, falhas: 1 });
    expect(m.gerarPdf).toHaveBeenCalledTimes(1);
    expect(m.enviarDocumento.mock.calls.map((c) => c[0])).toEqual(NUMEROS);
    expect(m.enviarDocumento.mock.calls[0][3]).toBe("Checklist de carregamento - Cliente, sáb, 12/12/2026");
  });
});

describe("salvarItensCargaFichaAction", () => {
  beforeEach(() => {
    m.obterUsuarioAtual.mockReset().mockResolvedValue({ id: 1, nome: "Pedro" });
    m.gravar.mockReset();
  });

  const form = (...ids: string[]) => {
    const f = new FormData();
    ids.forEach((id) => f.append("itemCargaId", id));
    return f;
  };

  it("grava os ids marcados, sem repetição nem lixo", async () => {
    m.gravar.mockResolvedValue(true);
    const r = await salvarItensCargaFichaAction(5, { status: "inicial" }, form("3", "3", "x", "8"));
    expect(r.status).toBe("salvo");
    expect(m.gravar).toHaveBeenCalledWith(5, [3, 8]);
  });

  it("sem a migração: avisa e não grava", async () => {
    m.gravar.mockResolvedValue(false);
    const r = await salvarItensCargaFichaAction(5, { status: "inicial" }, form("3"));
    expect(r).toEqual({ status: "erro", mensagem: "Falta a migração 0016 do banco. Nada foi gravado." });
  });
});
