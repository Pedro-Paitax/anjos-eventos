import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  statusWorker: vi.fn(),
  enviarDocumento: vi.fn(),
  enviarTexto: vi.fn(),
  carregar: vi.fn(),
  gerarPdf: vi.fn(),
  ultimoEnvio: vi.fn(),
  registrar: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual: m.obterUsuarioAtual }));
vi.mock("@/lib/whatsapp-worker", () => ({
  statusWorker: m.statusWorker,
  enviarDocumento: m.enviarDocumento,
  enviarTexto: m.enviarTexto,
}));
vi.mock("@/lib/lista-compras-documento", () => ({
  carregarDocumentoListaCompras: m.carregar,
  gerarPdfDoDocumento: m.gerarPdf,
  nomeArquivoListaCompras: () => "lista.pdf",
}));
vi.mock("@/lib/lista-compras-envio", () => ({
  destinoListaCompras: () => process.env.LISTA_COMPRAS_WHATSAPP ?? null,
  obterUltimoEnvioListaCompras: m.ultimoEnvio,
  registrarEnvioListaCompras: m.registrar,
}));

import { enviarListaComprasAction } from "./lista-compras";

const NUMERO = "5511999990000";
const documento = {
  evento: { cliente: "Cliente", data_evento: "2026-10-03T15:00:00Z" },
  convidados: 10,
  itens: [{ nome: "Tomate" }],
};

describe("enviarListaComprasAction", () => {
  beforeEach(() => {
    Object.values(m).forEach((f) => f.mockReset());
    m.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    process.env.LISTA_COMPRAS_WHATSAPP = NUMERO;
    m.obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    m.carregar.mockResolvedValue(documento);
    m.ultimoEnvio.mockResolvedValue(null);
    m.statusWorker.mockResolvedValue({ status: "connected", qr_code: null });
    m.gerarPdf.mockResolvedValue(new Uint8Array([1]));
    m.enviarDocumento.mockResolvedValue(undefined);
    m.enviarTexto.mockResolvedValue(undefined);
    m.registrar.mockResolvedValue(true);
  });

  it("sem usuário: redireciona e não faz nada", async () => {
    m.obterUsuarioAtual.mockResolvedValue(null);
    await expect(enviarListaComprasAction(1, false)).rejects.toThrow("NEXT_REDIRECT");
    expect(m.carregar).not.toHaveBeenCalled();
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("sem destino configurado: erro e nada enviado", async () => {
    delete process.env.LISTA_COMPRAS_WHATSAPP;
    expect((await enviarListaComprasAction(1, false)).tipo).toBe("erro");
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("evento sem itens confirmados: erro, sem PDF", async () => {
    m.carregar.mockResolvedValue({ ...documento, itens: [] });
    expect((await enviarListaComprasAction(1, false)).tipo).toBe("erro");
    expect(m.gerarPdf).not.toHaveBeenCalled();
  });

  it("worker sem resposta ou desconectado: não tenta enviar", async () => {
    m.statusWorker.mockResolvedValue(null);
    expect((await enviarListaComprasAction(1, false)).tipo).toBe("erro");
    m.statusWorker.mockResolvedValue({ status: "disconnected", qr_code: null });
    expect((await enviarListaComprasAction(1, false)).tipo).toBe("erro");
    expect(m.enviarDocumento).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
  });

  it("já enviado e sem confirmação: pede confirmação e não envia", async () => {
    m.ultimoEnvio.mockResolvedValue("2026-10-06T10:00:00.000Z");
    const r = await enviarListaComprasAction(1, false);
    expect(r).toEqual({ tipo: "confirmar-reenvio", ultimoEnvio: "2026-10-06T10:00:00.000Z" });
    expect(m.enviarDocumento).not.toHaveBeenCalled();
  });

  it("reenvio confirmado: envia", async () => {
    m.ultimoEnvio.mockResolvedValue("2026-10-06T10:00:00.000Z");
    const r = await enviarListaComprasAction(1, true);
    expect(r.tipo).toBe("concluido");
    expect(m.enviarDocumento).toHaveBeenCalledOnce();
  });

  it("sucesso: PDF primeiro, depois texto; grava o envio", async () => {
    const ordem: string[] = [];
    m.enviarDocumento.mockImplementation(async () => void ordem.push("pdf"));
    m.registrar.mockImplementation(async () => (ordem.push("grava"), true));
    m.enviarTexto.mockImplementation(async () => void ordem.push("texto"));
    const r = await enviarListaComprasAction(1, false);
    expect(ordem).toEqual(["pdf", "grava", "texto"]);
    expect(r).toMatchObject({ tipo: "concluido", gravado: true, pdf: { ok: true }, texto: { ok: true } });
  });

  it("PDF falha: não grava, não manda texto e o retorno não traz o número", async () => {
    m.enviarDocumento.mockRejectedValue(new Error(`falha para ${NUMERO}`));
    const r = await enviarListaComprasAction(1, false);
    expect(r).toMatchObject({ tipo: "concluido", gravado: false, pdf: { ok: false }, texto: null });
    expect(m.registrar).not.toHaveBeenCalled();
    expect(m.enviarTexto).not.toHaveBeenCalled();
    expect(JSON.stringify(r)).not.toContain(NUMERO);
  });

  it("texto falha depois do PDF: envio continua gravado", async () => {
    m.enviarTexto.mockRejectedValue(new Error("x"));
    const r = await enviarListaComprasAction(1, false);
    expect(r).toMatchObject({ pdf: { ok: true }, texto: { ok: false }, gravado: true });
  });
});
