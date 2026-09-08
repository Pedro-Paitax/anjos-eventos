import { describe, expect, it } from "vitest";
import {
  calcularCustoPor100Unidades,
  calcularCustoTotalComposicao,
  type ItemComposicaoParaCusto,
} from "@/lib/custo-preparo";

// Casos reais validados manualmente contra o NocoDB (ver docs/DECISOES.md,
// seção "Motor de custo"). Preco/Rendimento(%) abaixo são os valores reais
// dos insumos no momento da validação.

describe("calcularCustoTotalComposicao", () => {
  it("Vinagrete: bate em R$16,96", () => {
    const itens: ItemComposicaoParaCusto[] = [
      { quantidade: 0.5, preco: 9, fatorCorrecao: 0.95 }, // Tomate
      { quantidade: 0.3, preco: 4.5, fatorCorrecao: 0.85 }, // Cebola Branca
      { quantidade: 0.2, preco: 4.5, fatorCorrecao: 0.85 }, // Pimentão Verde
      { quantidade: 0.2, preco: 16.5, fatorCorrecao: 0.85 }, // Pimentão Vermelho
      { quantidade: 0.15, preco: 29.9, fatorCorrecao: 1 }, // Azeite de Oliva Extra Virgem
      { quantidade: 0.3, preco: 4, fatorCorrecao: 1 }, // Vinagre de Álcool
    ];

    expect(calcularCustoTotalComposicao(itens)).toBe(16.96);
    expect(calcularCustoPor100Unidades(16.96, 1500)).toBe(1.13);
  });

  it("Alcatra Grelhada: bate em R$64,93", () => {
    const itens: ItemComposicaoParaCusto[] = [
      { quantidade: 1.2, preco: 45.99, fatorCorrecao: 0.85 }, // Alcatra
    ];

    expect(calcularCustoTotalComposicao(itens)).toBe(64.93);
    expect(calcularCustoPor100Unidades(64.93, 1000)).toBe(6.49);
  });

  it("Arroz Branco com Alho Crispy: bate em R$20,07 (água com custo zerado)", () => {
    const itens: ItemComposicaoParaCusto[] = [
      { quantidade: 1, preco: 6, fatorCorrecao: 1 }, // Arroz Agulinha
      { quantidade: 2, preco: 1, fatorCorrecao: 0 }, // Agua — Fator de Correção 0 -> custo R$0
      { quantidade: 0.05, preco: 6.99, fatorCorrecao: 1 }, // Óleo de Soja
      { quantidade: 0.03, preco: 22, fatorCorrecao: 1 }, // Alho Triturado
      { quantidade: 0.2, preco: 65, fatorCorrecao: 1 }, // Alho Crispy
      { quantidade: 0.02, preco: 3, fatorCorrecao: 1 }, // Sal
    ];

    expect(calcularCustoTotalComposicao(itens)).toBe(20.07);
    expect(calcularCustoPor100Unidades(20.07, 1000)).toBe(2.01);
  });

  it("regra de borda: Preço vazio também zera o custo do item", () => {
    const itens: ItemComposicaoParaCusto[] = [
      { quantidade: 5, preco: null, fatorCorrecao: 1 },
    ];

    expect(calcularCustoTotalComposicao(itens)).toBe(0);
  });

  it("evita o erro de ponto flutuante em casos de meio-centavo exato (0.15 * 29.9)", () => {
    // 0.15 * (29.9 / 1) = 4.485 exato — em ponto flutuante puro vira
    // 4.484999999999999, que arredondaria pra 4.48 em vez de 4.49.
    const itens: ItemComposicaoParaCusto[] = [{ quantidade: 0.15, preco: 29.9, fatorCorrecao: 1 }];

    expect(calcularCustoTotalComposicao(itens)).toBe(4.49);
  });
});
