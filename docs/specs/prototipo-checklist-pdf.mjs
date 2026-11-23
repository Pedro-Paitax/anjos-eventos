// Protótipo do PDF do checklist de carregamento, no mesmo padrão da lista de compras
// (pdf-lib, Helvetica, A4). Dados fictícios.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "node:fs";

const evento = {
  cliente: "Casamento Ana & Bruno (EXEMPLO)",
  tipo: "Casamento",
  data: "sáb, 12/12/2026",
  chegada: "09:00",
  aperitivo: "11:30",
  convidados: "80 adultos · 6 crianças",
  endereco: "Chácara Recanto Verde · Colombo",
  veiculo: "Master",
  observacoes:
    "O local tem churrasqueira e fogão. Levar extensão de 10 m (tomada longe da área do buffet).",
};

const cardapio = {
  Carnes: ["Fraldinha", "Picanha Suína", "Sobrecoxa Desossada", "Linguiça Toscana", "Costela Janela"],
  Entradas: ["Pão de Alho Caseiro", "Queijo Coalho", "Bruschetta com Provolone"],
  Saladas: ["Mix de Folhas", "Vinagrete", "Maionese Tradicional"],
  Guarnições: ["Arroz Branco", "Farofa da Casa", "Mandioca com Ragu de Linguiça"],
  Bebidas: ["Suco de Laranja"],
};
const totalPreparos = Object.values(cardapio).flat().length;

const categorias = [
  {
    titulo: "Talheres de serviço",
    itens: [
      { t: `Pegadores / colheres (${totalPreparos * 2})`, nota: `2 x ${totalPreparos} preparos` },
      "Chaira / pedra / afiador",
      "Facas de carne",
      "Faca do chef",
      "Faca de serrinha",
      { t: "Espátula de bolo", nota: "casamento" },
    ],
  },
  {
    titulo: "Churrasco",
    itens: ["Cano com espetos", "Parrilla pequena", "Carvão", "Álcool etanol"],
  },
  {
    titulo: "Limpeza",
    itens: [
      "Pano de prato", "Perflex", "Esponjas", "Bombril", "Detergente / sabão",
      "Pasta limpa-alumínio", "Fósforo", "Álcool + borrifador", "Pano de polimento",
      "Sacos de lixo", "Papel-filme", "Rolo de sacolinha",
    ],
  },
  {
    titulo: "Temperos",
    sub: [
      { nome: "Fixos", itens: ["Sal de parrilla", "Sal grosso", "Sal temperado", "Sal comum", "Óleo", "Azeite", "Alho triturado", "Alho"] },
      { nome: "Buffet", itens: ["Azeite do buffet", "Vinagre do buffet", "Sal do buffet"] },
      { nome: "Do cardápio", itens: [
        { t: "Páprica defumada", nota: "Picanha Suína" },
        { t: "Mostarda dijon", nota: "Maionese" },
        { t: "Noz-moscada", nota: "Mandioca com Ragu" },
        { t: "Orégano", nota: "Bruschetta" },
      ] },
    ],
  },
  {
    titulo: "Louças e servir",
    sub: [
      { nome: "Sempre", itens: ["Bowls de reposição", "Travessas de inox", "Tábuas de carne", "Tábuas de salada", "Tábuas padrão", "Louças de cerâmica"] },
      { nome: "Do cardápio", itens: [
        { t: "Saladeiras", nota: "Mix, Vinagrete, Maionese" },
        { t: "Rechauds", nota: "Arroz, Mandioca" },
      ] },
    ],
  },
  {
    titulo: "Bebidas",
    itens: [
      { t: "Suqueiras", nota: "Suco de Laranja" },
      { t: "Jarras grandes", nota: "Suco de Laranja" },
    ],
  },
  {
    titulo: "Equipamentos",
    itens: [
      { t: "Processador", nota: "Maionese" },
      { t: "Cabrita (cortador)", nota: "Vinagrete" },
    ],
  },
  {
    titulo: "Descartáveis",
    itens: ["Copos", "Pratinhos", "Garfinhos", "Guardanapos", "Luvas descartáveis"],
  },
  { titulo: "Pratos", itens: ["Pratos redondos grandes", "Sousplat"] },
  { titulo: "Talheres dos convidados", itens: ["Talheres grandes"] },
  {
    titulo: "Taças e copos",
    itens: ["Taças", { t: "Taças de champanhe", nota: "80 un." }],
  },
  { titulo: "Equipe", itens: ["Uniformes"] },
  {
    titulo: "Comida",
    sub: [
      { nome: "Carnes", itens: cardapio.Carnes },
      { nome: "Saladas", itens: cardapio.Saladas },
      { nome: "Outros", itens: [...cardapio.Entradas, ...cardapio.Guarnições, ...cardapio.Bebidas] },
    ],
  },
];
const fichasSemItens = ["Picanha Suína", "Queijo Coalho", "Costela Janela"];

