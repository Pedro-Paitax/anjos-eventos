import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BlendMode, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Evento } from "@/lib/eventos";
import { CONTRATADA, montarDadosContratoSenhorChurrasco, type PreparoContrato } from "@/lib/contrato-senhor-churrasco-dados";

const moeda = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

export const TITULO_PDF_CONTRATO_SENHOR_CHURRASCO = "Contrato de prestação de serviços de buffet | Senhor Churrasco | Evento ";

export async function gerarContratoSenhorChurrascoPdf(evento: Evento, preparos: readonly PreparoContrato[]): Promise<Uint8Array> {
  const dados = montarDadosContratoSenhorChurrasco(evento, preparos);
  const doc = await PDFDocument.create();
  doc.setTitle(TITULO_PDF_CONTRATO_SENHOR_CHURRASCO + evento.id);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(await readFile(join(process.cwd(), "public", "senhor-churrasco-contrato-logo.png")));
  const A4: [number, number] = [595.28, 841.89], x = 44, max = A4[0] - x, w = max - x;
  const vinho = rgb(.43, .10, .08), tinta = rgb(.13, .10, .09), suave = rgb(.36, .29, .26), borda = rgb(.87, .83, .80), bege = rgb(.97, .94, .91);
  const limite = 56, corpo = 10, entrelinha = 13.6, topo = A4[1] - 44;
  let p: PDFPage = doc.addPage(A4);
  let y = topo;
  function novaPagina() { p = doc.addPage(A4); y = topo; }
  function garantir(altura: number) { if (y - altura < limite) novaPagina(); }
  function texto(s: string, esquerda: number, base: number, tamanho = corpo, fonte = normal, cor = tinta) {
    p.drawText(s, { x: esquerda, y: base, size: tamanho, font: fonte, color: cor });
  }
  function direita(s: string, fim: number, base: number, tamanho = corpo, fonte = normal, cor = tinta) {
    texto(s, fim - fonte.widthOfTextAtSize(s, tamanho), base, tamanho, fonte, cor);
  }
  function linha(esquerda: number, fim: number, base: number, cor = borda) {
    p.drawLine({ start: { x: esquerda, y: base }, end: { x: fim, y: base }, color: cor, thickness: .7 });
  }
  /** Quebra o texto em linhas; a primeira linha pode ser mais curta (quando começa depois de um rótulo). */
  function linhas(s: string, largura: number, fonte: PDFFont = normal, tamanho = corpo, primeira = largura) {
    const resultado: string[] = [];
    let atual = "";
    const limite = () => (resultado.length === 0 ? primeira : largura);
    const limpo = Array.from(s.normalize("NFC").trim().replace(/\s+/g, " "))
      .map((c) => {
        const codigo = c.charCodeAt(0);
        if ("–—•‘’“”".includes(c)) return c; // existem no WinAnsi da Helvetica
        return (codigo >= 32 && codigo < 127) || (codigo >= 160 && codigo <= 255) ? c : "?";
      })
      .join("");
    for (const palavra of limpo.split(" ")) {
      if (fonte.widthOfTextAtSize(palavra, tamanho) > limite()) {
        if (atual) resultado.push(atual);
        atual = "";
        for (const c of palavra) {
          if (fonte.widthOfTextAtSize(atual + c, tamanho) > limite()) {
            resultado.push(atual);
            atual = "";
          }
          atual += c;
        }
        continue;
      }
      const proxima = atual ? atual + " " + palavra : palavra;
      if (atual && fonte.widthOfTextAtSize(proxima, tamanho) > limite()) {
        resultado.push(atual);
        atual = palavra;
      } else atual = proxima;
    }
    if (atual) resultado.push(atual);
    return resultado;
  }
  function secao(titulo: string, reservaDepois = 30) {
    garantir(19 + reservaDepois);
    texto(titulo.toUpperCase(), x, y - 10.5, 10, bold, vinho);
    y -= 18;
  }
  /** Parágrafo com rótulo em negrito na frente ("Cláusula 1ª. Texto..."). */
  function paragrafo(rotulo: string, valor: string, recuo = 0, gap = 5) {
    const esquerda = x + recuo, largura = w - recuo;
    const prefixo = rotulo;
    const ocupado = rotulo ? bold.widthOfTextAtSize(rotulo, corpo) + 3 : 0;
    const partes = linhas(valor, largura, normal, corpo, largura - ocupado);
    garantir(Math.min(partes.length, 2) * entrelinha);
    partes.forEach((trecho, i) => {
      if (i > 0) garantir(entrelinha);
      if (i === 0 && prefixo) texto(prefixo, esquerda, y - corpo, corpo, bold);
      texto(trecho, esquerda + (i === 0 ? ocupado : 0), y - corpo);
      y -= entrelinha;
    });
    y -= gap;
  }
  function campos(valores: Array<[string, string, boolean?]>) {
    if (valores.length === 0) return;
    const gap = 12, largura = (w - gap * (valores.length - 1)) / valores.length;
    const preparados = valores.map(([rotulo, valor, principal]) => {
      const fonte = principal ? bold : normal, tamanho = principal ? 11 : corpo;
      return { rotulo, fonte, tamanho, linhas: linhas(valor, largura, fonte, tamanho) };
    });
    garantir(17 + 2 * entrelinha);
    preparados.forEach((c, i) => texto(c.rotulo, x + (largura + gap) * i, y - 9, 9, bold, suave));
    y -= 13;
    const quantidadeLinhas = Math.max(...preparados.map((c) => c.linhas.length));
    for (let i = 0; i < quantidadeLinhas; i++) {
      garantir(entrelinha);
      preparados.forEach((c, coluna) => {
        const trecho = c.linhas[i];
        if (trecho) texto(trecho, x + (largura + gap) * coluna, y - c.tamanho, c.tamanho, c.fonte);
      });
      y -= entrelinha;
    }
    y -= 5;
  }

  // Cabeçalho
  const logoTamanho = logo.scaleToFit(50, 43);
  p.drawRectangle({ x, y: y - logoTamanho.height, width: logoTamanho.width, height: logoTamanho.height, color: rgb(1, 1, 1) });
  p.drawImage(logo, { x, y: y - logoTamanho.height, ...logoTamanho, blendMode: BlendMode.Difference });
  texto(CONTRATADA.nomeFantasia, x + 60, y - 17, 17, bold, vinho);
  texto(`CNPJ ${CONTRATADA.cnpj} · ${CONTRATADA.endereco}`, x + 60, y - 31, 8, normal, suave);
  y -= 50;
  linha(x, max, y, vinho);
  y -= 30;
  direita(dados.titulo, x + w / 2 + bold.widthOfTextAtSize(dados.titulo, 13.5) / 2, y, 13.5, bold);
  y -= 22;

  for (const [rotulo, valor] of dados.partes) paragrafo(rotulo, valor, 0, 7);
  paragrafo("", dados.preambulo, 0, 4);

  for (const s of dados.secoes) {
    y -= 5;
    secao(s.titulo);
    for (const bloco of s.blocos) {
      if (bloco.tipo === "item") paragrafo("•  " + bloco.rotulo, bloco.texto, 12, 2);
      else paragrafo(bloco.rotulo, bloco.texto);
    }
  }
  y -= 4;
  paragrafo("", dados.fechamento, 0, 8);

  // Assinaturas: mantém data, partes e testemunhas juntas.
  const larguraAssinatura = (w - 34) / 2, direitaX = x + larguraAssinatura + 34;
  const nomeCliente = linhas(evento.cliente, larguraAssinatura, bold);
  const blocoPartes = 14 + entrelinha * Math.max(3, nomeCliente.length + 2) + 30;
  garantir(44 + blocoPartes + 14 + 2 * entrelinha + 4);
  texto(dados.localData, x, y - corpo);
  y -= 44;
  linha(x, x + larguraAssinatura, y, suave);
  linha(direitaX, max, y, suave);
  texto(CONTRATADA.nomeFantasia, x, y - 14, corpo, bold);
  texto(CONTRATADA.responsavel + " · CONTRATADA", x, y - 14 - entrelinha);
  texto("CNPJ: " + CONTRATADA.cnpj, x, y - 14 - 2 * entrelinha);
  nomeCliente.forEach((s, i) => texto(s, direitaX, y - 14 - entrelinha * i, corpo, bold));
  texto("CONTRATANTE", direitaX, y - 14 - entrelinha * nomeCliente.length);
  texto("CPF: ____________________________", direitaX, y - 14 - entrelinha * (nomeCliente.length + 1));
  y -= blocoPartes;
  linha(x, x + larguraAssinatura, y, suave);
  linha(direitaX, max, y, suave);
  for (const [i, esquerda] of [x, direitaX].entries()) {
    texto("Testemunha " + (i + 1), esquerda, y - 14, corpo, bold);
    texto("Nome: ___________________________", esquerda, y - 14 - entrelinha);
    texto("RG: _____________________________", esquerda, y - 14 - 2 * entrelinha);
  }

  // Anexo I
  novaPagina();
  texto("Anexo I – Resumo do evento", x, y - 14, 14, bold);
  texto("Parte integrante do Contrato de Prestação de Serviços de Buffet · Evento nº " + evento.id, x, y - 30, 9, normal, suave);
  y -= 46;
  secao("Evento", 45);
  campos(dados.anexo.principais);
  campos([["Local do evento", dados.anexo.local, true]]);
  campos(dados.anexo.detalhes);
  if (dados.anexo.horarios.length) {
    y -= 6;
    secao("Horários", 30);
    campos(dados.anexo.horarios);
  }
  y -= 8;

  const descricaoW = 238, qtdFim = x + 291, unitFim = x + 396;
  function cabecalhoTabela(continuacao = false) {
    secao(continuacao ? "Valores · continuação" : "Valores", 49);
    p.drawRectangle({ x, y: y - 22, width: w, height: 22, color: bege });
    texto("Descrição", x + 7, y - 15, 9.5, bold, suave);
    direita("Qtd.", qtdFim, y - 15, 9.5, bold, suave);
    direita("Valor unitário", unitFim, y - 15, 9.5, bold, suave);
    direita("Subtotal", max - 7, y - 15, 9.5, bold, suave);
    y -= 22;
  }
  if (dados.anexo.itens.length > 0) cabecalhoTabela();
  else secao("Valores", 26);
  dados.anexo.itens.forEach(([descricao, qtd, unit, subtotal]) => {
    const partes = linhas(descricao, descricaoW);
    const altura = 10 + partes.length * entrelinha;
    if (y - altura < limite) {
      novaPagina();
      cabecalhoTabela(true);
    }
    const base = y - 15;
    partes.forEach((s, j) => texto(s, x + 7, base - j * entrelinha));
    if (qtd !== null) direita(String(qtd), qtdFim, base);
    if (unit !== null) direita(unit === 0 ? "Gratuito" : moeda(unit), unitFim, base);
    direita(subtotal === null ? "—" : moeda(subtotal), max - 7, base);
    y -= altura;
    linha(x, max, y);
  });
  garantir(26 + 24 * dados.anexo.parcelas.length + 20);
  p.drawRectangle({ x, y: y - 26, width: w, height: 26, color: bege });
  texto("Valor do evento", x + 7, y - 17, 11.5, bold, vinho);
  direita(dados.anexo.total, max - 7, y - 17, 11.5, bold, vinho);
  y -= 26;
  for (const [rotulo, valor] of dados.anexo.parcelas) {
    texto(rotulo, x + 7, y - 15, 9.5, normal, suave);
    direita(valor, max - 7, y - 15, 9.5, normal, suave);
    y -= 22;
    linha(x, max, y);
  }
  if (dados.anexo.pix) {
    y -= 6;
    texto(dados.anexo.pix, x, y - 9, 9, normal, suave);
  }

  const paginas = doc.getPages();
  paginas.forEach((pagina, i) => {
    p = pagina;
    linha(x, max, 43);
    texto(dados.referencia, x, 30, 8, normal, suave);
    direita("Página " + (i + 1) + " de " + paginas.length, max, 30, 8, normal, suave);
  });
  return doc.save();
}
