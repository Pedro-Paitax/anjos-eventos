import { describe, expect, it } from "vitest";
import { agruparPorBase, partesNomeVariacao, rotuloVariacao } from "./variacoes-preparo";

describe("partesNomeVariacao", () => {
  it("separa o que é igual ao base do que muda, mantendo a grafia do nome", () => {
    expect(partesNomeVariacao("Pão de Alho Tradicional", "Pão de Alho Tradicional com Chimichurri")).toEqual({
      comum: "Pão de Alho Tradicional",
      diferenca: "com Chimichurri",
    });
    expect(partesNomeVariacao("Queijo Coalho", "queijo coalho + Melaço")).toEqual({
      comum: "queijo coalho +",
      diferenca: "Melaço",
    });
  });
  it("nome que não começa pelo base fica inteiro na diferença", () => {
    expect(partesNomeVariacao("Linguiça Fina", "Linguiça de Pernil Fina com Vinagrete")).toEqual({
      comum: "",
      diferenca: "Linguiça de Pernil Fina com Vinagrete",
    });
  });
});

describe("agruparPorBase", () => {
  const itens = [
    { id: 1, nome: "Fraldinha", variacaoDe: null },
    { id: 2, nome: "Fraldinha com Chimichurri", variacaoDe: 1 },
    { id: 3, nome: "Picanha" },
    { id: 4, nome: "Fraldinha com Manteiga de Ervas", variacaoDe: 1 },
    { id: 5, nome: "Maminha com Gorgonzola", variacaoDe: 99 }, // base fora da lista
  ];
  it("põe as versões debaixo do base, na ordem recebida", () => {
    const g = agruparPorBase(itens);
    expect(g.map((x) => [x.item.id, x.variacoes.map((v) => v.id)])).toEqual([
      [1, [2, 4]],
      [3, []],
      [5, []],
    ]);
  });
  it("não perde nem duplica item", () => {
    const g = agruparPorBase(itens);
    const ids = g.flatMap((x) => [x.item.id, ...x.variacoes.map((v) => v.id)]).sort();
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("rotuloVariacao", () => {
  it("tira o nome do base", () => {
    expect(rotuloVariacao("Fraldinha", "Fraldinha com Chimichurri")).toBe("com Chimichurri");
    expect(rotuloVariacao("Queijo Coalho", "queijo coalho + Melaço")).toBe("Melaço");
  });
  it("sem prefixo, mostra o nome inteiro", () => {
    expect(rotuloVariacao("Picanha", "Bife de Picanha")).toBe("Bife de Picanha");
    expect(rotuloVariacao("Picanha", "Picanha")).toBe("Picanha");
  });
});
