import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  descreverConvidados,
  formatarConsumo,
  formatarNumero,
  formatarReais,
  gerarQuantidadesCardapioPdf,
  montarLinhasQuantidades,
  type DadosQuantidadesCardapioPdf,
  type LinhaQuantidadeCardapio,
} from "@/lib/quantidades-cardapio-pdf";
import { lerParametrosQuantidades, montarUrlQuantidadesPdf } from "@/lib/quantidades-cardapio-url";
import type { DebugCalculoResultado, LinhaDebugItem } from "@/lib/debug-calculo-cardapio";

const linha = (i: number, extra: Partial<LinhaQuantidadeCardapio> = {}): LinhaQuantidadeCardapio => ({
  nome: `Preparo ${String(i).padStart(3, "0")}`,
  quantidade: 1000 + i * 37.4,
  unidade: "g",
  custo: 12.5 + i,
  ...extra,
});

const dados = (itens: LinhaQuantidadeCardapio[], extra: Partial<DadosQuantidadesCardapioPdf> = {}): DadosQuantidadesCardapioPdf => ({
  adultos: 40,
  criancasAte5: 3,
  criancas5a10: 2,
  geradoEm: "04/11/2026 07:40",
  itens,
  foraDoCalculo: [],
  ...extra,
});

describe("formatação", () => {
  it("número com milhar e vírgula, sem ICU", () => {
    expect(formatarNumero(4500, 0)).toBe("4.500");
    expect(formatarNumero(1234567.891, 2)).toBe("1.234.567,89");
    expect(formatarNumero(2.5, 2, 2)).toBe("2,50");
    expect(formatarNumero(0, 2, 2)).toBe("0,00");
  });
  it("consumo em g/ml com kg/L a partir de 1000", () => {
    expect(formatarConsumo(4500, "g")).toBe("4.500 g (4,5 kg)");
    expect(formatarConsumo(2345.67, "g")).toBe("2.346 g (2,35 kg)");
    expect(formatarConsumo(850, "g")).toBe("850 g");
    expect(formatarConsumo(1500, "ml")).toBe("1.500 ml (1,5 L)");
  });
  it("reais com duas casas", () => {
    expect(formatarReais(1234.5)).toBe("R$ 1.234,50");
  });
  it("convidados: total e, se houver crianças, a divisão", () => {
    expect(descreverConvidados({ adultos: 50, criancasAte5: 0, criancas5a10: 0 })).toBe("50");
    expect(descreverConvidados({ adultos: 40, criancasAte5: 3, criancas5a10: 2 })).toBe(
      "45 (40 adultos, 3 até 5 anos, 2 de 5 a 10 anos)",
    );
  });
});

describe("montarLinhasQuantidades", () => {
  it("usa o volume total na unidade da macro e o custo total do item, na mesma ordem", () => {
    const base = { volumeNecessarioTotal: 0, unidadeMacro: "g", custoTotalItem: 0 } as LinhaDebugItem;
    const debug = {
      linhas: [
        { ...base, preparoNome: "Arroz", volumeNecessarioTotal: 4500, custoTotalItem: 22.1 },
        { ...base, preparoNome: "Alcatra", volumeNecessarioTotal: 9000, custoTotalItem: 310.4 },
      ],
      itensExcluidos: [],
      resultadoFinal: {},
    } as unknown as DebugCalculoResultado;
    expect(montarLinhasQuantidades(debug)).toEqual([
      { nome: "Arroz", quantidade: 4500, unidade: "g", custo: 22.1 },
      { nome: "Alcatra", quantidade: 9000, unidade: "g", custo: 310.4 },
    ]);
  });
});

describe("gerarQuantidadesCardapioPdf", () => {
  it("devolve um PDF válido de uma página", async () => {
    const bytes = await gerarQuantidadesCardapioPdf(
      dados([linha(1), linha(2, { nome: "Linguiça de Pernil Fina com Vinagrete de Manga e Cebola Roxa", unidade: "g" })]),
    );
    expect(Buffer.from(bytes.subarray(0, 4)).toString("latin1")).toBe("%PDF");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("lista longa e itens fora do cálculo ocupam várias páginas sem erro", async () => {
    const itens = Array.from({ length: 120 }, (_, i) => linha(i));
    const fora = Array.from({ length: 30 }, (_, i) => ({ preparo: `Sem ficha ${i}`, motivo: "Preparo sem header" }));
    const doc = await PDFDocument.load(await gerarQuantidadesCardapioPdf(dados(itens, { foraDoCalculo: fora })));
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });

  it("recusa PDF sem itens", async () => {
    await expect(gerarQuantidadesCardapioPdf(dados([]))).rejects.toThrow(/Nenhum item/);
  });
});

describe("endereço do PDF", () => {
  it("ida e volta", () => {
    const url = montarUrlQuantidadesPdf({ preparoIds: [3, 7, 9], adultos: 40, criancasAte5: 3, criancas5a10: 0 });
    expect(url.startsWith("/simulador-cardapio/quantidades-pdf?")).toBe(true);
    const busca = new URL(url, "http://x").searchParams;
    expect(lerParametrosQuantidades(busca)).toEqual({ preparoIds: [3, 7, 9], adultos: 40, criancasAte5: 3, criancas5a10: 0 });
  });

  it("recusa entrada inválida", () => {
    const ler = (q: string) => lerParametrosQuantidades(new URLSearchParams(q));
    expect(ler("adultos=10")).toHaveProperty("erro");
    expect(ler("preparos=1,abc&adultos=10")).toHaveProperty("erro");
    expect(ler("preparos=1,-2&adultos=10")).toHaveProperty("erro");
    expect(ler("preparos=1&adultos=0")).toHaveProperty("erro");
    expect(ler("preparos=1&adultos=1.5")).toHaveProperty("erro");
    expect(ler("preparos=1&adultos=10&criancasAte5=x")).toHaveProperty("erro");
  });

  it("só crianças também vale; ids repetidos viram um", () => {
    expect(lerParametrosQuantidades(new URLSearchParams("preparos=1,1,2&criancas5a10=8"))).toEqual({
      preparoIds: [1, 2],
      adultos: 0,
      criancasAte5: 0,
      criancas5a10: 8,
    });
  });
});
