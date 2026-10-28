import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  identidadesLeads: vi.fn(),
  criarLead: vi.fn(),
  obterLead: vi.fn(),
  criarMensagem: vi.fn(),
  confirmarEnvio: vi.fn(),
  importarLeads: vi.fn(),
  listarEvidencias: vi.fn(),
  registrarQualificacao: vi.fn(),
  criarEvidencia: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual: m.obterUsuarioAtual }));
vi.mock("@/lib/prospeccao", () => ({
  identidadesLeads: m.identidadesLeads,
  criarLead: m.criarLead,
  obterLead: m.obterLead,
  criarMensagem: m.criarMensagem,
  confirmarEnvio: m.confirmarEnvio,
  importarLeads: m.importarLeads,
  listarEvidencias: m.listarEvidencias,
  registrarQualificacao: m.registrarQualificacao,
  criarEvidencia: m.criarEvidencia,
}));

import {
  criarLeadAction,
  gerarMensagemAction,
  confirmarEnvioAction,
  importarCsvAction,
  qualificarAction,
  criarEvidenciaAction,
} from "./prospeccao";

const fd = (campos: Record<string, string | string[]>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const x of [v].flat()) f.append(k, x);
  return f;
};

const leadBase = {
  id: 5,
  nomeComercial: "Casa X",
  categoria: "cervejaria",
  naoContatar: false,
  telefone: "5541999998888",
  instagram: null,
  email: null,
};

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.redirect.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  });
  m.obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
  m.identidadesLeads.mockResolvedValue([]);
  m.criarLead.mockResolvedValue(10);
  m.obterLead.mockResolvedValue(leadBase);
  m.criarMensagem.mockResolvedValue({ ok: true });
  m.confirmarEnvio.mockResolvedValue({ ok: true });
  m.listarEvidencias.mockResolvedValue([]);
});

describe("sessão", () => {
  it("sem usuário: redireciona para /login e não grava", async () => {
    m.obterUsuarioAtual.mockResolvedValue(null);
    await expect(criarLeadAction({}, fd({ nome_comercial: "A", categoria: "bar" }))).rejects.toThrow("NEXT_REDIRECT /login");
    expect(m.criarLead).not.toHaveBeenCalled();
  });
});

describe("criarLeadAction", () => {
  it("valida e normaliza antes de gravar", async () => {
    const r = await criarLeadAction({}, fd({ nome_comercial: "A", categoria: "xyz", telefone: "123" }));
    expect(r.erro).toMatch(/categoria inválida/);
    expect(r.erro).toMatch(/telefone inválido/);
    expect(m.criarLead).not.toHaveBeenCalled();
  });

  it("possível duplicata exige confirmação explícita", async () => {
    m.identidadesLeads.mockResolvedValue([
      { id: 3, nomeComercial: "Outro", municipio: null, site: null, telefone: "554133334444", instagram: null, email: null },
    ]);
    const campos = { nome_comercial: "Bar A", categoria: "bar", telefone: "(41) 3333-4444" };
    const r = await criarLeadAction({}, fd(campos));
    expect(r.duplicatas?.[0]).toMatchObject({ id: 3, nivel: "forte" });
    expect(m.criarLead).not.toHaveBeenCalled();

    await expect(criarLeadAction({}, fd({ ...campos, confirmar_nao_duplicata: "on" }))).rejects.toThrow(
      "NEXT_REDIRECT /prospeccao/10",
    );
    expect(m.criarLead.mock.calls[0][0]).toMatchObject({ telefone: "554133334444", categoria: "bar_restaurante" });
  });
});

