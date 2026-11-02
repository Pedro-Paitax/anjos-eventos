import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  celulasDoMes,
  diaSelecionado,
  interpretarMes,
  mesAdjacente,
} from "./calendario-agenda";

const dias = (ano: number, mes: number) => celulasDoMes(ano, mes).filter(Boolean).length;
const vazios = (ano: number, mes: number) => celulasDoMes(ano, mes).filter((c) => c === null).length;

describe("celulasDoMes", () => {
  it("outubro/2026 começa numa quinta: 4 vazios antes, 31 dias, fecha em múltiplo de 7", () => {
    const c = celulasDoMes(2026, 9);
    expect(c.slice(0, 4)).toEqual([null, null, null, null]);
    expect(c[4]).toEqual({ dia: 1 });
    expect(dias(2026, 9)).toBe(31);
    expect(c.length % 7).toBe(0);
  });
  it("mês que começa no domingo não tem vazio no início (fevereiro/2026: 28 dias, 4 semanas exatas)", () => {
    const c = celulasDoMes(2026, 1);
    expect(c[0]).toEqual({ dia: 1 });
    expect(c).toHaveLength(28);
  });
  it("mês que começa no sábado tem 6 vazios no início (agosto/2026) e 6 semanas", () => {
    const c = celulasDoMes(2026, 7);
    expect(c.slice(0, 6).every((x) => x === null)).toBe(true);
    expect(c[6]).toEqual({ dia: 1 });
    expect(c).toHaveLength(42);
  });
  it("fevereiro bissexto tem 29 dias", () => {
    expect(dias(2028, 1)).toBe(29);
    expect(dias(2027, 1)).toBe(28);
  });
  it("sempre fecha a semana", () => {
    for (let m = 0; m < 12; m++) expect((dias(2026, m) + vazios(2026, m)) % 7).toBe(0);
  });
});

describe("agruparPorDia", () => {
  const ev = (id: number, local: string) => ({ id, data_evento: new Date(local).toISOString() });
  it("agrupa pelo dia local e ordena por horário", () => {
    const m = agruparPorDia([ev(1, "2026-10-29T15:00:00"), ev(2, "2026-10-29T09:11:00"), ev(3, "2026-10-10T12:00:00")], 2026, 9);
    expect(m.get(29)?.map((e) => e.id)).toEqual([2, 1]);
    expect(m.get(10)?.map((e) => e.id)).toEqual([3]);
  });
  it("evento perto da meia-noite fica no dia local certo", () => {
    const m = agruparPorDia([ev(1, "2026-10-31T23:30:00"), ev(2, "2026-11-01T00:00:00")], 2026, 9);
    expect([...m.keys()]).toEqual([31]);
  });
  it("ignora outros meses e mês sem evento dá mapa vazio", () => {
    expect(agruparPorDia([ev(1, "2026-09-30T12:00:00")], 2026, 9).size).toBe(0);
  });
});

describe("diaSelecionado", () => {
  it("aceita dia existente e recusa lixo ou dia fora do mês", () => {
    expect(diaSelecionado("29", 2026, 9)).toBe(29);
    expect(diaSelecionado("31", 2026, 8)).toBeNull(); // setembro tem 30
    expect(diaSelecionado("0", 2026, 9)).toBeNull();
    expect(diaSelecionado("abc", 2026, 9)).toBeNull();
    expect(diaSelecionado(undefined, 2026, 9)).toBeNull();
  });
});

describe("interpretarMes e mesAdjacente", () => {
  const hoje = new Date(2026, 9, 29);
  it("lê AAAA-MM; inválido cai no mês de hoje", () => {
    expect(interpretarMes("2026-02", hoje)).toEqual({ ano: 2026, mesIndice: 1 });
    expect(interpretarMes("2026-13", hoje)).toEqual({ ano: 2026, mesIndice: 9 });
    expect(interpretarMes("lixo", hoje)).toEqual({ ano: 2026, mesIndice: 9 });
    expect(interpretarMes(undefined, hoje)).toEqual({ ano: 2026, mesIndice: 9 });
  });
  it("vira o ano nas pontas", () => {
    expect(mesAdjacente(2026, 11, 1)).toBe("2027-01");
    expect(mesAdjacente(2026, 0, -1)).toBe("2025-12");
  });
});
