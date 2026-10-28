import { describe, expect, it } from "vitest";
import {
  DIMENSOES,
  calcularQualificacao,
  validarDimensao,
  faixaPrioridade,
  pendenciasCadastro,
  type DimensaoAvaliada,
} from "./prospeccao-pontuacao";

function dims(pontos: (number | null)[], confianca: DimensaoAvaliada["confianca"] = "alta"): DimensaoAvaliada[] {
  return DIMENSOES.map((d, i) => ({
    chave: d.chave,
    maximo: d.maximo,
    pontos: pontos[i],
    justificativa: "ok",
    evidenciaIds: [1],
    confianca,
  }));
}

describe("pesos", () => {
  it("somam 100 e seguem a especificação", () => {
    expect(DIMENSOES.map((d) => d.maximo)).toEqual([30, 25, 20, 15, 10]);
  });
});

describe("faixas de prioridade", () => {
  it.each([
    [100, "A"],
    [80, "A"],
    [79, "B"],
    [60, "B"],
    [59, "C"],
    [40, "C"],
    [39, "baixa"],
  ])("%i → %s", (p, esperado) => {
    expect(faixaPrioridade(p)).toBe(esperado);
  });
});

describe("calcularQualificacao", () => {
  it("todas conhecidas com confiança alta: definitiva", () => {
    expect(calcularQualificacao(dims([28, 20, 15, 12, 8]))).toEqual({
      pontuacao: 83,
      pontuacaoMaxima: 83,
      completude: 100,
      prioridade: "A",
      provisoria: false,
      confianca: "alta",
    });
  });

  it("desconhecida não vira zero: provisória, com o máximo possível", () => {
    const r = calcularQualificacao(dims([25, 20, null, 10, 8]));
    expect(r.pontuacao).toBe(63);
    expect(r.pontuacaoMaxima).toBe(83);
    expect(r.completude).toBe(80);
    expect(r.prioridade).toBe("B");
    expect(r.provisoria).toBe(true);
    expect(r.confianca).toBe("media");
  });

  it("menos da metade avaliada: indefinida e confiança baixa", () => {
    const r = calcularQualificacao(dims([30, null, null, null, 10]));
    expect(r.completude).toBe(40);
    expect(r.prioridade).toBe("indefinida");
    expect(r.confianca).toBe("baixa");
  });

  it("baixa só quando nem o máximo possível chega a 40", () => {
    expect(calcularQualificacao(dims([5, 5, 5, null, 0])).prioridade).toBe("baixa"); // máx 30
    expect(calcularQualificacao(dims([5, 5, 5, 0, null])).prioridade).toBe("baixa"); // máx 25
    expect(calcularQualificacao(dims([10, 5, 5, null, null])).prioridade).toBe("baixa"); // 20, máx 45 → faixa de 20
  });

  it("dimensão com confiança baixa deixa provisória", () => {
    const r = calcularQualificacao(dims([28, 20, 15, 12, 8], "baixa"));
    expect(r.provisoria).toBe(true);
    expect(r.confianca).toBe("baixa");
  });
});

describe("validarDimensao", () => {
  const d = (x: Partial<DimensaoAvaliada>): DimensaoAvaliada => ({
    chave: "compatibilidade",
    maximo: 30,
    pontos: 20,
    justificativa: "cardápio com carnes na brasa",
    evidenciaIds: [3],
    confianca: "media",
    ...x,
  });

  it("aceita nota válida e dimensão desconhecida", () => {
    expect(validarDimensao(d({}))).toBeNull();
    expect(validarDimensao(d({ pontos: null, justificativa: "" }))).toBeNull();
  });

  it("recusa fora da faixa, sem justificativa, ou nota sem evidência com confiança média/alta", () => {
    expect(validarDimensao(d({ pontos: 31 }))).toMatch(/entre 0 e 30/);
    expect(validarDimensao(d({ justificativa: " " }))).toMatch(/justificativa/);
    expect(validarDimensao(d({ evidenciaIds: [] }))).toMatch(/evidência/);
    expect(validarDimensao(d({ evidenciaIds: [], confianca: "baixa" }))).toBeNull();
  });
});

describe("pendenciasCadastro", () => {
  it("lista o que falta para sair da fila de pesquisa", () => {
    expect(
      pendenciasCadastro({
        municipio: null,
        site: null,
        instagram: "x",
        telefone: null,
        email: null,
        sinaisDemanda: null,
        compatibilidadeParrilla: "sim",
        evidenciasVerificadas: 0,
        temQualificacao: false,
      }),
    ).toEqual(["município", "sinais de demanda", "fonte verificada", "qualificação"]);
  });
});
