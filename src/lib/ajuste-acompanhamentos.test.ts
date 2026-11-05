import { describe, expect, it } from "vitest";
import {
  contarAcompanhamentos,
  textoAjusteTeto,
  validarParametrosAjuste,
} from "@/lib/ajuste-acompanhamentos";
import {
  calcularTetoAjustado,
  distribuirPorcoes,
  type ItemResolvido,
} from "@/lib/dimensionamento-cardapio";
import { calcularPrecificacaoCardapio } from "@/lib/precificacao-cardapio";

// Valores aprovados pelo Pedro (2026-11-04): teto 315 g servidos (= 450 g comprados × 0,7),
// referência 5, redução 5 % por acompanhamento, piso 252 g.
const PARAMETROS = { referencia: 5, reducaoPorItem: 0.05, pisoG: 252 };

function item(
  preparoId: number,
  macro: string,
  extra: Partial<ItemResolvido> = {}
): ItemResolvido {
  const ehCarne = macro === "Proteínas Principais";
  return {
    preparoId,
    preparoNome: `Preparo ${preparoId}`,
    headerExibicao: macro,
    peso: 1,
    origemPeso: "teste",
    porcaoMaximaIndividual: null,
    macroCategoriaChave: macro,
    macroCategoriaNome: macro,
    capacidadeTeto: ehCarne ? 315 : 100,
    unidade: "g",
    unidadeRendimentoPreparo: "G",
    pesoMedioUnidadeG: null,
    rendimentoPreparo: 1000,
    pesoAcompanhamentoMacro: ehCarne ? 0 : 1,
    macroAjustaPorAcompanhamentos: ehCarne,
    ...extra,
  };
}

/** `n` acompanhamentos de peso 1 (Entradas) + duas carnes. */
function cardapio(n: number): ItemResolvido[] {
  return [
    item(1, "Proteínas Principais", { peso: 2 }),
    item(2, "Proteínas Principais", { peso: 1 }),
    ...Array.from({ length: n }, (_, i) => item(100 + i, "Entradas e Petiscos")),
  ];
}

const tetoCarne = (itens: ItemResolvido[], parametros = PARAMETROS) =>
  distribuirPorcoes(itens, 10, parametros).find((m) => m.macro_categoria === "Proteínas Principais")!;

describe("validarParametrosAjuste", () => {
  it("todos nulos: desligado sem aviso (recurso não configurado)", () => {
    expect(validarParametrosAjuste({ referencia: null, reducaoPorItem: null, pisoG: null })).toEqual({
      parametros: null,
      aviso: null,
    });
  });

  it("só um nulo: desligado com aviso", () => {
    const r = validarParametrosAjuste({ referencia: 5, reducaoPorItem: null, pisoG: 252 });
    expect(r.parametros).toBeNull();
    expect(r.aviso).toMatch(/desligado/);
  });

  it.each([
    { referencia: 5, reducaoPorItem: 1, pisoG: 252 },
    { referencia: 5, reducaoPorItem: -0.1, pisoG: 252 },
    { referencia: -1, reducaoPorItem: 0.05, pisoG: 252 },
    { referencia: 5, reducaoPorItem: 0.05, pisoG: 0 },
  ])("fora da faixa: desligado com aviso (%o)", (brutos) => {
    const r = validarParametrosAjuste(brutos);
    expect(r.parametros).toBeNull();
    expect(r.aviso).toMatch(/fora da faixa/);
  });

  it("válidos: liga", () => {
    expect(validarParametrosAjuste(PARAMETROS)).toEqual({ parametros: PARAMETROS, aviso: null });
  });
});

describe("contarAcompanhamentos", () => {
  it("pesos fracionários e zero; carne não conta", () => {
    const itens = [
      item(1, "Proteínas Principais"),
      item(2, "Saladas Leves", { pesoAcompanhamentoMacro: 0.5 }),
      item(3, "Saladas Leves", { pesoAcompanhamentoMacro: 0.5 }),
      item(4, "Condimentos/Molhos", { pesoAcompanhamentoMacro: 0 }),
      item(5, "Entradas e Petiscos"),
    ];
    expect(contarAcompanhamentos(itens)).toBe(2);
  });

  it("preparo repetido conta uma vez; sem peso conta 0", () => {
    const entrada = item(5, "Entradas e Petiscos");
    expect(contarAcompanhamentos([entrada, entrada, item(6, "X", { pesoAcompanhamentoMacro: undefined })])).toBe(1);
  });
});

describe("calcularTetoAjustado", () => {
  it.each([
    [3, 315], // abaixo da referência: nunca sobe
    [5, 315], // na referência
    [6, 299.25], // 315 × 0,95
    [7, 283.5], // 315 × 0,90
    [9, 252], // 315 × 0,80 = 252 (piso)
    [12, 252], // abaixo do piso: fica no piso
  ])("A = %d → %d g", (contagem, esperado) => {
    expect(calcularTetoAjustado(315, contagem, PARAMETROS).teto).toBe(esperado);
  });

  it("piso acima do teto base: vale o teto base", () => {
    expect(calcularTetoAjustado(200, 9, PARAMETROS).teto).toBe(200);
  });

  it("fator_aplicado é o efetivo, já com o piso", () => {
    expect(calcularTetoAjustado(315, 12, PARAMETROS).ajuste.fator_aplicado).toBe(0.8);
  });
});

