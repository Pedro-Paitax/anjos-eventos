import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  consolidarAlteracoes,
  formatarReaisPdf,
  formatarVariacao,
  gerarResumoPrecosPdf,
  legendaResumoPrecos,
  origemTexto,
  type AlteracaoPendente,
  type InsumoTabela,
} from "./precos-resumo-pdf";

const alt = (id: number, insumoId: number, antes: number | null, depois: number | null, quando: string): AlteracaoPendente => ({
  id, insumoId, nome: `Insumo ${insumoId}`, unidade: "KG", precoAnterior: antes, precoNovo: depois, alteradoEm: quando,
});

describe("consolidarAlteracoes", () => {
  it("junta várias mudanças do mesmo insumo: antes da primeira, depois da última", () => {
    const { mudancas, idsConsumidos } = consolidarAlteracoes([
      alt(2, 1, 12, 15, "2026-11-04T12:00:00Z"),
      alt(1, 1, 10, 12, "2026-11-04T10:00:00Z"),
    ]);
    expect(mudancas).toEqual([{ insumoId: 1, nome: "Insumo 1", unidade: "KG", antes: 10, depois: 15, variacaoPct: 50 }]);
    expect(idsConsumidos).toEqual([1, 2]);
  });

  it("tira da lista quem voltou ao mesmo preço, mas consome as linhas", () => {
    const { mudancas, idsConsumidos } = consolidarAlteracoes([
      alt(1, 1, 10, 12, "2026-11-04T10:00:00Z"),
      alt(2, 1, 12, 10, "2026-11-04T11:00:00Z"),
    ]);
    expect(mudancas).toEqual([]);
    expect(idsConsumidos).toEqual([1, 2]);
  });

  it("insumo novo não tem variação e vai para o fim; maiores variações primeiro", () => {
    const { mudancas } = consolidarAlteracoes([
      alt(1, 1, 10, 11, "2026-11-04T10:00:00Z"), // +10 %
      alt(2, 2, null, 20, "2026-11-04T10:00:00Z"), // novo
      alt(3, 3, 10, 5, "2026-11-04T10:00:00Z"), // −50 %
    ]);
    expect(mudancas.map((m) => [m.insumoId, m.variacaoPct])).toEqual([[3, -50], [1, expect.closeTo(10, 6)], [2, null]]);
  });
});

describe("formatação", () => {
  it("reais e variação sem depender de ICU", () => {
    expect(formatarReaisPdf(1234.5)).toBe("R$ 1.234,50");
    expect(formatarReaisPdf(0.47)).toBe("R$ 0,47");
    expect(formatarReaisPdf(null)).toBe("-");
    expect(formatarVariacao(57.14)).toBe("+57,1%");
    expect(formatarVariacao(-52.9)).toBe("-52,9%");
    expect(formatarVariacao(null)).toBe("novo");
  });

  it("origem: fonte e fornecedor", () => {
    expect(origemTexto("pesquisa_web", "Super Muffato")).toBe("Pesquisa web · Super Muffato");
    expect(origemTexto("cotacao_pdf", null)).toBe("Cotação (PDF)");
    expect(origemTexto(null, null)).toBe("sem registro");
  });

  it("legenda conta mudanças e destaques", () => {
    const { mudancas } = consolidarAlteracoes([alt(1, 1, 10, 20, "2026-11-04T10:00:00Z"), alt(2, 2, 10, 11, "2026-11-04T10:00:00Z")]);
    expect(legendaResumoPrecos({ mudancas, periodo: { de: "2026-11-03", ate: "2026-11-04" } })).toBe(
      "Preços de insumos atualizados (03/11/2026 a 04/11/2026): 2 insumos mudaram, 1 com variação acima de 30%. No PDF: o que mudou e a tabela completa de preços.",
    );
  });
});

describe("gerarResumoPrecosPdf", () => {
  const tabela: InsumoTabela[] = Array.from({ length: 150 }, (_, i) => ({
    insumoId: i + 1,
    nome: i === 0 ? "Sobrecoxa De Frango Desossada com um nome bem comprido para quebrar a linha" : `Insumo ${i + 1}`,
    unidade: i % 2 ? "KG" : "Maço",
    preco: 10 + i,
    fonte: i % 3 ? "pesquisa_web" : null,
    fornecedor: i % 3 ? "Super Muffato" : null,
    atualizadoEm: i % 4 ? "2026-11-04" : null,
  }));

  it("gera um PDF de várias páginas com acentos e sem quebrar", async () => {
    const { mudancas } = consolidarAlteracoes(
      Array.from({ length: 40 }, (_, i) => alt(i + 1, i + 1, 10, 10 + i, "2026-11-04T10:00:00Z")),
    );
    const bytes = await gerarResumoPrecosPdf({ mudancas, tabela, periodo: { de: "2026-11-04", ate: "2026-11-04" }, hoje: "2026-11-04", geradoEm: "04/11/2026 18:00" });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(3);
  });

  it("recusa resumo sem mudanças", async () => {
    await expect(
      gerarResumoPrecosPdf({ mudancas: [], tabela, periodo: { de: "2026-11-04", ate: "2026-11-04" }, hoje: "2026-11-04", geradoEm: "x" }),
    ).rejects.toThrow();
  });
});
