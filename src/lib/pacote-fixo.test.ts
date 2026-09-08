import { describe, expect, it } from "vitest";
import {
  avaliarTrocaPacoteFixoCriarEvento,
  quebrarPacoteFixoSimuladorPublico,
} from "@/lib/pacote-fixo";

// Tolerância vigente em Configuracoes_Globais no momento da escrita
// destes testes (docs/DECISOES.md) — passada explicitamente em cada
// teste, nunca hardcoded dentro da função em si.
const TOLERANCIA = 1.99;

describe("avaliarTrocaPacoteFixoCriarEvento", () => {
  it("troca dentro da tolerância (diferença positiva, menor que a tolerância)", () => {
    // custo original 40.00, seleção atual 41.00 -> diferença = 1.00
    const resultado = avaliarTrocaPacoteFixoCriarEvento(41.0, 40.0, TOLERANCIA);

    expect(resultado.diferencaCustoPorPessoa).toBe(1.0);
    expect(resultado.dentroDaTolerancia).toBe(true);
  });

  it("troca EXATAMENTE na tolerância conta como dentro (≤, não <)", () => {
    const resultado = avaliarTrocaPacoteFixoCriarEvento(41.99, 40.0, TOLERANCIA);

    expect(resultado.diferencaCustoPorPessoa).toBe(1.99);
    expect(resultado.dentroDaTolerancia).toBe(true);
  });

  it("troca acima da tolerância exige decisão do usuário", () => {
    // diferença = 5.00, maior que 1.99
    const resultado = avaliarTrocaPacoteFixoCriarEvento(45.0, 40.0, TOLERANCIA);

    expect(resultado.diferencaCustoPorPessoa).toBe(5.0);
    expect(resultado.dentroDaTolerancia).toBe(false);
  });

  it("troca que REDUZ o custo (diferença negativa) sempre fica dentro da tolerância, mesmo sendo uma queda grande", () => {
    // custo caiu de 40.00 para 30.00 -> diferença = -10.00
    const resultado = avaliarTrocaPacoteFixoCriarEvento(30.0, 40.0, TOLERANCIA);

    expect(resultado.diferencaCustoPorPessoa).toBe(-10.0);
    expect(resultado.dentroDaTolerancia).toBe(true);
  });

  it("recalcula do zero — não soma incrementalmente diferenças de trocas já aprovadas", () => {
    // Duas chamadas independentes com a MESMA seleção atual/original devem
    // dar o mesmo resultado, não importa quantas "trocas" já tenham
    // acontecido antes — não há estado acumulado entre chamadas.
    const primeiraChamada = avaliarTrocaPacoteFixoCriarEvento(42.5, 40.0, TOLERANCIA);
    const segundaChamada = avaliarTrocaPacoteFixoCriarEvento(42.5, 40.0, TOLERANCIA);

    expect(segundaChamada).toEqual(primeiraChamada);
  });
});

describe("quebrarPacoteFixoSimuladorPublico", () => {
  it("sempre quebra o pacote, incondicionalmente — sem tolerância", () => {
    expect(quebrarPacoteFixoSimuladorPublico()).toEqual({ usarPrecoFixoModelo: false });
  });
});
