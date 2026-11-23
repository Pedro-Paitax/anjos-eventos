import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { paraWinAnsi, quebrar } from "@/lib/lista-compras-pdf";
import type { CategoriaChecklist, LinhaChecklist } from "@/lib/checklist-carregamento";

// Igual ao protótipo aprovado (docs/specs/prototipo-checklist-pdf.mjs): pdf-lib, Helvetica, A4,
// duas colunas. Função pura que devolve os bytes, no padrão de lista-compras-pdf.ts.

export type DadosChecklistPdf = {
  cliente: string;
  /** tipo_evento como está no evento; sai em maiúsculas na caixa de destaque. */
  tipoEvento: string | null;
  /** Já formatada ("sáb, 12/12/2026"). */
  data: string;
  /** "09:00"; null = não informada. */
  chegada: string | null;
  convidados: string | null;
  local: string | null;
  veiculo: string | null;
  observacoes: string | null;
  categorias: CategoriaChecklist[];
  fichasSemItens: string[];
  /** Já formatada (rodapé). */
  geradoEm: string;
};

// ---------- layout (constantes do protótipo) ----------
const W = 595;
const H = 842;
const M = 36;
const UTIL = W - 2 * M;
const GAP = 18;
const COL = (UTIL - GAP) / 2;
const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.42, 0.42, 0.42);
const CINZA_CLARO = rgb(0.88, 0.88, 0.88);
const FUNDO = rgb(0.95, 0.95, 0.95);
const BRASA = rgb(0.95, 0.46, 0.25); // #f2753f
const LINHA = 17; // altura de cada item (espaço para marcar à caneta)
const CAIXA = 10;
const TITULO_H = 22;
const SUB_H = 15;
const RODAPE = 24;
const BASE = 46;
const TEXTO = 10;
const NOTA = 7.5;
const ENTRELINHA_ITEM = 11;
const ENTRELINHA_NOTA = 9;
/** Nota mais larga que isto vai para a linha de baixo, em vez de espremer o nome do item. */
const NOTA_MAX_LADO = COL * 0.55;
const PAGINA_UTIL = H - M - BASE;
const VAZIO = "-";

type Linha = { tipo: "sub"; nome: string } | { tipo: "item"; item: LinhaChecklist };

function linhasDe(c: CategoriaChecklist): Linha[] {
  const out: Linha[] = c.itens.map((item) => ({ tipo: "item", item }));
  for (const s of c.sub) {
    if (s.itens.length === 0) continue;
    out.push({ tipo: "sub", nome: s.nome });
    for (const item of s.itens) out.push({ tipo: "item", item });
  }
  return out;
}

/** Como o item é desenhado: linhas do nome e da nota (ao lado ou embaixo). */
function layoutItem(item: LinhaChecklist, fN: PDFFont) {
  const nota = item.nota ? paraWinAnsi(item.nota) : null;
  const notaW = nota ? fN.widthOfTextAtSize(nota, NOTA) + 6 : 0;
  const xTexto = item.aDefinir ? 0 : 17;
  const larguraNome = COL - xTexto - 1;
  // Nota ao lado (como no protótipo) quando cabe sem quebrar o nome; senão, na linha de baixo.
  const notaAoLado =
    nota !== null && notaW <= NOTA_MAX_LADO && quebrar(item.texto, fN, TEXTO, larguraNome - notaW).length === 1;
  const nome = quebrar(item.texto, fN, TEXTO, larguraNome - (notaAoLado ? notaW : 0));
  const notaEmbaixo = nota && !notaAoLado ? quebrar(nota, fN, NOTA, larguraNome) : [];
  const altura = LINHA + (nome.length - 1) * ENTRELINHA_ITEM + notaEmbaixo.length * ENTRELINHA_NOTA;
  return { nome, nota, notaW, notaAoLado, notaEmbaixo, xTexto, altura };
}

