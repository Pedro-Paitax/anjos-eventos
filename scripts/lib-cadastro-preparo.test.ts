import { describe, expect, it } from "vitest";
import { custoLinha, errosLegiveis, fichaSchema, modoPreparoDosPassos, normalizarNome, tituloInsumo } from "./lib-cadastro-preparo";

const base = {
  nome: "Farofa de Bacon",
  categoria: "Guarnições",
  header: "Acompanhamentos Rústicos",
  rendimento: 1000,
  unidadeRendimento: "G",
  pesoAtratividade: 1,
  passos: [{ ordem: 1, descricao: "Frite o bacon.", tempo_estimado_min: null }],
  composicao: [{ insumo: "Bacon", quantidade: 0.3 }],
};

function erros(f: unknown) {
  const r = fichaSchema.safeParse(f);
  return r.success ? [] : errosLegiveis(r.error);
}

describe("fichaSchema", () => {
  it("aceita ficha mínima e preenche padrões", () => {
    const r = fichaSchema.parse(base);
    expect(r.tags).toEqual([]);
    expect(r.subcategoriaProteina).toBeNull();
  });
  it("Carnes: exige subcategoria e recusa peso de atratividade", () => {
    expect(erros({ ...base, categoria: "Carnes" }).join(" ")).toMatch(/subcategoriaProteina/);
    expect(erros({ ...base, categoria: "Carnes", subcategoriaProteina: "Aves" }).join(" ")).toMatch(/hierarquia/);
    expect(erros({ ...base, categoria: "Carnes", subcategoriaProteina: "Aves", pesoAtratividade: null })).toEqual([]);
  });
  it("não-Carnes exige peso de atratividade (sem padrão escondido)", () => {
    expect(erros({ ...base, pesoAtratividade: undefined }).join(" ")).toMatch(/pesoAtratividade/);
  });
  it("rendimento em Unidade exige peso médio real", () => {
    expect(erros({ ...base, unidadeRendimento: "Unidade" }).join(" ")).toMatch(/pesoMedioUnidadeG/);
    expect(erros({ ...base, unidadeRendimento: "Unidade", pesoMedioUnidadeG: 45 })).toEqual([]);
  });
  it("insumo novo pesquisado precisa de fonte, data e link (pesquisa web); estimado não", () => {
    const novo = { unidade: "KG", precoFornecedor: 12.9, fatorCorrecao: 1 };
    const comp = (n: object) => ({ ...base, composicao: [{ insumo: "Farinha De Mandioca", quantidade: 0.5, novo: n }] });
    expect(erros(comp(novo)).join(" ")).toMatch(/fonte/);
    expect(erros(comp({ ...novo, fonte: "pesquisa_web", observadoEm: "2026-11-02" })).join(" ")).toMatch(/url/);
    expect(erros(comp({ ...novo, fonte: "pesquisa_web", observadoEm: "2026-11-02", url: "https://exemplo.com/x" }))).toEqual([]);
    expect(erros(comp({ ...novo, estimado: true }))).toEqual([]);
  });
  it("recusa campo desconhecido e insumo repetido", () => {
    expect(erros({ ...base, porcaoSugerida: 120 }).length).toBeGreaterThan(0);
    expect(erros({ ...base, composicao: [{ insumo: "Bacon", quantidade: 1 }, { insumo: "bácon", quantidade: 1 }] }).join(" ")).toMatch(/repetido/);
  });
});

describe("auxiliares", () => {
  it("normaliza e titula nomes", () => {
    expect(normalizarNome("  Batata   INGLÊSA ")).toBe("batata inglesa");
    expect(tituloInsumo("creme de  leite")).toBe("Creme De Leite");
  });
  it("modo de preparo no padrão '1. texto' por linha, na ordem", () => {
    expect(
      modoPreparoDosPassos([
        { ordem: 2, descricao: "B", tempo_estimado_min: null },
        { ordem: 1, descricao: "A", tempo_estimado_min: 5 },
      ]),
    ).toBe("1. A\n2. B");
  });
  it("custo: fator vazio ou zero dá 0 (mesma regra do motor)", () => {
    expect(custoLinha(2, 10, 0.5)).toBe(40);
    expect(custoLinha(2, 10, 0)).toBe(0);
    expect(custoLinha(2, null, 1)).toBe(0);
  });
});
