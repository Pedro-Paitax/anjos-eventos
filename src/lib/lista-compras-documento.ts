import "server-only";
import { obterEvento, type Evento } from "@/lib/eventos";
import { formatarData } from "@/lib/formatacao";
import { obterListaComprasEvento, type ItemListaCompras } from "@/lib/lista-compras-evento";
import { gerarListaComprasPdf } from "@/lib/lista-compras-pdf";

export type DocumentoListaCompras = {
  evento: Evento;
  convidados: number | null;
  itens: ItemListaCompras[];
};

/** Mesma conta da Ficha Técnica: adultos + crianças. */
export function totalConvidados(e: Evento): number | null {
  const partes = [e.qtd_adultos, e.qtd_criancas_ate_5, e.qtd_criancas_5_a_10];
  if (partes.every((n) => n === null)) return null;
  return partes.reduce<number>((soma, n) => soma + (n ?? 0), 0);
}

/** null = evento inexistente. `itens` vazio = sem cardápio confirmado. */
export async function carregarDocumentoListaCompras(eventoId: number): Promise<DocumentoListaCompras | null> {
  const evento = await obterEvento(eventoId);
  if (!evento) return null;
  const { itens } = await obterListaComprasEvento(eventoId);
  return { evento, convidados: totalConvidados(evento), itens };
}

export function nomeArquivoListaCompras(eventoId: number): string {
  return `lista-de-compras-evento-${eventoId}.pdf`;
}

export function gerarPdfDoDocumento(doc: DocumentoListaCompras): Promise<Uint8Array> {
  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return gerarListaComprasPdf({
    cliente: doc.evento.cliente,
    empresa: doc.evento.empresa_nome,
    dataEvento: formatarData(doc.evento.data_evento),
    convidados: doc.convidados,
    geradoEm,
    itens: doc.itens.map((i) => ({
      nome: i.nome,
      unidade: i.unidade,
      quantidadeCompra: i.quantidadeCompra,
      semPreco: i.semPreco,
      semFator: i.semFator,
    })),
  });
}
