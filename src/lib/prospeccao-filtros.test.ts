import { describe, expect, it } from "vitest";
import { filtrarLeads, municipiosDistintos, temCanalUtilizavel, type LeadFiltravel } from "./prospeccao-filtros";

const lead = (x: Partial<LeadFiltravel> & { id: number }): LeadFiltravel & { id: number } => ({
  nomeComercial: "Lead",
  segmento: null,
  categoria: "cervejaria",
  municipio: "Curitiba",
  status: "novo",
  naoContatar: false,
  telefone: null,
  instagram: null,
  email: null,
  prioridade: null,
  pontuacao: null,
  confianca: null,
  ...x,
});

const leads = [
  lead({ id: 1, nomeComercial: "Cervejaria Água Viva", telefone: "5541999998888", prioridade: "A", pontuacao: 85 }),
  lead({ id: 2, nomeComercial: "Espaço Verde", categoria: "espaco_eventos", municipio: "São José dos Pinhais", prioridade: "C", pontuacao: 45 }),
  lead({ id: 3, nomeComercial: "Bar Bloqueado", categoria: "bar_restaurante", instagram: "x", naoContatar: true, status: "nao_contatar" }),
];

describe("filtrarLeads", () => {
  it("busca sem acento e sem caixa", () => {
    expect(filtrarLeads(leads, { busca: "agua" }).map((l) => l.id)).toEqual([1]);
  });

  it("município ignora caixa/acento; prioridade 'sem' = nunca qualificado", () => {
    expect(filtrarLeads(leads, { municipio: "sao jose dos pinhais" }).map((l) => l.id)).toEqual([2]);
    expect(filtrarLeads(leads, { prioridade: "sem" }).map((l) => l.id)).toEqual([3]);
  });

  it("canal: lead bloqueado não tem canal utilizável", () => {
    expect(temCanalUtilizavel(leads[2])).toBe(false);
    expect(filtrarLeads(leads, { canal: "com" }).map((l) => l.id)).toEqual([1]);
    expect(filtrarLeads(leads, { canal: "sem" }).map((l) => l.id)).toEqual([2, 3]);
  });

  it("ordem por pontuação deixa não qualificados no fim", () => {
    expect(filtrarLeads([leads[2], leads[1], leads[0]], { ordem: "pontuacao" }).map((l) => l.id)).toEqual([1, 2, 3]);
  });
});

describe("municipiosDistintos", () => {
  it("dedup por caixa/acento e ordena", () => {
    expect(
      municipiosDistintos([{ municipio: "Curitiba" }, { municipio: "curitiba" }, { municipio: "Araucária" }, { municipio: null }]),
    ).toEqual(["Araucária", "Curitiba"]);
  });
});
