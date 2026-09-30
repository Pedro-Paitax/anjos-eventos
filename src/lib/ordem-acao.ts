import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type PapelOrdem = "copeira" | "assador" | "garcom";

export const ROTULO_PAPEL: Record<PapelOrdem, string> = {
  copeira: "Copeira",
  assador: "Assador",
  garcom: "Garçom",
};

export type DadosOrdemAcao = {
  papel: PapelOrdem;
  nomeColaborador: string;
  cliente: string;
  /** Já formatado (ex.: "sáb., 03 de outubro de 2026, 12:00"). */
  dataHora: string;
  tipoEvento: string | null;
  endereco: string | null;
  horaChegadaEquipe: string | null;
  horaAperitivo: string | null;
  horaAlmoco: string | null;
  horaEncerramento: string | null;
  cardapioCarnes: string | null;
  cardapioBebidas: string | null;
  veiculo: string | null;
  modeloPrato: string | null;
  sousplat: boolean;
  tipoBebidaRecipiente: string | null;
  tacaFurtaCor: boolean;
  tacaChampanhe: boolean;
  tipoTalher: string | null;
};

export type SecaoOrdem = { titulo: string; linhas: string[] };

const simNao = (v: boolean) => (v ? "Sim" : "Não");
const hora = (h: string | null) => (h ? h.slice(0, 5) : null);

function linha(rotulo: string, valor: string | null): string | null {
  return valor && valor.trim() ? `${rotulo}: ${valor.trim()}` : null;
}

function compactar(linhas: (string | null)[]): string[] {
  return linhas.filter((l): l is string => l !== null);
}

/** Conteúdo da Ordem de Ação, filtrado pelo que importa a cada papel. */
export function montarSecoesOrdemAcao(d: DadosOrdemAcao): SecaoOrdem[] {
  const secoes: SecaoOrdem[] = [
    {
      titulo: "Evento",
      linhas: compactar([
        linha("Cliente", d.cliente),
        linha("Data e hora", d.dataHora),
        linha("Tipo", d.tipoEvento),
        linha("Endereço", d.endereco),
      ]),
    },
    {
      titulo: "Horários",
      linhas: compactar([
        linha("Chegada da equipe", hora(d.horaChegadaEquipe)),
        linha("Aperitivo", hora(d.horaAperitivo)),
        linha("Almoço", hora(d.horaAlmoco)),
        linha("Encerramento", hora(d.horaEncerramento)),
      ]),
    },
    { titulo: "Logística", linhas: compactar([linha("Veículo", d.veiculo)]) },
  ];

  if (d.papel === "assador") {
    secoes.push({
      titulo: "Assador",
      linhas: compactar([linha("Carnes", d.cardapioCarnes), linha("Modelo de prato", d.modeloPrato)]),
    });
  } else {
    secoes.push({
      titulo: d.papel === "copeira" ? "Copeira" : "Garçom",
      linhas: compactar([
        linha("Modelo de prato", d.modeloPrato),
        `Sousplat: ${simNao(d.sousplat)}`,
        linha("Copo / taça", d.tipoBebidaRecipiente),
        `Taça furta-cor: ${simNao(d.tacaFurtaCor)}`,
        `Taça de champanhe: ${simNao(d.tacaChampanhe)}`,
        linha("Talher", d.tipoTalher),
        d.papel === "copeira" ? linha("Bebidas", d.cardapioBebidas) : null,
      ]),
    });
  }
  return secoes.filter((s) => s.linhas.length > 0);
}

// Fontes padrão do PDF (WinAnsi) cobrem português; o resto vira "?".
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
  return linhas;
}

export async function gerarOrdemAcaoPdf(d: DadosOrdemAcao): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const margem = 50;
  const [larguraPagina, alturaPagina] = [595, 842];
  const larguraTexto = larguraPagina - margem * 2;

  let pagina = pdf.addPage([larguraPagina, alturaPagina]);
  let y = alturaPagina - margem;

  const escrever = (texto: string, fonte: PDFFont, tamanho: number, folga = 4) => {
    for (const trecho of quebrar(texto, fonte, tamanho, larguraTexto)) {
      if (y < margem) {
        pagina = pdf.addPage([larguraPagina, alturaPagina]);
        y = alturaPagina - margem;
      }
      pagina.drawText(trecho, { x: margem, y, size: tamanho, font: fonte, color: rgb(0.1, 0.1, 0.1) });
      y -= tamanho + folga;
    }
  };

  escrever("ORDEM DE AÇÃO", negrito, 20, 8);
  escrever(`${ROTULO_PAPEL[d.papel]}: ${d.nomeColaborador}`, negrito, 13, 12);
  for (const secao of montarSecoesOrdemAcao(d)) {
    y -= 6;
    escrever(secao.titulo.toUpperCase(), negrito, 11, 5);
    for (const l of secao.linhas) escrever(l, normal, 11);
  }
  return pdf.save();
}