export async function gerarChecklistPdf(d: DadosChecklistPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fN = await pdf.embedFont(StandardFonts.Helvetica);
  const fB = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pg: PDFPage = pdf.addPage([W, H]);
  const txt = (s: string, x: number, y: number, f: PDFFont = fN, size = TEXTO, color = PRETO) =>
    pg.drawText(paraWinAnsi(s), { x, y, size, font: f, color });
  const largura = (s: string, f: PDFFont, size: number) => f.widthOfTextAtSize(paraWinAnsi(s), size);

  // ---------- cabeçalho ----------
  let y = H - M;
  pg.drawRectangle({ x: M, y: y - 4, width: 34, height: 4, color: BRASA });
  txt("BUFFET SENHOR CHURRASCO", M, y - 18, fB, 9, CINZA);
  txt("Checklist de carregamento", M, y - 40, fB, 20);

  // Caixa de destaque: chegada da equipe + tipo do evento.
  const bw = 150;
  const bh = 52;
  const bx = M + UTIL - bw;
  const by = y - 8 - bh;
  pg.drawRectangle({ x: bx, y: by, width: bw, height: bh, borderColor: PRETO, borderWidth: 1.4 });
  pg.drawRectangle({ x: bx, y: by, width: 4, height: bh, color: BRASA });
  txt("CHEGADA DA EQUIPE", bx + 12, by + bh - 14, fB, 7.5, CINZA);
  txt(d.chegada ?? "--:--", bx + 12, by + 10, fB, 24);
  if (d.tipoEvento && d.tipoEvento.trim()) {
    const chegadaW = largura(d.chegada ?? "--:--", fB, 24);
    const max = bw - 12 - chegadaW - 10 - 10;
    let tipo = paraWinAnsi(d.tipoEvento.trim().toUpperCase());
    while (tipo.length > 1 && fB.widthOfTextAtSize(tipo, 8.5) > max) tipo = tipo.slice(0, -1);
    if (tipo !== paraWinAnsi(d.tipoEvento.trim().toUpperCase())) tipo = `${tipo.slice(0, -1)}.`;
    txt(tipo, bx + bw - 10 - largura(tipo, fB, 8.5), by + 12, fB, 8.5);
  }
  y -= 70;

  // Grade: cliente, data, convidados, veículo, local. Valor longo quebra em até 2 linhas.
  const info: [string, string][] = [
    ["Cliente", d.cliente],
    ["Data", d.data],
    ["Convidados", d.convidados ?? VAZIO],
    ["Veículo", d.veiculo ?? "a definir"],
    ["Local", d.local ?? VAZIO],
  ];
  const colInfo = UTIL / 2;
  for (let i = 0; i < info.length; i += 2) {
    const par = info.slice(i, i + 2).map(([k, v]) => [k, quebrar(v, fN, 10.5, colInfo - 10).slice(0, 2)] as const);
    const extra = Math.max(...par.map(([, l]) => l.length)) - 1;
    par.forEach(([k, linhas], j) => {
      const x = M + j * colInfo;
      txt(k.toUpperCase(), x, y - 8, fB, 7, CINZA);
      linhas.forEach((l, n) => txt(l, x, y - 21 - n * 12, fN, 10.5));
    });
    y -= 30 + extra * 12;
  }
  y -= 4;

  // Observações do evento (só se houver).
  if (d.observacoes && d.observacoes.trim()) {
    const obsLinhas = quebrar(d.observacoes.trim(), fN, 10, UTIL - 20);
    const obsH = 22 + obsLinhas.length * 13;
    pg.drawRectangle({ x: M, y: y - obsH, width: UTIL, height: obsH, color: FUNDO });
    pg.drawRectangle({ x: M, y: y - obsH, width: 3, height: obsH, color: BRASA });
    txt("OBSERVAÇÕES DO EVENTO", M + 12, y - 13, fB, 7, CINZA);
    obsLinhas.forEach((l, i) => txt(l, M + 12, y - 27 - i * 13, fN, 10));
    y -= obsH + 16;
  } else {
    y -= 8;
  }

  // ---------- categorias em duas colunas ----------
  const topo = { 0: y, 1: y };
  let col: 0 | 1 = 0;
  let cursor = y;
  const xCol = () => M + col * (COL + GAP);

  const novaPagina = () => {
    pg = pdf.addPage([W, H]);
    cursor = H - M;
    col = 0;
    topo[0] = topo[1] = H - M;
  };
  const proximaColuna = () => {
    if (col === 0) {
      col = 1;
      cursor = topo[1];
    } else novaPagina();
  };

  const alturaLinha = (l: Linha) => (l.tipo === "sub" ? SUB_H : layoutItem(l.item, fN).altura);
  const alturaBloco = (c: CategoriaChecklist) => TITULO_H + linhasDe(c).reduce((a, l) => a + alturaLinha(l), 0) + 12;

  const titulo = (t: string, cont = false) => {
    const x = xCol();
    txt(t.toUpperCase() + (cont ? " (cont.)" : ""), x, cursor - 14, fB, 10.5);
    pg.drawLine({ start: { x, y: cursor - 19 }, end: { x: x + COL, y: cursor - 19 }, thickness: 1.2, color: PRETO });
    cursor -= TITULO_H;
  };

  for (const cat of d.categorias) {
    const linhas = linhasDe(cat);
    // Categoria inteira numa coluna; se for maior que uma coluna inteira, começa aqui e continua.
    if (cursor - alturaBloco(cat) < BASE && alturaBloco(cat) <= PAGINA_UTIL) proximaColuna();
    if (cursor - TITULO_H - (linhas[0] ? alturaLinha(linhas[0]) : 0) < BASE) proximaColuna();
    titulo(cat.titulo);

    linhas.forEach((l, idx) => {
      // Subtítulo nunca fica sozinho no pé da coluna.
      const precisa = l.tipo === "sub" && linhas[idx + 1] ? SUB_H + alturaLinha(linhas[idx + 1]) : alturaLinha(l);
      if (cursor - precisa < BASE) {
        proximaColuna();
        titulo(cat.titulo, true);
      }
      const x = xCol();
      if (l.tipo === "sub") {
        txt(l.nome.toUpperCase(), x, cursor - 11, fB, 7.5, CINZA);
        cursor -= SUB_H;
        return;
      }
      const it = layoutItem(l.item, fN);
      const cor = l.item.aDefinir ? CINZA : PRETO;
      if (!l.item.aDefinir) {
        pg.drawRectangle({ x, y: cursor - 12.5, width: CAIXA, height: CAIXA, borderColor: PRETO, borderWidth: 0.9 });
      }
      it.nome.forEach((s, i) => txt(s, x + it.xTexto, cursor - 11.5 - i * ENTRELINHA_ITEM, fN, TEXTO, cor));
      if (it.nota && it.notaAoLado) txt(it.nota, x + COL - it.notaW + 6, cursor - 11, fN, NOTA, CINZA);
      const yNota = cursor - 11.5 - (it.nome.length - 1) * ENTRELINHA_ITEM - ENTRELINHA_NOTA - 1;
      it.notaEmbaixo.forEach((s, i) => txt(s, x + it.xTexto, yNota - i * ENTRELINHA_NOTA, fN, NOTA, CINZA));
      cursor -= it.altura;
      pg.drawLine({
        start: { x: x + it.xTexto, y: cursor + 1 },
        end: { x: x + COL, y: cursor + 1 },
        thickness: 0.4,
        color: CINZA_CLARO,
      });
    });
    cursor -= 12;
  }

  // Aviso das fichas sem itens de carga (C21), em caixa tracejada.
  if (d.fichasSemItens.length > 0) {
    const msg = `Fichas sem itens de carga cadastrados: ${d.fichasSemItens.join(", ")}. Confira à mão o que elas precisam.`;
    const linhas = quebrar(msg, fN, 9, COL - 16);
    const h = 14 + linhas.length * 12;
    if (cursor - h < BASE) proximaColuna();
    const x = xCol();
    pg.drawRectangle({ x, y: cursor - h, width: COL, height: h, borderColor: CINZA, borderWidth: 0.8, borderDashArray: [3, 2] });
    linhas.forEach((l, i) => txt(l, x + 8, cursor - 13 - i * 12, fN, 9, CINZA));
  }

  // Rodapé em todas as páginas.
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const r = paraWinAnsi(`Gerado em ${d.geradoEm}`);
    p.drawText(r, { x: M, y: RODAPE, size: 8, font: fN, color: CINZA });
    const n = paraWinAnsi(`Página ${i + 1} de ${paginas.length}`);
    p.drawText(n, { x: M + UTIL - fN.widthOfTextAtSize(n, 8), y: RODAPE, size: 8, font: fN, color: CINZA });
  });

  return pdf.save();
}
