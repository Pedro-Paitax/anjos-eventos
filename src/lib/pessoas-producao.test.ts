import { describe, expect, it } from "vitest";
import { pessoasParaProducao, pessoasParaProducaoOrcamento } from "./pessoas-producao";

describe("pessoasParaProducao", () => {
  it("criança conta meia porção", () => {
    expect(pessoasParaProducao({ adultos: 54, criancasAte5: 3, criancas5a10: 5 })).toBe(58);
    expect(pessoasParaProducao({ adultos: 10, criancasAte5: 1, criancas5a10: 0 })).toBe(10.5);
  });

  it("orçamento sem divisão ou zerado usa o total de convidados", () => {
    const base = { numConvidados: 62, qtdCriancasAte5: null, qtdCriancas5a10: null };
    expect(pessoasParaProducaoOrcamento({ ...base, qtdAdultos: null })).toBe(62);
    expect(pessoasParaProducaoOrcamento({ ...base, qtdAdultos: 0 })).toBe(62);
    expect(pessoasParaProducaoOrcamento({ numConvidados: 62, qtdAdultos: 54, qtdCriancasAte5: 8, qtdCriancas5a10: null })).toBe(58);
  });
});
