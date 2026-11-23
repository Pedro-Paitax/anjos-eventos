import { describe, expect, it } from "vitest";
import { calcularFichaTecnicaEscalada } from "@/lib/ficha-tecnica-evento";
import {
  arredondarCompra,
  calcularListaCompras,
  type DadosInsumoCompra,
} from "@/lib/lista-compras-evento";

type Comp = { insumoId: number; nome: string; unidade: string; quantidade: number };
const ficha = (preparoId: number, rendimento: number, confirmada: number, composicao: Comp[]) =>
  calcularFichaTecnicaEscalada({
    preparoId,
    nomePreparo: `Preparo ${preparoId}`,
    rendimentoOriginal: rendimento,
    unidadeRendimento: "G",
    quantidadeConfirmada: confirmada,
    composicao,
    passos: null,
    modoPreparoBruto: "",
  });

const dados = (o: Record<number, DadosInsumoCompra>) =>
  new Map(Object.entries(o).map(([k, v]) => [Number(k), v]));

describe("calcularListaCompras", () => {
  it("Tomate com fator 0,95: escala da ficha dividida pelo fator, sobe a 0,1", () => {
    // multiplicador = (20 x 1,10)/10 = 2,2 ; 1 KG -> 2,2 ; 2,2/0,95 = 2,3158 -> 2,4
    const lista = calcularListaCompras(
      [ficha(1, 10, 20, [{ insumoId: 1, nome: "Tomate", unidade: "KG", quantidade: 1 }])],
      dados({ 1: { preco: 8, fatorCorrecao: 0.95 } }),
    );
    expect(lista).toEqual([
      { insumoId: 1, nome: "Tomate", unidade: "KG", quantidadeCompra: 2.4, semPreco: false, semFator: false },
    ]);
  });

  it("não aplica o buffer de 10% duas vezes", () => {
    // 10 convidados, rendimento 10, 1 KG: escala = 1,1 (buffer uma vez). Duas vezes daria 1,21 -> 1,3.
    const [item] = calcularListaCompras(
      [ficha(1, 10, 10, [{ insumoId: 1, nome: "Sal", unidade: "KG", quantidade: 1 }])],
      dados({ 1: { preco: 3, fatorCorrecao: 1 } }),
    );
    expect(item.quantidadeCompra).toBe(1.1);
  });

  it("insumo sem preço é listado com a marca", () => {
    const [item] = calcularListaCompras(
      [ficha(1, 10, 10, [{ insumoId: 2, nome: "Água", unidade: "Litro", quantidade: 5 }])],
      dados({ 2: { preco: null, fatorCorrecao: 1 } }),
    );
    expect(item.semPreco).toBe(true);
    expect(item.quantidadeCompra).toBe(5.5);
  });

  it("fator nulo, 0 ou negativo usa 1 e marca sem fator", () => {
    const f = ficha(1, 10, 10, [
      { insumoId: 3, nome: "Alho", unidade: "KG", quantidade: 1 },
      { insumoId: 4, nome: "Cebola", unidade: "KG", quantidade: 1 },
      { insumoId: 5, nome: "Louro", unidade: "KG", quantidade: 1 },
    ]);
    const lista = calcularListaCompras(
      [f],
      dados({
        3: { preco: 1, fatorCorrecao: null },
        4: { preco: 1, fatorCorrecao: 0 },
        5: { preco: 1, fatorCorrecao: -1 },
      }),
    );
    expect(lista.every((i) => i.semFator && i.quantidadeCompra === 1.1)).toBe(true);
  });

  it("insumo fora do mapa conta como sem preço e sem fator", () => {
    const [item] = calcularListaCompras(
      [ficha(1, 10, 10, [{ insumoId: 9, nome: "X", unidade: "KG", quantidade: 1 }])],
      new Map(),
    );
    expect(item.semPreco && item.semFator).toBe(true);
  });

  it("Unidade sobe para inteiro; KG sobe em 0,1", () => {
    const lista = calcularListaCompras(
      [
        ficha(1, 10, 10, [
          { insumoId: 1, nome: "Ovo", unidade: "Unidade", quantidade: 1 }, // 1,1 -> 2
          { insumoId: 2, nome: "Farinha", unidade: "KG", quantidade: 1.01 }, // 1,111 -> 1,2
        ]),
      ],
      dados({ 1: { preco: 1, fatorCorrecao: 1 }, 2: { preco: 1, fatorCorrecao: 1 } }),
    );
    expect(lista.find((i) => i.nome === "Ovo")?.quantidadeCompra).toBe(2);
    expect(lista.find((i) => i.nome === "Farinha")?.quantidadeCompra).toBe(1.2);
  });

  it("mesmo insumo em dois preparos soma antes de arredondar", () => {
    // 0,4 x 1,1 = 0,44 cada; soma 0,88 (arredondar antes, a 0,01, daria 0,44 + 0,44 igual; a 0,1 daria 0,5 + 0,5 = 1,0)
    const lista = calcularListaCompras(
      [
        ficha(1, 10, 10, [{ insumoId: 1, nome: "Cebola", unidade: "KG", quantidade: 0.4 }]),
        ficha(2, 10, 10, [{ insumoId: 1, nome: "Cebola", unidade: "KG", quantidade: 0.4 }]),
      ],
      dados({ 1: { preco: 1, fatorCorrecao: 1 } }),
    );
    expect(lista).toHaveLength(1);
    expect(lista[0].quantidadeCompra).toBe(0.88);
  });

  it("usa a quantidade exata: tempero minúsculo não some (vira o mínimo de compra, 0,01)", () => {
    // 0,001 KG x (62 x 1,1 / 1050) = 0,000065 KG: exibido na ficha como 0, mas entra na compra como 0,01.
    const [noz] = calcularListaCompras(
      [ficha(1, 1050, 62, [{ insumoId: 1, nome: "Noz-Moscada", unidade: "KG", quantidade: 0.001 }])],
      dados({ 1: { preco: 250, fatorCorrecao: 1 } }),
    );
    expect(noz.quantidadeCompra).toBe(0.01);
  });

  it("evento sem itens confirmados: lista vazia", () => {
    expect(calcularListaCompras([], new Map())).toEqual([]);
  });

  it("ordem alfabética pt-BR por nome do insumo", () => {
    const lista = calcularListaCompras(
      [
        ficha(1, 10, 10, [
          { insumoId: 1, nome: "Óleo", unidade: "Litro", quantidade: 1 },
          { insumoId: 2, nome: "Açúcar", unidade: "KG", quantidade: 1 },
          { insumoId: 3, nome: "Batata", unidade: "KG", quantidade: 1 },
        ]),
      ],
      new Map(),
    );
    expect(lista.map((i) => i.nome)).toEqual(["Açúcar", "Batata", "Óleo"]);
  });
});