describe("distribuirPorcoes com ajuste", () => {
  it("sem o 3º argumento: mesmo formato e valores de antes (sem campos novos)", () => {
    const [macro] = distribuirPorcoes([item(1, "Proteínas Principais")], 10);
    expect(macro).not.toHaveProperty("capacidade_teto_base");
    expect(macro).not.toHaveProperty("ajuste_acompanhamentos");
    expect(macro.capacidade_teto).toBe(315);
  });

  it("null: ajuste desligado, mas com o teto base no resultado", () => {
    const macro = tetoCarne(cardapio(9), null as never);
    expect(macro.capacidade_teto).toBe(315);
    expect(macro.capacidade_teto_base).toBe(315);
    expect(macro.ajuste_acompanhamentos).toBeNull();
  });

  it("7 acompanhamentos: carne cai para 283,5 g, distribuída 2:1", () => {
    const macro = tetoCarne(cardapio(7));
    expect(macro.capacidade_teto).toBe(283.5);
    expect(macro.capacidade_teto_base).toBe(315);
    expect(macro.ajuste_acompanhamentos).toMatchObject({ contagem: 7, referencia: 5, fator_aplicado: 0.9 });
    expect(macro.itens.map((i) => i.porcao_final)).toEqual([189, 94.5]);
  });

  it("só macros marcadas são ajustadas (Entradas mantém o teto)", () => {
    const entradas = distribuirPorcoes(cardapio(9), 10, PARAMETROS).find((m) => m.macro_categoria === "Entradas e Petiscos")!;
    expect(entradas.capacidade_teto).toBe(100);
    expect(entradas.ajuste_acompanhamentos).toBeNull();
  });

  it("cardápio só com carne e com uma carne só: recebe o teto inteiro", () => {
    const macro = tetoCarne([item(1, "Proteínas Principais")]);
    expect(macro.itens[0].porcao_final).toBe(315);
  });

  it("D5: carne com porção máxima não é limitada; outra categoria continua limitada", () => {
    const resultado = distribuirPorcoes(
      [
        item(1, "Proteínas Principais", { porcaoMaximaIndividual: 50, ignoraHardCap: true }),
        item(2, "Saladas Leves", { porcaoMaximaIndividual: 15 }),
      ],
      10,
      PARAMETROS
    );
    const [carne, salada] = resultado.map((m) => m.itens[0]);
    expect(carne.porcao_final).toBe(315);
    expect(carne.porcao_limitada_por_cap).toBe(false);
    expect(salada.porcao_final).toBe(15);
    expect(salada.porcao_limitada_por_cap).toBe(true);
  });

  it("mistura de unidades continua convertendo com o teto ajustado", () => {
    // Preparo vendido por Unidade (80 g cada) na macro de carne, 7 acompanhamentos: teto 283,5 g,
    // uma carne só → 283,5 g por pessoa → TETO(283,5/80) = 4 unidades × 10 pessoas.
    const itens = [
      item(1, "Proteínas Principais", { unidadeRendimentoPreparo: "Unidade", pesoMedioUnidadeG: 80 }),
      ...Array.from({ length: 7 }, (_, i) => item(100 + i, "Entradas e Petiscos")),
    ];
    const [carne] = tetoCarne(itens).itens;
    expect(carne.porcao_final).toBe(283.5);
    expect(carne.quantidade_para_custo).toBe(40);
  });
});

describe("calcularPrecificacaoCardapio com ajuste", () => {
  const paraPrecificacao = (itens: ItemResolvido[]) =>
    itens.map((i) => ({ ...i, custoTotalPreparo: 100, rendimento: 1000 }));

  it("sem a opção: resultado sem ajustes_teto (igual ao de antes)", () => {
    const r = calcularPrecificacaoCardapio(paraPrecificacao(cardapio(7)), { numConvidados: 10, regiaoMetropolitanaCuritiba: false });
    expect(r).not.toHaveProperty("ajustes_teto");
  });

  it("com a opção: custo cai junto com o teto e o resumo vem no resultado", () => {
    const opcoes = { numConvidados: 10, regiaoMetropolitanaCuritiba: false };
    const sem = calcularPrecificacaoCardapio(paraPrecificacao(cardapio(7)), opcoes);
    const com = calcularPrecificacaoCardapio(paraPrecificacao(cardapio(7)), { ...opcoes, ajusteAcompanhamentos: PARAMETROS });
    expect(com.custo_cardapio_total).toBeLessThan(sem.custo_cardapio_total);
    expect(com.ajustes_teto).toEqual([
      expect.objectContaining({ macro: "Proteínas Principais", teto_base: 315, teto_ajustado: 283.5, contagem: 7 }),
    ]);
  });
});

describe("textoAjusteTeto", () => {
  it("monta a linha da tela interna", () => {
    expect(
      textoAjusteTeto({
        macro: "Proteínas Principais",
        unidade: "g",
        teto_base: 315,
        teto_ajustado: 299.25,
        contagem: 6,
        referencia: 5,
        reducao_por_item: 0.05,
        piso_g: 252,
        fator_aplicado: 0.95,
      })
    ).toBe("Proteínas Principais: 315 → 299,25 g por pessoa (6 acompanhamentos; referência 5)");
  });
});
