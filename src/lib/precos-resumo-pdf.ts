import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { paraWinAnsi, quebrar } from "@/lib/lista-compras-pdf";
import { ROTULOS_FONTE, estadoPreco, formatarDiaCurto, hojeNaEquipe, type FontePreco } from "@/lib/precos-opcoes";

/**
 * Resumo diário de preços de insumos (PDF enviado pelo WhatsApp aos números da família).
 * Funções puras: os dados vêm de src/lib/precos-resumo.ts. Mesmo padrão de lista-compras-pdf.ts
 * (pdf-lib, fontes padrão WinAnsi, a função devolve os bytes).
 *
 * Os preços são os de CADASTRO (insumos.preco, já com +10 % sobre o fornecedor).
 */

/** Variação a partir da qual a linha sai em destaque (mesmo corte da revisão de preços com o Pedro). */
export const DESTAQUE_VARIACAO_PCT = 30;

/** Uma linha da tabela alteracoes_preco_insumo ainda não enviada. */
export type AlteracaoPendente = {
  id: number;
  insumoId: number;
  nome: string;
  unidade: string;
  precoAnterior: number | null;
  precoNovo: number | null;
  /** ISO. */
  alteradoEm: string;
};

export type MudancaInsumo = {
  insumoId: number;
  nome: string;
  unidade: string;
  /** null = insumo novo (não tinha preço antes). */
  antes: number | null;
  depois: number | null;
  /** null quando não há preço anterior (ou era zero). */
  variacaoPct: number | null;
};

/**
 * Junta as mudanças de cada insumo no período: "antes" = preço anterior da primeira mudança,
 * "depois" = preço novo da última. Insumo que voltou ao mesmo preço sai da lista, mas as linhas
 * dele contam como consumidas (não voltam no próximo resumo).
 */
export function consolidarAlteracoes(linhas: AlteracaoPendente[]): { mudancas: MudancaInsumo[]; idsConsumidos: number[] } {
  const ordenadas = [...linhas].sort((a, b) => a.alteradoEm.localeCompare(b.alteradoEm) || a.id - b.id);
  const porInsumo = new Map<number, MudancaInsumo>();
  for (const l of ordenadas) {
    const atual = porInsumo.get(l.insumoId);
    if (atual) atual.depois = l.precoNovo;
    else porInsumo.set(l.insumoId, { insumoId: l.insumoId, nome: l.nome, unidade: l.unidade, antes: l.precoAnterior, depois: l.precoNovo, variacaoPct: null });
  }
  const mudancas = [...porInsumo.values()]
    .filter((m) => m.antes !== m.depois)
    .map((m) => ({ ...m, variacaoPct: m.antes && m.depois != null ? ((m.depois - m.antes) / m.antes) * 100 : null }))
    .sort(
      (a, b) =>
        Math.abs(b.variacaoPct ?? -1) - Math.abs(a.variacaoPct ?? -1) || a.nome.localeCompare(b.nome, "pt-BR"),
    );
  return { mudancas, idsConsumidos: ordenadas.map((l) => l.id) };
}

/** "R$ 1.234,56" sem depender de ICU. */
export function formatarReaisPdf(valor: number | null): string {
  if (valor == null) return "-";
  const [inteiro, centavos] = Math.abs(valor).toFixed(2).split(".");
  return `${valor < 0 ? "-" : ""}R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos}`;
}

export function formatarVariacao(pct: number | null): string {
  if (pct == null) return "novo";
  const v = Math.round(pct * 10) / 10;
  return `${v > 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")}%`;
}

export type InsumoTabela = {
  insumoId: number;
  nome: string;
  unidade: string;
  preco: number | null;
  fonte: FontePreco | null;
  fornecedor: string | null;
  /** "AAAA-MM-DD" no fuso da equipe, ou null. */
  atualizadoEm: string | null;
};

export type DadosResumoPrecos = {
  mudancas: MudancaInsumo[];
  tabela: InsumoTabela[];
  /** "AAAA-MM-DD" da primeira e da última mudança do período; null = nenhuma mudança (envio manual só com a tabela). */
  periodo: { de: string; ate: string } | null;
  /** "AAAA-MM-DD" de hoje (idade dos preços). */
  hoje: string;
  /** Já formatado (rodapé). */
  geradoEm: string;
};