// ---------- layout ----------
const W = 595, H = 842, M = 36;
const UTIL = W - 2 * M;
const GAP = 18;
const COL = (UTIL - GAP) / 2;
const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.42, 0.42, 0.42);
const CINZA_CLARO = rgb(0.88, 0.88, 0.88);
const FUNDO = rgb(0.95, 0.95, 0.95);
const BRASA = rgb(0.95, 0.46, 0.25); // cor da marca Senhor Churrasco (#f2753f)
const LINHA = 17; // altura de cada item (espaço para marcar à caneta)
const CAIXA = 10;
const TITULO_H = 22;
const SUB_H = 15;
const RODAPE = 24;
const BASE = 46;

const pdf = await PDFDocument.create();
const fN = await pdf.embedFont(StandardFonts.Helvetica);
const fB = await pdf.embedFont(StandardFonts.HelveticaBold);
const win = (s) => Array.from(s).map((c) => (c.charCodeAt(0) <= 0xff ? c : "-")).join("");

let pg = pdf.addPage([W, H]);
const txt = (s, x, y, f = fN, size = 10, color = PRETO) => pg.drawText(win(s), { x, y, size, font: f, color });
const largura = (s, f, size) => f.widthOfTextAtSize(win(s), size);

function quebrar(s, f, size, max) {
  const out = []; let cur = "";
  for (const p of win(s).split(" ")) {
    const t = cur ? `${cur} ${p}` : p;
    if (cur && f.widthOfTextAtSize(t, size) > max) { out.push(cur); cur = p; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

// Cabeçalho
let y = H - M;
pg.drawRectangle({ x: M, y: y - 4, width: 34, height: 4, color: BRASA });
txt("BUFFET SENHOR CHURRASCO", M, y - 18, fB, 9, CINZA);
txt("Checklist de carregamento", M, y - 40, fB, 20);
// Bloco de destaque: chegada da equipe + tipo do evento
const bw = 150, bh = 52, bx = M + UTIL - bw, by = y - 8 - bh;
pg.drawRectangle({ x: bx, y: by, width: bw, height: bh, borderColor: PRETO, borderWidth: 1.4 });
pg.drawRectangle({ x: bx, y: by, width: 4, height: bh, color: BRASA });
txt("CHEGADA DA EQUIPE", bx + 12, by + bh - 14, fB, 7.5, CINZA);
txt(evento.chegada, bx + 12, by + 10, fB, 24);
const tipoTxt = evento.tipo.toUpperCase();
txt(tipoTxt, bx + bw - 10 - largura(tipoTxt, fB, 8.5), by + 12, fB, 8.5);
y -= 70;

const info = [
  ["Cliente", evento.cliente],
  ["Data", evento.data],
  ["Convidados", evento.convidados],
  ["Veículo", evento.veiculo],
  ["Local", evento.endereco],
];
const colInfo = UTIL / 2;
info.forEach(([k, v], i) => {
  const x = M + (i % 2) * colInfo;
  const yy = y - Math.floor(i / 2) * 30;
  txt(k.toUpperCase(), x, yy - 8, fB, 7, CINZA);
  const linhas = quebrar(v, fN, 10.5, colInfo - 10);
  txt(linhas.length > 1 ? linhas.join(' ').slice(0, 200) : linhas[0], x, yy - 21, fN, 10.5);
});
y -= Math.ceil(info.length / 2) * 30 + 4;

// Observações
const obsLinhas = quebrar(evento.observacoes, fN, 10, UTIL - 20);
const obsH = 22 + obsLinhas.length * 13;
pg.drawRectangle({ x: M, y: y - obsH, width: UTIL, height: obsH, color: FUNDO });
pg.drawRectangle({ x: M, y: y - obsH, width: 3, height: obsH, color: BRASA });
txt("OBSERVAÇÕES DO EVENTO", M + 12, y - 13, fB, 7, CINZA);
obsLinhas.forEach((l, i) => txt(l, M + 12, y - 27 - i * 13, fN, 10));
y -= obsH + 16;

// Blocos em duas colunas
function itensDe(cat) {
  const linhas = [];
  if (cat.itens) cat.itens.forEach((it) => linhas.push({ tipo: "item", it }));
  if (cat.sub) cat.sub.forEach((s) => {
    linhas.push({ tipo: "sub", nome: s.nome });
    s.itens.forEach((it) => linhas.push({ tipo: "item", it }));
  });
  return linhas;
}
function alturaLinha(l) {
  if (l.tipo === "sub") return SUB_H;
  const t = typeof l.it === "string" ? l.it : l.it.t;
  return quebrar(t, fN, 10, COL - 22).length > 1 ? LINHA + 11 : LINHA;
}
const alturaBloco = (cat) => TITULO_H + itensDe(cat).reduce((a, l) => a + alturaLinha(l), 0) + 12;

const topoColunas = { 0: y, 1: y };
let col = 0;
let cursor = y;

function novaPaginaColunas() {
  pg = pdf.addPage([W, H]);
  cursor = H - M;
  col = 0;
  topoColunas[0] = topoColunas[1] = H - M;
}
function proximaColuna() {
  if (col === 0) { col = 1; cursor = topoColunas[1]; } else novaPaginaColunas();
}

function desenharTitulo(titulo, x, cont = false) {
  const t = titulo.toUpperCase() + (cont ? " (cont.)" : "");
  txt(t, x, cursor - 14, fB, 10.5);
  pg.drawLine({ start: { x, y: cursor - 19 }, end: { x: x + COL, y: cursor - 19 }, thickness: 1.2, color: PRETO });
  cursor -= TITULO_H;
}

for (const cat of categorias) {
  const h = alturaBloco(cat);
  if (cursor - h < BASE && h <= cursor - BASE + 9999) {
    // bloco não cabe: vai para a próxima coluna (ou página), salvo se for maior que uma coluna inteira
    if (h < H - 2 * M - BASE) proximaColuna();
  }
  let x = M + col * (COL + GAP);
  desenharTitulo(cat.titulo, x);
  for (const l of itensDe(cat)) {
    const lh = alturaLinha(l);
    if (cursor - lh < BASE) { proximaColuna(); x = M + col * (COL + GAP); desenharTitulo(cat.titulo, x, true); }
    if (l.tipo === "sub") {
      txt(l.nome.toUpperCase(), x, cursor - 11, fB, 7.5, CINZA);
      cursor -= SUB_H;
      continue;
    }
    const t = typeof l.it === "string" ? l.it : l.it.t;
    const nota = typeof l.it === "string" ? null : l.it.nota;
    pg.drawRectangle({ x, y: cursor - 12.5, width: CAIXA, height: CAIXA, borderColor: PRETO, borderWidth: 0.9 });
    const notaW = nota ? largura(nota, fN, 7.5) + 6 : 0;
    const linhas = quebrar(t, fN, 10, COL - 18 - notaW);
    linhas.forEach((s, i) => txt(s, x + 17, cursor - 11.5 - i * 11, fN, 10));
    if (nota) txt(nota, x + COL - notaW + 6, cursor - 11, fN, 7.5, CINZA);
    cursor -= lh;
    pg.drawLine({ start: { x: x + 17, y: cursor + 1 }, end: { x: x + COL, y: cursor + 1 }, thickness: 0.4, color: CINZA_CLARO });
  }
  cursor -= 12;
}

// Aviso de fichas sem itens de carga (no fim, largura total se couber)
{
  const msg = `Fichas sem itens de carga cadastrados: ${fichasSemItens.join(", ")}. Confira à mão o que elas precisam.`;
  const linhas = quebrar(msg, fN, 9, COL - 16);
  const h = 14 + linhas.length * 12;
  if (cursor - h < BASE) proximaColuna();
  const x = M + col * (COL + GAP);
  pg.drawRectangle({ x, y: cursor - h, width: COL, height: h, borderColor: CINZA, borderWidth: 0.8, borderDashArray: [3, 2] });
  linhas.forEach((l, i) => txt(l, x + 8, cursor - 13 - i * 12, fN, 9, CINZA));
}

// Rodapé
const paginas = pdf.getPages();
paginas.forEach((p, i) => {
  const r = win("Gerado em 21/11/2026 15:30 · EXEMPLO com dados fictícios");
  p.drawText(r, { x: M, y: RODAPE, size: 8, font: fN, color: CINZA });
  const n = win(`Página ${i + 1} de ${paginas.length}`);
  p.drawText(n, { x: M + UTIL - fN.widthOfTextAtSize(n, 8), y: RODAPE, size: 8, font: fN, color: CINZA });
});

writeFileSync(process.argv[2] ?? "checklist.pdf", await pdf.save());
console.log("páginas:", paginas.length);
