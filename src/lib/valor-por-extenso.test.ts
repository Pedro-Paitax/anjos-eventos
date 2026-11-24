import { describe, expect, it } from "vitest";
import { inteiroPorExtenso, valorPorExtenso } from "@/lib/valor-por-extenso";

describe("valorPorExtenso", () => {
  it.each([
    [6700, "seis mil e setecentos reais"],
    [1675, "mil seiscentos e setenta e cinco reais"],
    [5025, "cinco mil e vinte e cinco reais"],
    [13110, "treze mil cento e dez reais"],
    [21000, "vinte e um mil reais"],
    [47.5, "quarenta e sete reais e cinquenta centavos"],
    [100, "cem reais"],
    [101, "cento e um reais"],
    [1, "um real"],
    [0.01, "um centavo"],
    [0, "zero reais"],
    [2_000_000, "dois milhões de reais"],
    [1_500_000, "um milhão e quinhentos mil reais"],
  ])("%s → %s", (valor, esperado) => {
    expect(valorPorExtenso(valor)).toBe(esperado);
  });
});

describe("inteiroPorExtenso", () => {
  it("concorda no feminino", () => {
    expect(inteiroPorExtenso(1, true)).toBe("uma");
    expect(inteiroPorExtenso(2, true)).toBe("duas");
    expect(inteiroPorExtenso(200, true)).toBe("duzentas");
    expect(inteiroPorExtenso(3)).toBe("três");
  });

  it("recusa números fora do intervalo", () => {
    expect(() => inteiroPorExtenso(-1)).toThrow(RangeError);
    expect(() => inteiroPorExtenso(1.5)).toThrow(RangeError);
  });
});
