import { describe, expect, it } from "vitest";
import { custoDoItem } from "@/lib/custo-item-cardapio";

describe("custoDoItem", () => {
  // Preparos reais de produção (2026-11-04): custo da ficha por 1000 g e volume = 133,33 g x 30 convidados.
  it("Alcatra Grelhada: R$ 69,18 / 1000 g x 3999,9 g", () => {
    expect(custoDoItem(69.18, 1000, 3999.9)).toBe(276.71);
  });
  it("Bife Ancho e Contra-Filé", () => {
    expect(custoDoItem(105.49, 1000, 3999.9)).toBe(421.95);
    expect(custoDoItem(74.44, 1000, 3999.9)).toBe(297.75);
  });
  it("item em unidades continua exato (R$ 3,19 x 60 un)", () => {
    expect(custoDoItem(31.9, 10, 60)).toBe(191.4);
  });
  it("não arredonda o custo por unidade antes de multiplicar (regressão: dava 279,99)", () => {
    expect(custoDoItem(69.18, 1000, 3999.9)).not.toBe(279.99);
  });
});
