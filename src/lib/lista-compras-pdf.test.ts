import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  CONSUMIVEIS_OPERACIONAIS,
  formatarQuantidadeCompra,
  gerarListaComprasPdf,
  type DadosListaComprasPdf,
  type LinhaPdfCompras,
} from "@/lib/lista-compras-pdf";

const linha = (i: number, extra: Partial<LinhaPdfCompras> = {}): LinhaPdfCompras => ({
  nome: `Insumo ${String(i).padStart(3, "0")}`,
  unidade: "KG",
  quantidadeCompra: i + 0.4,
  semPreco: false,
  semFator: false,
  ...extra,
});

const base = (itens: LinhaPdfCompras[]): DadosListaComprasPdf => ({
  cliente: "Cliente de Teste",
  empresa: "Buffet Senhor Churrasco",
  dataEvento: "sáb., 03 de outubro de 2026",
  convidados: 120,
  geradoEm: "07/10/2026",
  itens,
});

describe("gerarListaComprasPdf", () => {
  it("devolve bytes de um PDF válido (começa com %PDF) e abre de volta", async () => {
    const bytes = await gerarListaComprasPdf(base([linha(1), linha(2, { semPreco: true, semFator: true })]));
    expect(Buffer.from(bytes.subarray(0, 4)).toString("latin1")).toBe("%PDF");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("lista longa ocupa várias páginas", async () => {
    const itens = Array.from({ length: 150 }, (_, i) => linha(i));
    const doc = await PDFDocument.load(await gerarListaComprasPdf(base(itens)));
    expect(doc.getPageCount()).toBeGreaterThan(2);
  });

  it("aceita acentos (ç, ã, é) e nome longo que quebra linha", async () => {
    const bytes = await gerarListaComprasPdf(
      base([
        linha(1, { nome: "Maçã verde, açúcar refinado e é só", unidade: "Maço" }),
        linha(2, { nome: "Feijão ".repeat(30), semPreco: true }),
        linha(3, { nome: "Emoji 🍅 vira ponto de interrogação" }),
      ]),
    );
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("recusa gerar PDF vazio", async () => {
    await expect(gerarListaComprasPdf(base([]))).rejects.toThrow(/vazia/);
  });

  it("os consumíveis são só nomes, sem quantidade inventada", () => {
    expect([...CONSUMIVEIS_OPERACIONAIS]).toEqual([
      "Carvão",
      "Gelo",
      "Sal grosso",
      "Papel toalha",
      "Sacos de lixo",
      "Papel alumínio",
    ]);
  });
});

describe("formatarQuantidadeCompra", () => {
  it("usa vírgula e sem zeros à direita", () => {
    expect(formatarQuantidadeCompra(2.4)).toBe("2,4");
    expect(formatarQuantidadeCompra(12)).toBe("12");
    expect(formatarQuantidadeCompra(0.9)).toBe("0,9");
  });
});
