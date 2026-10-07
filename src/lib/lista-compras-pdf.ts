import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Mesmo padrão de ordem-acao.ts: pdf-lib, fontes padrão (WinAnsi), função pura que devolve os bytes.

/** Só nomes: não há ficha técnica nem fórmula de volume por convidados para estes itens. */
export const CONSUMIVEIS_OPERACIONAIS = [
  "Carvão",
  "Gelo",
  "Sal grosso",
  "Papel toalha",
  "Sacos de lixo",
  "Papel alumínio",
] as const;

export type LinhaPdfCompras = {
  nome: string;
  unidade: string;
  quantidadeCompra: number;
  semPreco: boolean;
  semFator: boolean;
};

export type DadosListaComprasPdf = {
  cliente: string;
  empresa: string;
  /** Já formatada. */
  dataEvento: string;
  convidados: number | null;
  /** Já formatada (data de geração, no rodapé). */
  geradoEm: string;
  itens: LinhaPdfCompras[];
};

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const COL_INSUMO = 285;
const COL_QTD = 85;
const COL_UNIDADE = 80;
const TAMANHO_TEXTO = 10;
const ENTRELINHA = 13;
const PADDING_LINHA = 6;
const LADO_CAIXA = 11;
const RODAPE_Y = 24;
const LIMITE_INFERIOR = 50; // acima do rodapé
const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.45, 0.45, 0.45);
const CINZA_CLARO = rgb(0.9, 0.9, 0.9);

// Fontes padrão cobrem português (WinAnsi); o resto vira "?".
function paraWinAnsi(texto: string): string {
  return Array.from(texto.replace(/\r?\n/g, " "))
    .map((c) => (c.charCodeAt(0) <= 0xff ? c : "?"))
    .join("");
}

function quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of paraWinAnsi(texto).split(" ")) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (atual && fonte.widthOfTextAtSize(teste, tamanho) > largura) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

/** 2,4 / 12 / 0,9 (vírgula decimal, sem depender de ICU). */
export function formatarQuantidadeCompra(valor: number): string {
  return String(Number(valor.toFixed(2))).replace(".", ",");
}

export async function gerarListaComprasPdf(d: DadosListaComprasPdf): Promise<Uint8Array> {
  if (d.itens.length === 0) throw new Error("Lista de compras vazia: o evento não tem cardápio confirmado.");

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina: PDFPage = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - MARGEM;

  const texto = (
    t: string,
    x: number,
    yy: number,
    fonte: PDFFont,
    tamanho = TAMANHO_TEXTO,
    cor = PRETO,
  ) => pagina.drawText(paraWinAnsi(t), { x, y: yy, size: tamanho, font: fonte, color: cor });

  const novaPagina = () => {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - MARGEM;
  };

  // Cabeçalho do documento (só na primeira página).
  texto("LISTA DE COMPRAS", MARGEM, y - 18, negrito, 18);
  y -= 34;
  const linhasCabecalho = [
    `Cliente / evento: ${d.cliente}`,
    `Empresa: ${d.empresa}`,
    `Data do evento: ${d.dataEvento}`,
    `Convidados: ${d.convidados ?? "-"}`,
  ];
  for (const l of linhasCabecalho) {
    for (const trecho of quebrar(l, normal, 11, LARGURA_UTIL)) {
      texto(trecho, MARGEM, y - 11, normal, 11);
      y -= 15;
    }
  }
  y -= 8;

  const x1 = MARGEM;
  const x2 = x1 + COL_INSUMO;
  const x3 = x2 + COL_QTD;
  const x4 = x3 + COL_UNIDADE;

  const cabecalhoTabela = () => {
    const altura = 20;
    pagina.drawRectangle({ x: MARGEM, y: y - altura, width: LARGURA_UTIL, height: altura, color: CINZA_CLARO });
    const base = y - 14;
    texto("Insumo", x1 + 4, base, negrito);
    texto("Qtd. a comprar", x2 + COL_QTD - 4 - negrito.widthOfTextAtSize("Qtd. a comprar", TAMANHO_TEXTO), base, negrito);
    texto("Unidade", x3 + 10, base, negrito);
    texto("Ok", x4 + 18, base, negrito);
    y -= altura;
  };
  cabecalhoTabela();

  for (const item of d.itens) {
    const marcas = [item.semPreco ? "sem preço" : null, item.semFator ? "sem fator" : null]
      .filter((m): m is string => m !== null)
      .join(" | ");
    const larguraMarcas = marcas ? normal.widthOfTextAtSize(marcas, 7) + 8 : 0;
    const linhasNome = quebrar(item.nome, normal, TAMANHO_TEXTO, COL_INSUMO - 8 - larguraMarcas);
    const altura = Math.max(linhasNome.length * ENTRELINHA + PADDING_LINHA * 2 - 2, LADO_CAIXA + PADDING_LINHA * 2);

    // Nunca corta a linha entre páginas: se não cabe, a linha inteira vai para a próxima.
    if (y - altura < LIMITE_INFERIOR) {
      novaPagina();
      cabecalhoTabela();
    }

    const topo = y - PADDING_LINHA;
    linhasNome.forEach((t, i) => texto(t, x1 + 4, topo - 9 - i * ENTRELINHA, normal));
    if (marcas) texto(marcas, x2 - 4 - (larguraMarcas - 8), topo - 8, normal, 7, CINZA);

    const qtd = formatarQuantidadeCompra(item.quantidadeCompra);
    texto(qtd, x2 + COL_QTD - 4 - normal.widthOfTextAtSize(qtd, TAMANHO_TEXTO), topo - 9, normal);
    texto(item.unidade, x3 + 10, topo - 9, normal);
    pagina.drawRectangle({
      x: x4 + 16,
      y: y - altura / 2 - LADO_CAIXA / 2,
      width: LADO_CAIXA,
      height: LADO_CAIXA,
      borderColor: PRETO,
      borderWidth: 0.8,
    });

    y -= altura;
    pagina.drawLine({
      start: { x: MARGEM, y },
      end: { x: MARGEM + LARGURA_UTIL, y },
      thickness: 0.4,
      color: CINZA_CLARO,
    });
  }

  // Consumíveis: só nomes, quantidade em branco para preencher à mão. Bloco inteiro na mesma página.
  const alturaBloco = 24 + 30 + CONSUMIVEIS_OPERACIONAIS.length * 22 + 10;
  if (y - alturaBloco < LIMITE_INFERIOR) novaPagina();
  y -= 22;
  texto("Consumíveis operacionais (conferir quantidades)", MARGEM, y, negrito, 12);
  y -= 15;
  texto("Itens sem ficha técnica; quantidade a definir.", MARGEM, y, normal, 9, CINZA);
  y -= 8;
  for (const nome of CONSUMIVEIS_OPERACIONAIS) {
    y -= 22;
    texto(nome, MARGEM + 4, y + 4, normal);
    texto("Qtd.:", x2 - 10, y + 4, normal, 9, CINZA);
    pagina.drawLine({
      start: { x: x2 + 20, y },
      end: { x: x3 + 40, y },
      thickness: 0.6,
      color: PRETO,
    });
  }

  // Rodapé em todas as páginas.
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const rodape = `Gerado em ${d.geradoEm}`;
    p.drawText(paraWinAnsi(rodape), { x: MARGEM, y: RODAPE_Y, size: 8, font: normal, color: CINZA });
    const numero = `Página ${i + 1} de ${paginas.length}`;
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