export function origemTexto(fonte: FontePreco | null, fornecedor: string | null): string {
  return [fonte ? ROTULOS_FONTE[fonte] : null, fornecedor].filter(Boolean).join(" · ") || "sem registro";
}

const ROTULO_ESTADO = { em_dia: "em dia", desatualizado: "desatualizado", sem_data: "sem data" } as const;

/** Legenda curta da mensagem do WhatsApp que acompanha o PDF. */
function textoPeriodo(p: { de: string; ate: string }): string {
  return p.de === p.ate ? formatarDiaCurto(p.de) : `${formatarDiaCurto(p.de)} a ${formatarDiaCurto(p.ate)}`;
}

export function legendaResumoPrecos(d: Pick<DadosResumoPrecos, "mudancas" | "periodo">): string {
  const n = d.mudancas.length;
  if (n === 0 || !d.periodo) {
    return "Tabela de preços de insumos: nenhum preço mudou desde o último resumo. No PDF: a tabela completa de preços.";
  }
  const periodo = textoPeriodo(d.periodo);
  const grandes = d.mudancas.filter((m) => m.variacaoPct != null && Math.abs(m.variacaoPct) > DESTAQUE_VARIACAO_PCT).length;
  return [
    `Preços de insumos atualizados (${periodo}): ${n} ${n === 1 ? "insumo mudou" : "insumos mudaram"}`,
    grandes ? `, ${grandes} com variação acima de ${DESTAQUE_VARIACAO_PCT}%` : "",
    ". No PDF: o que mudou e a tabela completa de preços.",
  ].join("");
}

const LARGURA = 595;
const ALTURA = 842;
const MARGEM = 40;
const LARGURA_UTIL = LARGURA - MARGEM * 2;
const TAMANHO = 9;
const ENTRELINHA = 11.5;
const PADDING = 5;
const RODAPE_Y = 24;
const LIMITE_INFERIOR = 50;
const PRETO = rgb(0.1, 0.1, 0.1);
const CINZA = rgb(0.45, 0.45, 0.45);
const CINZA_CLARO = rgb(0.9, 0.9, 0.9);
const DESTAQUE = rgb(1, 0.95, 0.8);

type Coluna = { titulo: string; largura: number; direita?: boolean };
type LinhaTabela = { celulas: string[]; destaque?: boolean };

