import { describe, expect, it } from "vitest";
import { calcularFichaTecnicaEscalada } from "@/lib/ficha-tecnica-evento";

describe("calcularFichaTecnicaEscalada", () => {
  it("aplica Fator_Multiplicador = (Quantidade_Confirmada x 1,10) / Rendimento_Original em cada insumo", () => {
    // Rendimento original 10kg, evento confirmou 25kg -> fator = (25 * 1.10) / 10 = 2.75
    const resultado = calcularFichaTecnicaEscalada({
      preparoId: 1,
      nomePreparo: "Farofa de Bacon",
      rendimentoOriginal: 10,
      unidadeRendimento: "G",
      quantidadeConfirmada: 25,
      composicao: [
        { insumoId: 1, nome: "Farinha de Mandioca", unidade: "KG", quantidade: 2 },
        { insumoId: 2, nome: "Bacon", unidade: "KG", quantidade: 1 },
      ],
      passos: null,
      modoPreparoBruto: "Fritar o bacon, misturar com a farinha.",
    });

    expect(resultado.fatorMultiplicador).toBeCloseTo(2.75, 8);
    expect(resultado.rendimentoAjustado).toBe(27.5); // 10 * 2.75
    expect(resultado.insumos).toEqual([
      { insumoId: 2, nome: "Bacon", unidade: "KG", quantidadeEscalada: 2.75 },
      { insumoId: 1, nome: "Farinha de Mandioca", unidade: "KG", quantidadeEscalada: 5.5 },
    ]);
  });

  it("rendimentoAjustado equivale a Quantidade_Confirmada x 1,10 (produção real + buffer)", () => {
    const resultado = calcularFichaTecnicaEscalada({
      preparoId: 2,
      nomePreparo: "Alcatra Grelhada",
      rendimentoOriginal: 1,
      unidadeRendimento: "G",
      quantidadeConfirmada: 61,
      composicao: [],
      passos: null,
      modoPreparoBruto: "Grelhar.",
    });

    expect(resultado.rendimentoAjustado).toBeCloseTo(61 * 1.1, 8);
  });

  it("valida e ordena passos JSONB por ordem, ignorando a ordem de gravação", () => {
    const resultado = calcularFichaTecnicaEscalada({
      preparoId: 3,
      nomePreparo: "Pão de Alho",
      rendimentoOriginal: 20,
      unidadeRendimento: "Unidade",
      quantidadeConfirmada: 40,
      composicao: [],
      passos: [
        { ordem: 2, descricao: "Levar ao forno.", tempo_estimado_min: 15 },
        { ordem: 1, descricao: "Preparar a manteiga de alho.", tempo_estimado_min: 10 },
      ],
      modoPreparoBruto: "1. Preparar a manteiga de alho. 2. Levar ao forno.",
    });

    expect(resultado.passos).toEqual([
      { ordem: 1, descricao: "Preparar a manteiga de alho.", tempo_estimado_min: 10 },
      { ordem: 2, descricao: "Levar ao forno.", tempo_estimado_min: 15 },
    ]);
  });

  it("cai pra null quando passos é ausente ou não passa na validação do Zod, pra quem exibe usar modoPreparoBruto", () => {
    const semPassos = calcularFichaTecnicaEscalada({
      preparoId: 4,
      nomePreparo: "Molho de Alho",
      rendimentoOriginal: 5,
      unidadeRendimento: "ML",
      quantidadeConfirmada: 5,
      composicao: [],
      passos: null,
      modoPreparoBruto: "Bater tudo no liquidificador.",
    });
    expect(semPassos.passos).toBeNull();

    const passosInvalidos = calcularFichaTecnicaEscalada({
      preparoId: 5,
      nomePreparo: "Vinagrete",
      rendimentoOriginal: 5,
      unidadeRendimento: "ML",
      quantidadeConfirmada: 5,
      composicao: [],
      passos: [{ ordem: "primeiro", descricao: "" }],
      modoPreparoBruto: "Picar e misturar.",
    });
    expect(passosInvalidos.passos).toBeNull();

    const arrayVazio = calcularFichaTecnicaEscalada({
      preparoId: 6,
      nomePreparo: "Farofa Simples",
      rendimentoOriginal: 5,
      unidadeRendimento: "G",
      quantidadeConfirmada: 5,
      composicao: [],
      passos: [],
      modoPreparoBruto: "Torrar a farinha.",
    });
    expect(arrayVazio.passos).toBeNull();
  });

  it("ordena insumos escalados alfabeticamente (pt-BR)", () => {
    const resultado = calcularFichaTecnicaEscalada({
      preparoId: 7,
      nomePreparo: "Salada Mista",
      rendimentoOriginal: 1,
      unidadeRendimento: "G",
      quantidadeConfirmada: 1,
      composicao: [
        { insumoId: 1, nome: "Tomate", unidade: "KG", quantidade: 1 },
        { insumoId: 2, nome: "Alface", unidade: "KG", quantidade: 1 },
        { insumoId: 3, nome: "Ervilha", unidade: "KG", quantidade: 1 },
      ],
      passos: null,
      modoPreparoBruto: "Misturar.",
    });

    expect(resultado.insumos.map((i) => i.nome)).toEqual(["Alface", "Ervilha", "Tomate"]);
  });
});
