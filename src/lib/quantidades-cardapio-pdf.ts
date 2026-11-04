import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { paraWinAnsi, quebrar } from "@/lib/lista-compras-pdf";
import type { DebugCalculoResultado } from "@/lib/debug-calculo-cardapio";

/**
 * PDF "Quantidades do cardápio" do Simulador ("Ver cálculos" → Exportar PDF): item, consumo previsto
 * e custo. Só apresenta o que o diagnóstico (calcularDebugCardapio) já calculou; nenhuma fórmula nova.
 * Mesmo padrão de lista-compras-pdf.ts: pdf-lib, fontes padrão (WinAnsi), função pura que devolve bytes.
 */

export type LinhaQuantidadeCardapio = {
  nome: string;
  /** Consumo previsto do item no evento, na unidade da macro-categoria (g ou ml). */
  quantidade: number;
  unidade: string;
  /** Custo do item no evento (custo da ficha técnica × quantidade). */
  custo: number;
};

export type DadosQuantidadesCardapioPdf = {
  adultos: number;
  criancasAte5: number;
  criancas5a10: number;
  /** Já formatada (data e hora de geração). */
  geradoEm: string;
  itens: LinhaQuantidadeCardapio[];
  /** Itens selecionados que não entraram no cálculo: continuam visíveis, nunca somem em silêncio. */
  foraDoCalculo: { preparo: string; motivo: string }[];
};

/** Linhas do diagnóstico → linhas do PDF, na mesma ordem da tabela "Ver cálculos". */
export function montarLinhasQuantidades(debug: DebugCalculoResultado): LinhaQuantidadeCardapio[] {
  return debug.linhas.map((l) => ({
    nome: l.preparoNome,
    quantidade: l.volumeNecessarioTotal,
    unidade: l.unidadeMacro,
    custo: l.custoTotalItem,
  }));
}