describe("arredondarCompra", () => {
  it("Unidade e Maço sobem para inteiro; ruído de float não sobe um passo extra", () => {
    expect(arredondarCompra(2.01, "Maço")).toBe(3);
    expect(arredondarCompra(68.2, "Unidade")).toBe(69);
    expect(arredondarCompra(3, "Unidade")).toBe(3);
    expect(arredondarCompra(0.30000000000000004, "KG")).toBe(0.3);
  });

  it("KG e Litro abaixo de 1: passos de 0,01", () => {
    expect(arredondarCompra(0.001, "KG")).toBe(0.01);
    expect(arredondarCompra(0.234, "KG")).toBe(0.24);
    expect(arredondarCompra(0.9, "Litro")).toBe(0.9);
    expect(arredondarCompra(0.951, "Litro")).toBe(0.96);
    expect(arredondarCompra(0.9999, "KG")).toBe(1);
  });

  it("KG e Litro a partir de 1: passos de 0,1", () => {
    expect(arredondarCompra(1, "KG")).toBe(1);
    expect(arredondarCompra(1.01, "KG")).toBe(1.1);
    expect(arredondarCompra(2.31, "Litro")).toBe(2.4);
  });

  it("Pacote e Lata não são mais unidades inteiras (ramos mortos removidos): caem na regra de 0,01", () => {
    expect(arredondarCompra(1.2, "Pacote")).toBe(1.2);
  });
});

describe("embalagem de compra na lista", () => {
  const umaFicha = (qtd: number, unidade: string) =>
    ficha(1, 10, 10, [{ insumoId: 1, nome: "Pão de Alho", unidade, quantidade: qtd }]);

  it("sobe para embalagem inteira e mantém a quantidade na unidade do insumo", () => {
    // escala 1,1: 57 x 1,1 = 62,7 -> 63 un ; bandeja de 6: 10,5 -> 11 bandejas
    const [item] = calcularListaCompras(
      [umaFicha(57, "Unidade")],
      dados({ 1: { preco: 3, fatorCorrecao: 1, embalagem: { nome: "bandeja", quantidade: 6 } } }),
    );
    expect(item.quantidadeCompra).toBe(63);
    expect(item.embalagem).toEqual({ nome: "bandeja", tamanho: 6, embalagens: 11 });
  });

  it("quantidade exata em múltiplo da embalagem não ganha uma a mais", () => {
    // 60 x 1,1 = 66 un ; 66 / 6 = 11 exato
    const [item] = calcularListaCompras(
      [umaFicha(60, "Unidade")],
      dados({ 1: { preco: 3, fatorCorrecao: 1, embalagem: { nome: "bandeja", quantidade: 6 } } }),
    );
    expect(item.quantidadeCompra).toBe(66);
    expect(item.embalagem?.embalagens).toBe(11);
  });

  it("embalagem fracionada em KG: 0,28 kg de caixas de 0,2 kg = 2 caixas", () => {
    // 0,25 x 1,1 = 0,275 -> 0,28 ; 0,28 / 0,2 = 1,4 -> 2
    const [item] = calcularListaCompras(
      [umaFicha(0.25, "KG")],
      dados({ 1: { preco: 3, fatorCorrecao: 1, embalagem: { nome: "caixa", quantidade: 0.2 } } }),
    );
    expect(item.quantidadeCompra).toBe(0.28);
    expect(item.embalagem?.embalagens).toBe(2);
  });

  it("insumo sem embalagem (ausente ou null) continua como hoje, sem o campo", () => {
    for (const d of [{ preco: 3, fatorCorrecao: 1 }, { preco: 3, fatorCorrecao: 1, embalagem: null }]) {
      const [item] = calcularListaCompras([umaFicha(57, "Unidade")], dados({ 1: d }));
      expect(item.embalagem).toBeUndefined();
      expect(item.quantidadeCompra).toBe(63);
    }
  });

  it("embalagem com quantidade inválida é ignorada (não divide por zero)", () => {
    const [item] = calcularListaCompras(
      [umaFicha(57, "Unidade")],
      dados({ 1: { preco: 3, fatorCorrecao: 1, embalagem: { nome: "bandeja", quantidade: 0 } } }),
    );
    expect(item.embalagem).toBeUndefined();
  });
});