describe("gerarMensagemAction", () => {
  it("lead bloqueado: não gera", async () => {
    m.obterLead.mockResolvedValue({ ...leadBase, naoContatar: true });
    const r = await gerarMensagemAction(5, {}, fd({ canal: "whatsapp", objetivo: "x" }));
    expect(r.erro).toMatch(/não contatar/);
    expect(m.criarMensagem).not.toHaveBeenCalled();
  });

  it("canal sem contato cadastrado: não gera", async () => {
    const r = await gerarMensagemAction(5, {}, fd({ canal: "email", objetivo: "x" }));
    expect(r.erro).toMatch(/não tem contato/);
  });

  it("gera em revisão, sem fatos inventados, assinada pelo usuário", async () => {
    const r = await gerarMensagemAction(5, {}, fd({ canal: "whatsapp", objetivo: "Parceria" }));
    expect(r.sucesso).toBeDefined();
    const msg = m.criarMensagem.mock.calls[0][0];
    expect(msg).toMatchObject({ leadId: 5, canal: "whatsapp", gerador: "modelo_local", fatosUsados: [], usuarioId: 1 });
    expect(msg.conteudo).toContain("Aqui é Pedro, da Anjos Eventos.");
  });
});

describe("confirmarEnvioAction", () => {
  it("sem a caixa de confirmação não registra envio", async () => {
    const r = await confirmarEnvioAction(5, 9, {}, fd({}));
    expect(r.erro).toMatch(/confirmação/);
    expect(m.confirmarEnvio).not.toHaveBeenCalled();
  });

  it("com confirmação registra com o usuário atual", async () => {
    await confirmarEnvioAction(5, 9, {}, fd({ confirmo: "on" }));
    expect(m.confirmarEnvio).toHaveBeenCalledWith(5, 9, 1);
  });
});

describe("criarEvidenciaAction", () => {
  it("inferência não pode entrar como verificada", async () => {
    const r = await criarEvidenciaAction(
      5,
      {},
      fd({ fonte: "Site", fato: "Deve ter espaço externo", consultado_em: "2026-10-28", tipo: "site_oficial", natureza: "inferencia", confianca: "baixa", verificacao: "verificado", campo: "" }),
    );
    expect(r.erro).toMatch(/Inferência/);
    expect(m.criarEvidencia).not.toHaveBeenCalled();
  });
});

describe("qualificarAction", () => {
  it("só aceita evidências do próprio lead e grava a pontuação calculada", async () => {
    m.listarEvidencias.mockResolvedValue([{ id: 1 }]);
    const r = await qualificarAction(
      5,
      {},
      fd({
        pontos_compatibilidade: "25", justificativa_compatibilidade: "cardápio", confianca_compatibilidade: "alta",
        evidencias_compatibilidade: ["1", "999"],
        pontos_demanda: "20", justificativa_demanda: "eventos", confianca_demanda: "alta", evidencias_demanda: "1",
        pontos_viabilidade: "", pontos_potencial: "10", justificativa_potencial: "x", confianca_potencial: "media", evidencias_potencial: "1",
        pontos_canal: "10", justificativa_canal: "tel", confianca_canal: "alta", evidencias_canal: "1",
      }),
    );
    expect(r.sucesso).toMatch(/65 pontos/);
    const [, dims, resultado] = m.registrarQualificacao.mock.calls[0];
    expect(dims[0].evidenciaIds).toEqual([1]);
    expect(dims[2].pontos).toBeNull();
    expect(resultado).toMatchObject({ pontuacao: 65, pontuacaoMaxima: 85, prioridade: "B", provisoria: true });
  });
});

describe("importarCsvAction", () => {
  it("reanalisa na hora de importar: duplicata forte nunca entra, possível só marcada", async () => {
    m.identidadesLeads.mockResolvedValue([
      { id: 3, nomeComercial: "Casa Y", municipio: "Curitiba", site: "https://y.com.br", telefone: null, instagram: null, email: null },
    ]);
    m.importarLeads.mockResolvedValue(2);
    const csv = [
      "nome_comercial;categoria;municipio;site",
      "Nova;bar;Curitiba;",
      "Outra;bar;Curitiba;y.com.br",
      "Casa Y;bar;Curitiba;",
    ].join("\n");
    await expect(importarCsvAction({}, fd({ csv, forcar: ["3", "4"] }))).rejects.toThrow("NEXT_REDIRECT /prospeccao?importados=2");
    const nomes = m.importarLeads.mock.calls[0][0].map((l: { dados: { nomeComercial: string } }) => l.dados.nomeComercial);
    expect(nomes).toEqual(["Nova", "Casa Y"]);
  });
});
