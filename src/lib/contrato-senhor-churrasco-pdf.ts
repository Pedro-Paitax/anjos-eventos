import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BlendMode, PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import type { Evento } from "@/lib/eventos";
import { montarDadosContratoSenhorChurrasco, type PreparoContrato } from "@/lib/contrato-senhor-churrasco-dados";

type DadosContrato = ReturnType<typeof montarDadosContratoSenhorChurrasco>;

const condicoes = [
  ["Convidados excedentes", "O cliente paga por pessoa excedente. Se comparecerem menos pessoas, o pagamento será pelo número confirmado."],
  ["Cancelamento", "Em caso de cancelamento do contrato, o cliente resgatará 50% do valor dado como garantia do evento."],
  ["Quebras", "Pratos, pratinhos e copos quebrados por convidados serão cobrados a R$ 28,00, R$ 24,00 e R$ 16,00 por unidade, respectivamente."],
  ["Duração do serviço", "O buffet será servido à vontade pelo período máximo de 4 horas, contado da chegada dos funcionários ao local. O excedente será cobrado a R$ 20,00 por hora, por funcionário."],
];

const moeda = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

export async function gerarContratoSenhorChurrascoPdf(evento: Evento, preparos: readonly PreparoContrato[]): Promise<Uint8Array> {
  const dados = montarDadosContratoSenhorChurrasco(evento, preparos);
  const doc = await PDFDocument.create();
  doc.setTitle("Contrato de reserva de evento | Senhor Churrasco | Evento " + evento.id);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await doc.embedPng(await readFile(join(process.cwd(), "public", "senhor-churrasco-contrato-logo.png")));
  const A4: [number, number] = [595.28, 841.89], x = 44, max = A4[0] - x, w = max - x;
  const vinho = rgb(.43,.10,.08), tinta = rgb(.13,.10,.09), suave = rgb(.36,.29,.26), borda = rgb(.87,.83,.80), bege = rgb(.97,.94,.91);
  const limite = 51, corpo = 10.75, entrelinha = 14.5;
  let p: PDFPage = doc.addPage(A4);
  let y = A4[1] - 46;
  function novaPagina() { p = doc.addPage(A4); y = A4[1] - 46; }
  function garantir(altura: number) { if (y - altura < limite) novaPagina(); }
  function texto(s: string, esquerda: number, base: number, tamanho = corpo, fonte = normal, cor = tinta) {
    p.drawText(s, { x: esquerda, y: base, size: tamanho, font: fonte, color: cor });
  }
  function direita(s: string, fim: number, base: number, tamanho = corpo, fonte = normal, cor = tinta) {
    texto(s, fim - fonte.widthOfTextAtSize(s, tamanho), base, tamanho, fonte, cor);
  }
  function linha(esquerda: number, fim: number, base: number, cor = borda) {
    p.drawLine({ start: {x: esquerda, y: base}, end: {x: fim, y: base}, color: cor, thickness: .7 });
  }
  function linhas(s: string, largura: number, fonte = normal, tamanho = corpo) {
    const resultado = [];
    let atual = "";
    const limpo = Array.from(s.normalize("NFC").trim().replace(/\s+/g, " "))
      .map((c) => {
        const codigo = c.charCodeAt(0);
        return (codigo >= 32 && codigo < 127) || (codigo >= 160 && codigo <= 255) ? c : "?";
      })
      .join("");
    for (const palavra of limpo.split(" ")) {
      if (fonte.widthOfTextAtSize(palavra, tamanho) > largura) {
        if (atual) resultado.push(atual);
        atual = "";
        for (const c of palavra) {
          if (fonte.widthOfTextAtSize(atual + c, tamanho) > largura) {
            resultado.push(atual);
            atual = "";
          }
          atual += c;
        }
        continue;
      }
      const proxima = atual ? atual + " " + palavra : palavra;
      if (atual && fonte.widthOfTextAtSize(proxima, tamanho) > largura) {
        resultado.push(atual);
        atual = palavra;
      } else atual = proxima;
    }
    if (atual) resultado.push(atual);
    return resultado;
  }
  function secao(titulo: string, inicio = 24) {
    garantir(21 + inicio);
    texto(titulo, x, y - 11, 11, bold, vinho);
    y -= 21;
  }
  function campos(valores: DadosContrato["principais"]) {
    if (valores.length === 0) return;
    const gap = 12, largura = (w - gap * (valores.length - 1)) / valores.length;
    const preparados = valores.map(([rotulo, valor, principal]) => {
      const fonte = principal ? bold : normal, tamanho = principal ? 11.5 : corpo;
      return { rotulo, fonte, tamanho, linhas: linhas(valor, largura, fonte, tamanho) };
    });
    const altura = 17 + entrelinha * Math.max(...preparados.map((c) => c.linhas.length));
    garantir(Math.min(altura, 17 + 2 * entrelinha));
    preparados.forEach((c, i) => {
      const esquerda = x + (largura + gap) * i;
      texto(c.rotulo, esquerda, y - 9.5, 9.5, bold, suave);
    });
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
    y -= 4;
  }
  function rotulado(rotulo: string, valor: string, gap = 4) {
    const prefixo = rotulo + " ";
    const ocupado = bold.widthOfTextAtSize(prefixo, corpo);
    const partes = linhas(valor, w - ocupado);
    garantir(Math.min(partes.length, 2) * entrelinha);
    texto(prefixo, x, y - corpo, corpo, bold);
    texto(partes.shift() ?? "", x + ocupado, y - corpo);
    y -= entrelinha;
    const continuacao = linhas(partes.join(" "), w);
    if (continuacao.length === 2) garantir(2 * entrelinha);
    for (const resto of continuacao) {
      garantir(entrelinha);
      texto(resto, x, y - corpo);
      y -= entrelinha;
    }
    y -= gap;
  }
  const logoTamanho = logo.scaleToFit(57, 49);
  p.drawRectangle({ x, y: y - logoTamanho.height, width: logoTamanho.width, height: logoTamanho.height, color: rgb(1, 1, 1) });
  p.drawImage(logo, { x, y: y - logoTamanho.height, ...logoTamanho, blendMode: BlendMode.Difference });
  texto("Senhor Churrasco", x + 68, y - 17, 19, bold, vinho);
  texto("Responsável: Pedro Paitax", x + 68, y - 34, 10, normal, suave);
  y -= 57;
  linha(x, max, y, vinho);
  y -= 25;
  texto("Contrato de reserva de evento", x, y, 18, bold);
  y -= 17;

  secao("EVENTO E CONTRATANTE", 45);
  campos(dados.principais);
  campos([["Local do evento", dados.local, true]]);
  campos(dados.detalhes);
  campos(dados.horarios);
  if (dados.cardapio.length > 0) {
    y -= 13;
    secao("CARDÁPIO");
    for (const [rotulo, valor] of dados.cardapio) rotulado(rotulo + ":", valor, 3);
  }
  if (dados.equipe.length > 0) {
    y -= 11;
    secao("SERVIÇOS");
    rotulado("Equipe:", dados.equipe.map(([funcao, qtd]) => qtd + " " + funcao.toLowerCase()).join(", ") + ".");
  }
  y -= 15;

  const descricaoW = 238, qtdFim = x + 291, unitFim = x + 396;
  function cabecalhoTabela(continuacao = false) {
    secao(continuacao ? "VALORES DA RESERVA · CONTINUAÇÃO" : "VALORES DA RESERVA", 49);
    p.drawRectangle({ x, y: y - 24, width: w, height: 24, color: bege });
    texto("Descrição", x + 7, y - 16, 10, bold, suave);
    direita("Qtd.", qtdFim, y - 16, 10, bold, suave);
    direita("Valor unitário", unitFim, y - 16, 10, bold, suave);
    direita("Subtotal", max - 7, y - 16, 10, bold, suave);
    y -= 24;
  }
  if (dados.itens.length > 0) cabecalhoTabela();
  else secao("VALORES DA RESERVA", 26);
  dados.itens.forEach(([descricao, qtd, unit, subtotal], i) => {
    const partes = linhas(descricao, descricaoW);
    const altura = 10 + partes.length * entrelinha;
    const reserva = i === dados.itens.length - 1 ? 58 : 0;
    if (y - altura - reserva < limite) {
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
  p.drawRectangle({ x, y: y - 26, width: w, height: 26, color: bege });
  texto("Valor do evento", x + 7, y - 17, 12, bold, vinho);
  direita(dados.total, max - 7, y - 17, 12, bold, vinho);
  y -= 38;
  if (dados.detalhamentoDiverge) {
    rotulado("Conferência:", "O total registrado difere da soma dos itens detalhados.");
    y -= 8;
  }
  if (dados.pagamento.length) {
    secao("PAGAMENTO", 15);
    for (const [rotulo, valor] of dados.pagamento) rotulado(rotulo + ":", valor);
    y -= 12;
  }

  const inicioCliente = x + 266;
  const larguraAssinatura = max - inicioCliente;
  const nomeCliente = linhas(evento.cliente, larguraAssinatura, bold);
  const alturaAssinaturas = Math.max(151, 125 + entrelinha * nomeCliente.length);
  const alturaCondicoes = 29 + condicoes.reduce((altura, [rotulo, valor]) =>
    altura + 8 + entrelinha * linhas(rotulo + ". " + valor, w - 20).length, 0);
  // Estas quatro cláusulas são fixas e cabem com as assinaturas numa folha.
  // A reserva evita deixar a folha seguinte apenas com a assinatura.
  const alturaFechamento = alturaCondicoes + alturaAssinaturas;
  if (alturaFechamento <= A4[1] - 46 - limite) garantir(alturaFechamento);
  secao("CONDIÇÕES DA RESERVA", 40);
  for (const [rotulo, valor] of condicoes) rotulado(rotulo + ".", valor, 8);
  y -= 8;
  garantir(alturaAssinaturas);
  secao("ASSINATURAS", 110);
  texto("Local e data: _____________________________________", x, y - corpo);
  y -= 69;
  linha(x, x + larguraAssinatura, y, suave);
  linha(inicioCliente, max, y, suave);
  texto("Senhor Churrasco", x, y - 16, corpo, bold);
  texto("Pedro Paitax · Responsável", x, y - 31);
  nomeCliente.forEach((s, i) => texto(s, inicioCliente, y - 16 - entrelinha * i, corpo, bold));
  texto("Contratante", inicioCliente, y - 16 - entrelinha * nomeCliente.length);
  texto("CNPJ: ___________________________", x, y - 47);
  texto("CPF: ____________________________", inicioCliente, y - 32 - entrelinha * nomeCliente.length);

  const paginas = doc.getPages();
  paginas.forEach((pagina, i) => {
    p = pagina;
    linha(x, max, 43);
    texto(dados.referencia, x, 30, 8, normal, suave);
    direita("Página " + (i + 1) + " de " + paginas.length, max, 30, 8, normal, suave);
  });
  return doc.save();
}
