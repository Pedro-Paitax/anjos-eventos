import { describe, expect, it } from "vitest";
import { acharInsumosParecidos, normalizarNome, semelhanca } from "./insumos-parecidos";

describe("normalizarNome", () => {
  it("tira acento, caixa e pontuação", () => {
    expect(normalizarNome("  Linguiça  Toscana! ")).toBe("linguica toscana");
  });
});

describe("semelhanca", () => {
  it("igual ignorando caixa, acento e espaços", () => {
    expect(semelhanca("LINGUICA toscana", "Linguiça Toscana")).toBe("igual");
  });
  it("plural e ordem diferente são parecidos", () => {
    expect(semelhanca("Tomates", "Tomate")).toBe("parecido");
    expect(semelhanca("Toscana Linguiça", "Linguiça Toscana")).toBe("parecido");
  });
  it("um nome contido no outro é parecido", () => {
    expect(semelhanca("Tomate", "Tomate Italiano")).toBe("parecido");
    expect(semelhanca("Queijo Mussarela Fatiado", "Queijo Mussarela")).toBe("parecido");
  });
  it("erro de digitação é parecido", () => {
    expect(semelhanca("Linguica Toscna", "Linguiça Toscana")).toBe("parecido");
  });
  it("nomes diferentes não casam", () => {
    expect(semelhanca("Alho", "Alho Poró")).toBe("parecido"); // contido: avisa
    expect(semelhanca("Cebola", "Cenoura")).toBeNull();
    expect(semelhanca("Picanha", "Alcatra")).toBeNull();
  });
  it("ignora palavras vazias", () => {
    expect(semelhanca("Farinha de Trigo", "Farinha Trigo")).toBe("parecido");
  });
});

describe("acharInsumosParecidos", () => {
  const lista = [
    { id: 1, nome: "Picanha" },
    { id: 2, nome: "Tomate Italiano" },
    { id: 3, nome: "Tomate" },
  ];
  it("separa iguais de parecidos", () => {
    const r = acharInsumosParecidos("tomate", lista);
    expect(r.iguais.map((i) => i.id)).toEqual([3]);
    expect(r.parecidos.map((i) => i.id)).toEqual([2]);
  });
  it("sem parecidos devolve vazio", () => {
    expect(acharInsumosParecidos("Cominho", lista)).toEqual({ iguais: [], parecidos: [] });
  });
});
