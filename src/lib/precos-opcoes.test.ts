import { describe, expect, it } from "vitest";
import { diasEntre, formatarDiaCurto, hojeNaEquipe, idadeTexto, idsMenorPreco } from "./precos-opcoes";

describe("idsMenorPreco", () => {
  it("marca o menor preço por insumo só quando há dois fornecedores ou mais", () => {
    const ids = idsMenorPreco([
      { id: 1, insumoId: 10, fornecedorId: 1, preco: 89.9 },
      { id: 2, insumoId: 10, fornecedorId: 1, preco: 79.9 }, // Picanha 2 do mesmo fornecedor
      { id: 3, insumoId: 10, fornecedorId: 2, preco: 84.5 },
      { id: 4, insumoId: 20, fornecedorId: 1, preco: 5 }, // só um fornecedor: sem selo
      { id: 5, insumoId: null, fornecedorId: 3, preco: 1 }, // sem insumo ligado: fora
    ]);
    expect([...ids]).toEqual([2]);
  });

  it("empate marca os dois", () => {
    const ids = idsMenorPreco([
      { id: 1, insumoId: 1, fornecedorId: 1, preco: 10 },
      { id: 2, insumoId: 1, fornecedorId: 2, preco: 10 },
    ]);
    expect([...ids].sort()).toEqual([1, 2]);
  });
});

describe("datas", () => {
  it("conta dias de calendário sem depender de fuso", () => {
    expect(diasEntre("2026-10-31", "2026-11-02")).toBe(2);
    expect(diasEntre("2026-11-02", "2026-11-02")).toBe(0);
  });
  it("texto de idade", () => {
    expect(idadeTexto(0)).toBe("hoje");
    expect(idadeTexto(1)).toBe("ontem");
    expect(idadeTexto(12)).toBe("há 12 dias");
    expect(idadeTexto(95)).toBe("há 3 meses");
  });
  it("formata dia curto", () => {
    expect(formatarDiaCurto("2026-02-05")).toBe("05/02/2026");
  });
  it("hoje no fuso de São Paulo", () => {
    // 01:30 UTC de 3/11 ainda é 2/11 em São Paulo.
    expect(hojeNaEquipe(new Date("2026-11-03T01:30:00Z"))).toBe("2026-11-02");
  });
});

describe("regras decididas pelo Pedro (2026-11-02)", () => {
  it("cadastro = fornecedor + 10 %, em centavos", async () => {
    const { precoComMargem } = await import("./precos-opcoes");
    expect(precoComMargem(84.5)).toBe(92.95);
    expect(precoComMargem(6.38)).toBe(7.02);
    expect(precoComMargem(10)).toBe(11);
  });
  it("mais de 14 dias = desatualizado; 14 ainda está em dia", async () => {
    const { estadoPreco } = await import("./precos-opcoes");
    expect(estadoPreco("2026-10-19", "2026-11-02")).toBe("em_dia");
    expect(estadoPreco("2026-10-18", "2026-11-02")).toBe("desatualizado");
    expect(estadoPreco(null, "2026-11-02")).toBe("sem_data");
  });
});
