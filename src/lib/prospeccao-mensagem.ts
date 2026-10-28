/**
 * Geração de mensagem de primeira abordagem SEM IA ("modelo_local").
 *
 * Não existe provedor de IA no projeto (verificado em 2026-10-28). Até o Pedro
 * aprovar um (dependência @anthropic-ai/sdk + chave paga — docs/PROSPECCAO.md),
 * a mensagem é um texto honesto e genérico, adaptado só ao canal e ao objetivo.
 *
 * Por que não personaliza com os fatos: costurar um fato livre ("realiza
 * festival anual") num template gera frase quebrada ou afirmação forçada.
 * Os fatos verificados aparecem ao lado da mensagem para o usuário personalizar
 * à mão, e só os que ele marcar ficam registrados como "usados".
 */
import type { Canal, CategoriaLead } from "@/lib/prospeccao-opcoes";

export type EvidenciaParaMensagem = {
  id: number;
  fato: string;
  url: string | null;
  natureza: "fato" | "inferencia";
  verificacao: "verificado" | "a_verificar" | "divergente";
};

export type FatoUsado = { evidenciaId: number; fato: string; url: string | null };

/** Só fatos verificados podem personalizar uma mensagem (inferência e "a verificar" não). */
export function fatosPersonalizaveis(evidencias: EvidenciaParaMensagem[]): EvidenciaParaMensagem[] {
  return evidencias.filter((e) => e.natureza === "fato" && e.verificacao === "verificado");
}

/** Objetivo padrão da abordagem por categoria (proposta nossa, não fato sobre o lead). */
export const OBJETIVO_PADRAO: Record<CategoriaLead, string> = {
  cervejaria: "Propor uma experiência conjunta de parrilla e fogo ao vivo em evento da casa.",
  bar_restaurante: "Propor um evento especial ou noite temática com parrilla e fogo ao vivo.",
  espaco_eventos: "Oferecer parrilla e fogo ao vivo como opção de gastronomia aos clientes do espaço.",
  outro: "Apresentar a Anjos Eventos e explorar uma parceria com parrilla e fogo ao vivo.",
};

const PROPOSTA: Record<CategoriaLead, string> = {
  cervejaria:
    "Estamos buscando cervejarias para criar experiências gastronômicas com parrilla e fogo ao vivo — algo que combine com a cerveja da casa.",
  bar_restaurante:
    "Estamos buscando casas interessadas em fazer eventos especiais com parrilla e fogo ao vivo.",
  espaco_eventos:
    "Trabalhamos com parrilla e fogo ao vivo para eventos e estamos buscando espaços parceiros que queiram oferecer essa opção aos clientes.",
  outro:
    "Estamos buscando parceiros para experiências gastronômicas com parrilla e fogo ao vivo.",
};

const PERGUNTA: Record<CategoriaLead, string> = {
  cervejaria: "Vocês costumam avaliar esse tipo de parceria ou evento especial?",
  bar_restaurante: "Faz sentido conversarmos sobre isso?",
  espaco_eventos: "Vocês trabalham com fornecedores parceiros de gastronomia?",
  outro: "Faz sentido conversarmos sobre uma possível parceria?",
};

export type MensagemGerada = { assunto: string | null; conteudo: string };

export function gerarMensagemModelo(params: {
  canal: Canal;
  categoria: CategoriaLead;
  nomeLead: string;
  nomeRemetente: string;
}): MensagemGerada {
  const { canal, categoria, nomeLead, nomeRemetente } = params;
  const corpo = `${PROPOSTA[categoria]} Pensei que poderia fazer sentido para vocês.\n\n${PERGUNTA[categoria]}`;

  if (canal === "email") {
    return {
      assunto: `Parceria com parrilla e fogo ao vivo — ${nomeLead}`,
      conteudo: `Olá, equipe ${nomeLead}, tudo bem?\n\nAqui é ${nomeRemetente}, da Anjos Eventos.\n\n${corpo}\n\nUm abraço,\n${nomeRemetente}\nAnjos Eventos`,
    };
  }
  return {
    assunto: null,
    conteudo: `Oi, tudo bem? Aqui é ${nomeRemetente}, da Anjos Eventos.\n\n${corpo}`,
  };
}
