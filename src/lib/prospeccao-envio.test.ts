import { describe, expect, it } from "vitest";
import {
  classificarFalhaWorker,
  decidirRodada,
  dentroDoHorarioComercial,
  diaSaoPaulo,
  liberacaoValida,
  motivoLeadNaoElegivel,
  telefoneParaEnvio,
  type ConfigEnvio,
  type LeadParaEnvio,
} from "./prospeccao-envio";

// 2026-10-28 é uma quarta-feira. São Paulo = UTC-3 (sem horário de verão desde 2019).
const QUARTA_10H = new Date("2026-10-28T13:00:00Z");
const QUARTA_08H = new Date("2026-10-28T11:00:00Z");
const QUARTA_18H = new Date("2026-10-28T21:00:00Z");
const SABADO_10H = new Date("2026-10-31T13:00:00Z");

const configOk: ConfigEnvio = {
  ativo: true,
  limiteDiario: 10,
  nomeRemetente: "Pedro",
  modelo: { gerador: "gemini", canal: "whatsapp", aprovada: true },
};

const leadOk: LeadParaEnvio = {
  status: "pronto_para_contato",
  naoContatar: false,
  telefone: "5500900000000",
  jaContatado: false,
};

describe("horário e dia", () => {
  it("janela comercial seg–sex 09:00–17:59 em São Paulo", () => {
    expect(dentroDoHorarioComercial(QUARTA_10H)).toBe(true);
    expect(dentroDoHorarioComercial(QUARTA_08H)).toBe(false);
    expect(dentroDoHorarioComercial(QUARTA_18H)).toBe(false);
    expect(dentroDoHorarioComercial(SABADO_10H)).toBe(false);
  });
  it("o dia vira à meia-noite de São Paulo, não de UTC", () => {
    expect(diaSaoPaulo(new Date("2026-10-29T02:59:00Z"))).toBe("2026-10-28");
    expect(diaSaoPaulo(new Date("2026-10-29T03:00:00Z"))).toBe("2026-10-29");
  });
});

describe("telefoneParaEnvio", () => {
  it("aceita 55 + DDD + 8 ou 9 dígitos, ignorando máscara", () => {
    expect(telefoneParaEnvio("+55 (00) 90000-0000")).toBe("5500900000000");
    expect(telefoneParaEnvio("550090000000")).toBe("550090000000");
  });
  it("recusa sem DDI, curto, longo ou vazio", () => {
    expect(telefoneParaEnvio("00900000000")).toBeNull();
    expect(telefoneParaEnvio("5500900")).toBeNull();
    expect(telefoneParaEnvio("55009000000000")).toBeNull();
    expect(telefoneParaEnvio(null)).toBeNull();
  });
});

describe("motivoLeadNaoElegivel", () => {
  it("libera lead comum", () => expect(motivoLeadNaoElegivel(leadOk)).toBeNull());
  it("bloqueia não contatar, status já abordado, já contatado e telefone ruim", () => {
    expect(motivoLeadNaoElegivel({ ...leadOk, naoContatar: true })).toMatch(/não contatar/);
    expect(motivoLeadNaoElegivel({ ...leadOk, status: "contatado" })).toMatch(/abordado/);
    expect(motivoLeadNaoElegivel({ ...leadOk, status: "sem_interesse" })).toMatch(/abordado/);
    expect(motivoLeadNaoElegivel({ ...leadOk, jaContatado: true })).toMatch(/já recebeu/);
    expect(motivoLeadNaoElegivel({ ...leadOk, telefone: null })).toMatch(/Telefone/);
  });
});

describe("liberacaoValida", () => {
  it("exige ativo, remetente e mensagem-modelo do Gemini, de WhatsApp, aprovada", () => {
    expect(liberacaoValida(configOk)).toBe(true);
    expect(liberacaoValida(null)).toBe(false);
    expect(liberacaoValida({ ...configOk, ativo: false })).toBe(false);
    expect(liberacaoValida({ ...configOk, nomeRemetente: " " })).toBe(false);
    expect(liberacaoValida({ ...configOk, modelo: null })).toBe(false);
    expect(liberacaoValida({ ...configOk, modelo: { gerador: "modelo_local", canal: "whatsapp", aprovada: true } })).toBe(false);
    expect(liberacaoValida({ ...configOk, modelo: { gerador: "gemini", canal: "email", aprovada: true } })).toBe(false);
    expect(liberacaoValida({ ...configOk, modelo: { gerador: "gemini", canal: "whatsapp", aprovada: false } })).toBe(false);
  });
});

describe("decidirRodada", () => {
  const base = { config: configOk, workerConectado: true, enviadosHoje: 0, agora: QUARTA_10H };
  it("processa quando tudo está certo", () => expect(decidirRodada(base)).toEqual({ processar: true }));
  it("não processa desligado, fora do horário, sem WhatsApp ou no limite", () => {
    expect(decidirRodada({ ...base, config: { ...configOk, ativo: false } }).processar).toBe(false);
    expect(decidirRodada({ ...base, agora: SABADO_10H }).processar).toBe(false);
    expect(decidirRodada({ ...base, workerConectado: false }).processar).toBe(false);
    expect(decidirRodada({ ...base, enviadosHoje: 10 }).processar).toBe(false);
    expect(decidirRodada({ ...base, enviadosHoje: 9 }).processar).toBe(true);
  });
  it("nunca passa de 10 por dia, mesmo com configuração maior", () => {
    expect(decidirRodada({ ...base, config: { ...configOk, limiteDiario: 50 }, enviadosHoje: 10 }).processar).toBe(false);
  });
});

describe("classificarFalhaWorker", () => {
  it("503 volta à fila; 422 descarta; o resto vai para conferência (nunca reenvia sozinho)", () => {
    expect(classificarFalhaWorker(503)).toBe("tentar_depois");
    expect(classificarFalhaWorker(422)).toBe("descartar_lead");
    expect(classificarFalhaWorker(502)).toBe("conferir");
    expect(classificarFalhaWorker(null)).toBe("conferir");
  });
});
