import { describe, expect, it } from "vitest";
import {
  converterParaEmbalagens,
  nomeEmbalagem,
  textoUnidadeComEmbalagem,
  validarEmbalagem,
} from "@/lib/embalagem-compra";
import { linhaDeCompra } from "@/lib/lista-compras-exibicao";

describe("converterParaEmbalagens", () => {
  it("arredonda para cima por embalagem inteira", () => {
    expect(converterParaEmbalagens(69, { nome: "bandeja", quantidade: 6 })).toEqual({
      nome: "bandeja",
      tamanho: 6,
      embalagens: 12,
    });
  });
  it("quantidade exata não ganha embalagem extra, mesmo com ruído de float", () => {
    expect(converterParaEmbalagens(0.6, { nome: "caixa", quantidade: 0.2 })?.embalagens).toBe(3);
    expect(converterParaEmbalagens(66, { nome: "bandeja", quantidade: 6 })?.embalagens).toBe(11);
  });
  it("sem embalagem: null", () => {
    expect(converterParaEmbalagens(69, null)).toBeNull();
    expect(converterParaEmbalagens(69, undefined)).toBeNull();
  });
});

describe("textos", () => {
  it("plural simples", () => {
    expect(nomeEmbalagem("bandeja", 12)).toBe("bandejas");
    expect(nomeEmbalagem("bandeja", 1)).toBe("bandeja");
    expect(nomeEmbalagem("tablete", 3)).toBe("tabletes");
  });
  it("Pão de Alho: 12 bandejas (69 unidades)", () => {
    const emb = converterParaEmbalagens(69, { nome: "bandeja", quantidade: 6 })!;
    expect(textoUnidadeComEmbalagem(emb, 69, "Unidade")).toBe("bandejas (69 unidades)");
    expect(linhaDeCompra({ unidade: "Unidade", quantidadeCompra: 69, embalagem: emb })).toEqual({
      quantidadeCompra: 12,
      unidade: "bandejas (69 unidades)",
    });
  });
  it("KG e Litro", () => {
    const kg = converterParaEmbalagens(14.2, { nome: "pacote", quantidade: 5 })!;
    expect(textoUnidadeComEmbalagem(kg, 14.2, "KG")).toBe("pacotes (14,2 kg)");
    const l = converterParaEmbalagens(2.5, { nome: "garrafa", quantidade: 0.9 })!;
    expect(textoUnidadeComEmbalagem(l, 2.5, "Litro")).toBe("garrafas (2,5 L)");
  });
  it("sem embalagem a linha é a de sempre", () => {
    expect(linhaDeCompra({ unidade: "KG", quantidadeCompra: 2.4 })).toEqual({ quantidadeCompra: 2.4, unidade: "KG" });
  });
});

describe("validarEmbalagem (campos do formulário)", () => {
  it("os dois vazios: sem embalagem", () => {
    expect(validarEmbalagem("", "")).toEqual({ embalagem: null });
    expect(validarEmbalagem("  ", " ")).toEqual({ embalagem: null });
  });
  it("preenchidos: nome aparado e vírgula decimal aceita", () => {
    expect(validarEmbalagem(" pacote ", "0,5")).toEqual({ embalagem: { nome: "pacote", quantidade: 0.5 } });
    expect(validarEmbalagem("bandeja", "6")).toEqual({ embalagem: { nome: "bandeja", quantidade: 6 } });
  });
  it("só um dos dois: erro", () => {
    expect("erro" in validarEmbalagem("bandeja", "")).toBe(true);
    expect("erro" in validarEmbalagem("", "6")).toBe(true);
  });
  it("quantidade zero, negativa ou inválida: erro", () => {
    for (const q of ["0", "-1", "abc"]) expect("erro" in validarEmbalagem("bandeja", q)).toBe(true);
  });
  it("nome longo demais: erro", () => {
    expect("erro" in validarEmbalagem("x".repeat(41), "1")).toBe(true);
  });
});