/** 1234.5 → "1.234,5" (separador de milhar e vírgula decimal, sem depender de ICU). */
export function formatarNumero(valor: number, casasMax: number, casasMin = 0): string {
  const [inteiro, decimais = ""] = Math.abs(valor).toFixed(casasMax).split(".");
  let dec = decimais.replace(/0+$/, "");
  if (dec.length < casasMin) dec = dec.padEnd(casasMin, "0");
  const int = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${valor < 0 ? "-" : ""}${int}${dec ? `,${dec}` : ""}`;
}

/** 4500 g → "4.500 g (4,5 kg)"; 850 g → "850 g"; 1500 ml → "1.500 ml (1,5 L)". */
export function formatarConsumo(quantidade: number, unidade: string): string {
  const base = `${formatarNumero(quantidade, 0)} ${unidade}`;
  const maior = unidade.toLowerCase() === "g" ? "kg" : unidade.toLowerCase() === "ml" ? "L" : null;
  if (!maior || quantidade < 1000) return base;
  return `${base} (${formatarNumero(quantidade / 1000, 2)} ${maior})`;
}

export function formatarReais(valor: number): string {
  return `R$ ${formatarNumero(valor, 2, 2)}`;
}

export function descreverConvidados(d: Pick<DadosQuantidadesCardapioPdf, "adultos" | "criancasAte5" | "criancas5a10">): string {
  const total = d.adultos + d.criancasAte5 + d.criancas5a10;
  const partes = [
    `${d.adultos} ${d.adultos === 1 ? "adulto" : "adultos"}`,
    d.criancasAte5 > 0 ? `${d.criancasAte5} até 5 anos` : null,
    d.criancas5a10 > 0 ? `${d.criancas5a10} de 5 a 10 anos` : null,
  ].filter((p): p is string => p !== null);
  return partes.length > 1 ? `${total} (${partes.join(", ")})` : String(total);
}

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const COL_CUSTO = 95;
const COL_CONSUMO = 150;
const COL_ITEM = LARGURA_UTIL - COL_CONSUMO - COL_CUSTO;
const TAMANHO_TEXTO = 10;
const ENTRELINHA = 13;
const PADDING_LINHA = 6;
const RODAPE_Y = 24;
const LIMITE_INFERIOR = 50;
const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.45, 0.45, 0.45);
const CINZA_CLARO = rgb(0.9, 0.9, 0.9);

export async function gerarQuantidadesCardapioPdf(d: DadosQuantidadesCardapioPdf): Promise<Uint8Array> {
  if (d.itens.length === 0) throw new Error("Nenhum item calculado para exportar.");

  const pdf = await PDFDocument.create();
  pdf.setTitle("Quantidades do cardápio");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina: PDFPage = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - MARGEM;

  const texto = (t: string, x: number, yy: number, fonte: PDFFont, tamanho = TAMANHO_TEXTO, cor = PRETO) =>
    pagina.drawText(paraWinAnsi(t), { x, y: yy, size: tamanho, font: fonte, color: cor });
  const aDireita = (t: string, xFim: number, yy: number, fonte: PDFFont, tamanho = TAMANHO_TEXTO, cor = PRETO) =>
    texto(t, xFim - fonte.widthOfTextAtSize(paraWinAnsi(t), tamanho), yy, fonte, tamanho, cor);

  const xConsumoFim = MARGEM + COL_ITEM + COL_CONSUMO - 4;
  const xCustoFim = MARGEM + LARGURA_UTIL - 4;

  texto("QUANTIDADES DO CARDÁPIO", MARGEM, y - 18, negrito, 18);
  y -= 36;
  texto(`Convidados: ${descreverConvidados(d)}`, MARGEM, y - 11, normal, 11);
  y -= 15;
  texto("Consumo previsto de cada item para este número de convidados.", MARGEM, y - 10, normal, 9, CINZA);
  y -= 20;

  const cabecalhoTabela = () => {
    const altura = 20;
    pagina.drawRectangle({ x: MARGEM, y: y - altura, width: LARGURA_UTIL, height: altura, color: CINZA_CLARO });
    const base = y - 14;
    texto("Item", MARGEM + 4, base, negrito);
    aDireita("Consumo previsto", xConsumoFim, base, negrito);
    aDireita("Custo", xCustoFim, base, negrito);
    y -= altura;
  };
  const novaPagina = () => {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - MARGEM;
  };
  const separador = () =>
    pagina.drawLine({ start: { x: MARGEM, y }, end: { x: MARGEM + LARGURA_UTIL, y }, thickness: 0.4, color: CINZA_CLARO });

  cabecalhoTabela();

  for (const item of d.itens) {
    const linhasNome = quebrar(item.nome, normal, TAMANHO_TEXTO, COL_ITEM - 12);
    const altura = linhasNome.length * ENTRELINHA + PADDING_LINHA * 2 - 2;
    // Nunca corta a linha entre páginas.
    if (y - altura < LIMITE_INFERIOR) {
      novaPagina();
      cabecalhoTabela();
    }
    const topo = y - PADDING_LINHA - 9;
    linhasNome.forEach((t, i) => texto(t, MARGEM + 4, topo - i * ENTRELINHA, normal));
    aDireita(formatarConsumo(item.quantidade, item.unidade), xConsumoFim, topo, normal);
    aDireita(formatarReais(item.custo), xCustoFim, topo, normal);
    y -= altura;
    separador();
  }

  // Total = soma das linhas mostradas (o leitor confere somando a coluna).
  if (y - 24 < LIMITE_INFERIOR) {
    novaPagina();
    cabecalhoTabela();
  }
  const total = d.itens.reduce((soma, i) => soma + i.custo, 0);
  texto("Total", MARGEM + 4, y - 15, negrito);
  aDireita(formatarReais(total), xCustoFim, y - 15, negrito);
  y -= 24;

  if (d.foraDoCalculo.length > 0) {
    const linhas = d.foraDoCalculo.map((f) => quebrar(`${f.preparo} - ${f.motivo}`, normal, 9, LARGURA_UTIL - 8));
    const alturaBloco = 40 + linhas.reduce((soma, l) => soma + l.length * 12, 0);
    if (y - Math.min(alturaBloco, 120) < LIMITE_INFERIOR) novaPagina();
    y -= 22;
    texto("Fora do cálculo (sem quantidade nem custo acima)", MARGEM, y, negrito, 11);
    y -= 6;
    for (const trechos of linhas) {
      for (const t of trechos) {
        if (y - 12 < LIMITE_INFERIOR) novaPagina();
        y -= 12;
        texto(t, MARGEM + 4, y, normal, 9);
      }
    }
  }

  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText(paraWinAnsi(`Gerado em ${d.geradoEm}`), { x: MARGEM, y: RODAPE_Y, size: 8, font: normal, color: CINZA });
    const numero = paraWinAnsi(`Página ${i + 1} de ${paginas.length}`);
    p.drawText(numero, {
      x: MARGEM + LARGURA_UTIL - normal.widthOfTextAtSize(numero, 8),
      y: RODAPE_Y,
      size: 8,
      font: normal,
      color: CINZA,
    });
  });

  return pdf.save();
}
