import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Evento } from "@/lib/eventos";
import { formatarData, formatarHora, formatarValor, paraInputTime } from "@/lib/formatacao";
import { quebrar } from "@/lib/lista-compras-pdf";

const LARGURA = 595.28;
const ALTURA = 841.89;
const MARGEM = 48;
const LARGURA_TEXTO = LARGURA - 2 * MARGEM;
const CINZA = rgb(0.32, 0.32, 0.32);

type CampoContrato = [rotulo: string, valor: string | number | null];

function formatarPrazo(prazo: string | null): string | null {
  if (!prazo) return null;
  if (typeof prazo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    return prazo.split("-").reverse().join("/");
  }
  return new Intl.DateTimeFormat("pt-BR").format(new Date(prazo));
}

function linhasPdf(texto: string, fonte: PDFFont, tamanho: number): string[] {
  const limpo = Array.from(texto.normalize("NFC").replace(/\s+/g, " "))
    .filter((caractere) => {
      const codigo = caractere.charCodeAt(0);
      return codigo >= 32 && (codigo < 127 || codigo >= 160);
    })
    .join("");
  return quebrar(limpo, fonte, tamanho, LARGURA_TEXTO).flatMap((linha) => {
    if (fonte.widthOfTextAtSize(linha, tamanho) <= LARGURA_TEXTO) return [linha];

    // Uma palavra sem espaços (por exemplo, uma chave PIX) também precisa caber.
    const partes: string[] = [];
    let atual = "";
    for (const caractere of linha) {
      if (fonte.widthOfTextAtSize(atual + caractere, tamanho) > LARGURA_TEXTO) {
        partes.push(atual);
        atual = "";
      }
      atual += caractere;
    }
    partes.push(atual);
    return partes;
  });
}

export async function gerarContratoEventoPdf(
  evento: Evento,
  preparosConfirmados: readonly string[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Minuta de contrato - Evento " + evento.id);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  let y = ALTURA - MARGEM;

  function reservar(altura: number) {
    if (y - altura >= MARGEM) return;
    pagina = pdf.addPage([LARGURA, ALTURA]);
    y = ALTURA - MARGEM;
  }

  function escrever(texto: string, fonte = normal, tamanho = 11) {
    for (const linha of linhasPdf(texto, fonte, tamanho)) {
      reservar(tamanho + 5);
      pagina.drawText(linha, { x: MARGEM, y: y - tamanho, font: fonte, size: tamanho });
      y -= tamanho + 5;
    }
  }

  function tituloSecao(titulo: string) {
    reservar(48);
    y -= 12;
    escrever(titulo, negrito, 12);
    y -= 3;
  }

  function secao(titulo: string, campos: CampoContrato[]) {
    const preenchidos = campos.filter(([, valor]) => valor != null && String(valor).trim() !== "");
    if (preenchidos.length === 0) return;
    tituloSecao(titulo);
    for (const [rotulo, valor] of preenchidos) escrever(rotulo + ": " + valor);
  }

  escrever("Minuta de contrato", negrito, 24);
  escrever("Evento nº " + evento.id + " | Para revisão e complementação");
  secao("Partes", [
    ["Contratante", evento.cliente],
    ["CPF/CNPJ do contratante", "____________________________"],
    ["Contato", evento.contato],
    ["Telefone", evento.telefone],
    ["Contratada", evento.empresa_nome],
    ["CNPJ da contratada", "____________________________"],
  ]);
  secao("Serviço e evento", [
    ["Tipo de evento", evento.tipo_evento],
    ["Data e hora", formatarData(evento.data_evento) + " às " + formatarHora(evento.data_evento)],
    ["Local", evento.endereco_evento ?? "A preencher"],
    ["Chegada da equipe", evento.hora_chegada_equipe && paraInputTime(evento.hora_chegada_equipe)],
    ["Aperitivo", evento.hora_aperitivo && paraInputTime(evento.hora_aperitivo)],
    ["Almoço", evento.hora_almoco && paraInputTime(evento.hora_almoco)],
    ["Encerramento", evento.hora_encerramento && paraInputTime(evento.hora_encerramento)],
    ["Adultos", evento.qtd_adultos],
    ["Crianças até 5 anos", evento.qtd_criancas_ate_5],
    ["Crianças de 5 a 10 anos", evento.qtd_criancas_5_a_10],
    ["Fornecedores", evento.qtd_fornecedores],
  ]);

  if (preparosConfirmados.length > 0) {
    tituloSecao("Cardápio");
    for (const nome of preparosConfirmados) escrever("- " + nome);
  } else {
    secao("Cardápio", [
      ["Entradas", evento.cardapio_entrada],
      ["Carnes", evento.cardapio_carnes],
      ["Acompanhamentos", evento.cardapio_acompanhamentos],
      ["Saladas", evento.cardapio_saladas],
      ["Bebidas", evento.cardapio_bebidas],
      ["Sobremesas", evento.cardapio_sobremesa],
    ]);
  }

  secao("Pagamento", [
    ["Valor total registrado", formatarValor(evento.valor) ?? "A preencher"],
    ["Prazo de pagamento", formatarPrazo(evento.prazo_pagamento)],
    ["Chave PIX", evento.chave_pix],
  ]);

  reservar(115);
  tituloSecao("Assinaturas");
  escrever("Local e data: __________________________________________");
  y -= 28;
  const linha = "________________________________";
  const xContratada = LARGURA / 2 + 12;
  pagina.drawText(linha, { x: MARGEM, y, size: 11, font: normal });
  pagina.drawText(linha, { x: xContratada, y, size: 11, font: normal });
  pagina.drawText("Contratante", { x: MARGEM, y: y - 17, size: 11, font: normal });
  pagina.drawText("Contratada", { x: xContratada, y: y - 17, size: 11, font: normal });

  const paginas = pdf.getPages();
  paginas.forEach((folha, i) => {
    folha.drawText("Minuta | Evento nº " + evento.id, {
      x: MARGEM, y: 24, size: 9, font: normal, color: CINZA,
    });
    const numero = (i + 1) + " / " + paginas.length;
    folha.drawText(numero, {
      x: LARGURA - MARGEM - normal.widthOfTextAtSize(numero, 9),
      y: 24, size: 9, font: normal, color: CINZA,
    });
  });
  return pdf.save();
}
