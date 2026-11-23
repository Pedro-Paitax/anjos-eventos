import "server-only";
import { pool } from "@/lib/db";
import { obterEvento, type Evento } from "@/lib/eventos";
import { EMPRESA_SENHOR_CHURRASCO, obterDecisoes } from "@/lib/decisoes-operacionais";
import { obterDadosCargaEvento } from "@/lib/checklist-carregamento-dados";
import {
  formatarConvidadosChecklist,
  formatarDataChecklist,
  formatarHoraChegada,
  montarChecklist,
  type PreparoChecklist,
} from "@/lib/checklist-carregamento";
import { gerarChecklistPdf, type DadosChecklistPdf } from "@/lib/checklist-carregamento-pdf";

export type DocumentoChecklist =
  | { tipo: "nao-encontrado" }
  | { tipo: "nao-churrasco" }
  | { tipo: "sem-cardapio" }
  | { tipo: "sem-migracao" }
  | { tipo: "ok"; evento: Evento; dados: DadosChecklistPdf };

/** Preparos do cardápio confirmado, com a categoria (para Comida e para a conta dos pegadores). */
async function preparosConfirmados(eventoId: number): Promise<PreparoChecklist[]> {
  const { rows } = await pool.query<{ id: number; nome: string; categoria: string }>(
    `SELECT DISTINCT p.id, p.nome_preparo AS nome, p.categoria::text AS categoria
       FROM itens_evento_confirmados iec JOIN preparos p ON p.id = iec.preparo_id
      WHERE iec.evento_id = $1
      ORDER BY nome`,
    [eventoId],
  );
  return rows;
}

const vazioParaNull = (s: string | null) => (s && s.trim() ? s.trim() : null);

export async function carregarDocumentoChecklist(eventoId: number): Promise<DocumentoChecklist> {
  const evento = await obterEvento(eventoId);
  if (!evento) return { tipo: "nao-encontrado" };
  if (evento.empresa_nome !== EMPRESA_SENHOR_CHURRASCO) return { tipo: "nao-churrasco" };

  const preparos = await preparosConfirmados(eventoId);
  if (preparos.length === 0) return { tipo: "sem-cardapio" };

  const carga = await obterDadosCargaEvento(preparos.map((p) => p.id));
  if (!carga) return { tipo: "sem-migracao" };

  const decisoes = await obterDecisoes(eventoId);
  const checklist = montarChecklist({
    tipoEvento: evento.tipo_evento,
    preparos,
    decisoes: decisoes && {
      modeloPrato: decisoes.modelo_prato,
      sousplat: decisoes.sousplat,
      tipoBebidaRecipiente: decisoes.tipo_bebida_recipiente,
      tacaFurtaCor: decisoes.taca_furta_cor,
      qtdTacaFurtaCor: decisoes.qtd_taca_furta_cor,
      tacaChampanhe: decisoes.taca_champanhe,
      qtdTacaChampanhe: decisoes.qtd_taca_champanhe,
      tipoTalher: decisoes.tipo_talher,
    },
    ...carga,
  });

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return {
    tipo: "ok",
    evento,
    dados: {
      cliente: evento.cliente,
      tipoEvento: vazioParaNull(evento.tipo_evento),
      data: formatarDataChecklist(evento.data_evento),
      chegada: formatarHoraChegada(evento.hora_chegada_equipe),
      convidados: formatarConvidadosChecklist(evento.qtd_adultos, evento.qtd_criancas_ate_5, evento.qtd_criancas_5_a_10),
      local: vazioParaNull(evento.endereco_evento),
      veiculo: vazioParaNull(decisoes?.veiculo ?? null),
      observacoes: vazioParaNull(evento.observacoes),
      categorias: checklist.categorias,
      fichasSemItens: checklist.fichasSemItens,
      geradoEm,
    },
  };
}

/** Mensagem para cada situação em que não há PDF. */
export const MOTIVO_SEM_PDF: Record<Exclude<DocumentoChecklist["tipo"], "ok">, string> = {
  "nao-encontrado": "Evento não encontrado.",
  "nao-churrasco": "O checklist de carregamento é só para eventos do Senhor Churrasco.",
  "sem-cardapio": "Este evento não tem cardápio confirmado.",
  "sem-migracao": "O checklist precisa da migração 0016 do banco, que ainda não foi aplicada.",
};

export function nomeArquivoChecklist(eventoId: number): string {
  return `checklist-carregamento-evento-${eventoId}.pdf`;
}

export function gerarPdfChecklist(dados: DadosChecklistPdf): Promise<Uint8Array> {
  return gerarChecklistPdf(dados);
}