export async function gerarResumoPrecosPdf(d: DadosResumoPrecos): Promise<Uint8Array> {
  if (d.tabela.length === 0) throw new Error("Resumo de preços sem insumos.");

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  let pagina: PDFPage = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - MARGEM;

  const texto = (t: string, x: number, yy: number, fonte: PDFFont, tamanho = TAMANHO, cor = PRETO) =>
    pagina.drawText(paraWinAnsi(t), { x, y: yy, size: tamanho, font: fonte, color: cor });
  const novaPagina = () => {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - MARGEM;
  };

  const tabela = (colunas: Coluna[], linhas: LinhaTabela[]) => {
    const cabecalho = () => {
      const altura = 18;
      pagina.drawRectangle({ x: MARGEM, y: y - altura, width: LARGURA_UTIL, height: altura, color: CINZA_CLARO });
      let x = MARGEM;
      for (const c of colunas) {
        const largura = negrito.widthOfTextAtSize(paraWinAnsi(c.titulo), TAMANHO);
        texto(c.titulo, c.direita ? x + c.largura - 4 - largura : x + 4, y - 12.5, negrito);
        x += c.largura;
      }
      y -= altura;
    };
    cabecalho();
    for (const linha of linhas) {
      const fonte = linha.destaque ? negrito : normal;
      const partes = linha.celulas.map((t, i) => quebrar(t, fonte, TAMANHO, colunas[i].largura - 8));
      const altura = Math.max(...partes.map((p) => p.length)) * ENTRELINHA + PADDING * 2 - 2;
      // Nunca corta a linha entre páginas.
      if (y - altura < LIMITE_INFERIOR) {
        novaPagina();
        cabecalho();
      }
      if (linha.destaque) pagina.drawRectangle({ x: MARGEM, y: y - altura, width: LARGURA_UTIL, height: altura, color: DESTAQUE });
      let x = MARGEM;
      partes.forEach((trechos, i) => {
        const c = colunas[i];
        trechos.forEach((t, j) => {
          const yy = y - PADDING - 8 - j * ENTRELINHA;
          texto(t, c.direita ? x + c.largura - 4 - fonte.widthOfTextAtSize(t, TAMANHO) : x + 4, yy, fonte);
        });
        x += c.largura;
      });
      y -= altura;
      pagina.drawLine({ start: { x: MARGEM, y }, end: { x: MARGEM + LARGURA_UTIL, y }, thickness: 0.4, color: CINZA_CLARO });
    }
  };

  const titulo = (t: string, sub: string[]) => {
    if (y - 60 < LIMITE_INFERIOR) novaPagina();
    texto(t, MARGEM, y - 14, negrito, 14);
    y -= 22;
    for (const s of sub) {
      for (const trecho of quebrar(s, normal, 9, LARGURA_UTIL)) {
        texto(trecho, MARGEM, y - 9, normal, 9, CINZA);
        y -= 12;
      }
    }
    y -= 6;
  };

  texto("ATUALIZAÇÃO DE PREÇOS DE INSUMOS", MARGEM, y - 18, negrito, 17);
  y -= 30;
  texto(d.periodo ? `Período das mudanças: ${textoPeriodo(d.periodo)}` : "Nenhum preço mudou desde o último resumo.", MARGEM, y - 11, normal, 11);
  y -= 22;

  const porId = new Map(d.tabela.map((t) => [t.insumoId, t]));
  titulo(`1. O que mudou (${d.mudancas.length})`, [
    d.mudancas.length
      ? "Preço de cadastro (fornecedor + 10%). Em destaque: variação acima de " + `${DESTAQUE_VARIACAO_PCT}%.`
      : "Nenhuma mudança de preço desde o último resumo enviado.",
  ]);
  if (d.mudancas.length) tabela(
    [
      { titulo: "Insumo", largura: 165 },
      { titulo: "Un.", largura: 45 },
      { titulo: "Antes", largura: 68, direita: true },
      { titulo: "Depois", largura: 68, direita: true },
      { titulo: "Variação", largura: 57, direita: true },
      { titulo: "Origem", largura: 112 },
    ],
    d.mudancas.map((m) => {
      const t = porId.get(m.insumoId);
      return {
        celulas: [m.nome, m.unidade, formatarReaisPdf(m.antes), formatarReaisPdf(m.depois), formatarVariacao(m.variacaoPct), origemTexto(t?.fonte ?? null, t?.fornecedor ?? null)],
        destaque: m.variacaoPct != null && Math.abs(m.variacaoPct) > DESTAQUE_VARIACAO_PCT,
      };
    }),
  );

  y -= 16;
  const estados = d.tabela.map((t) => estadoPreco(t.atualizadoEm, d.hoje));
  const contagem = (e: string) => estados.filter((x) => x === e).length;
  titulo(`2. Tabela completa de preços (${d.tabela.length} insumos)`, [
    `Em dia: ${contagem("em_dia")} · desatualizados (mais de 14 dias): ${contagem("desatualizado")} · sem data: ${contagem("sem_data")}.`,
  ]);
  tabela(
    [
      { titulo: "Insumo", largura: 165 },
      { titulo: "Un.", largura: 45 },
      { titulo: "Preço", largura: 70, direita: true },
      { titulo: "Origem", largura: 112 },
      { titulo: "Atualizado", largura: 60 },
      { titulo: "Situação", largura: 63 },
    ],
    d.tabela.map((t, i) => ({
      celulas: [t.nome, t.unidade, formatarReaisPdf(t.preco), origemTexto(t.fonte, t.fornecedor), t.atualizadoEm ? formatarDiaCurto(t.atualizadoEm) : "-", ROTULO_ESTADO[estados[i]]],
    })),
  );

  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawText(paraWinAnsi(`Gerado em ${d.geradoEm}`), { x: MARGEM, y: RODAPE_Y, size: 8, font: normal, color: CINZA });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(paraWinAnsi(numero), { x: MARGEM + LARGURA_UTIL - normal.widthOfTextAtSize(paraWinAnsi(numero), 8), y: RODAPE_Y, size: 8, font: normal, color: CINZA });
  });
  return pdf.save();
}

/** "AAAA-MM-DD" (fuso da equipe) de um instante ISO. */
export function diaDaEquipe(iso: string): string {
  return hojeNaEquipe(new Date(iso));
}
