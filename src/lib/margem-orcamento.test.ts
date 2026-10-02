import { describe, expect, it } from "vitest";
import { calcularMargem } from "@/lib/margem-orcamento";

describe("calcularMargem", () => {
  it("desconta o custo operacional embutido na receita (caso Oracle, 61 convidados)", () => {
    // Receita = 62,67 x 61 = 3822,87 ; custo cardápio = 1747,88 ;
    // operacional = 982,50 (assador 250 + copeira 500 + consumíveis 232,50).
    // Antes da correção: 3822,87 - 1747,88 = 2074,99 (inflada em 982,50).
    // Depois: 2074,99 - 982,50 = 1092,49.
    expect(calcularMargem(3822.87, 1747.88, 982.5)).toBe(1092.49);
  });

  it("caminho legado (sem rateio na receita): operacional 0 mantém a conta antiga", () => {
    expect(calcularMargem(3822.87, 1747.88, 0)).toBe(2074.99);
  });
});
