/**
 * Domínios da prospecção comercial. Os CHECKs de src/db/schema/prospeccao.ts
 * repetem estas listas — mudar aqui exige migration.
 */

export const CATEGORIAS_LEAD = ["cervejaria", "bar_restaurante", "espaco_eventos", "outro"] as const;
export type CategoriaLead = (typeof CATEGORIAS_LEAD)[number];

export const ROTULOS_CATEGORIA: Record<CategoriaLead, string> = {
  cervejaria: "Cervejaria / brewpub",
  bar_restaurante: "Bar / restaurante",
  espaco_eventos: "Espaço de eventos",
  outro: "Outro parceiro",
};

/** Ordem = avanço no funil. `nao_contatar` fica fora da ordem (é bloqueio, não etapa). */
export const STATUS_LEAD = [
  "novo",
  "em_pesquisa",
  "a_verificar",
  "qualificado",
  "prioridade_baixa",
  "pronto_para_contato",
  "contatado",
  "em_conversa",
  "reuniao_proposta",
  "convertido",
  "sem_interesse",
  "nao_contatar",
] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

export const ROTULOS_STATUS: Record<StatusLead, string> = {
  novo: "Novo",
  em_pesquisa: "Em pesquisa",
  a_verificar: "A verificar",
  qualificado: "Qualificado",
  prioridade_baixa: "Prioridade baixa",
  pronto_para_contato: "Pronto para contato",
  contatado: "Contatado (sem resposta)",
  em_conversa: "Em conversa",
  reuniao_proposta: "Reunião / proposta",
  convertido: "Convertido",
  sem_interesse: "Sem interesse",
  nao_contatar: "Não contatar",
};

/**
 * Status que o usuário escolhe à mão. `nao_contatar` tem ação própria (exige motivo)
 * e `contatado` só nasce de envio confirmado.
 */
export const STATUS_MANUAIS: StatusLead[] = STATUS_LEAD.filter(
  (s) => s !== "nao_contatar" && s !== "contatado",
);

export const TIPOS_EVIDENCIA = ["site_oficial", "rede_social", "diretorio", "imprensa", "outro"] as const;
export type TipoEvidencia = (typeof TIPOS_EVIDENCIA)[number];
export const ROTULOS_TIPO_EVIDENCIA: Record<TipoEvidencia, string> = {
  site_oficial: "Site oficial",
  rede_social: "Perfil público em rede social",
  diretorio: "Diretório / associação",
  imprensa: "Imprensa / matéria",
  outro: "Outra fonte",
};

export const NATUREZAS_EVIDENCIA = ["fato", "inferencia"] as const;
export type NaturezaEvidencia = (typeof NATUREZAS_EVIDENCIA)[number];
export const ROTULOS_NATUREZA: Record<NaturezaEvidencia, string> = {
  fato: "Fato (a fonte afirma)",
  inferencia: "Inferência (conclusão nossa)",
};

export const CONFIANCAS = ["alta", "media", "baixa"] as const;
export type Confianca = (typeof CONFIANCAS)[number];
export const ROTULOS_CONFIANCA: Record<Confianca, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const VERIFICACOES = ["verificado", "a_verificar", "divergente"] as const;
export type Verificacao = (typeof VERIFICACOES)[number];
export const ROTULOS_VERIFICACAO: Record<Verificacao, string> = {
  verificado: "Verificado",
  a_verificar: "A verificar",
  divergente: "Divergente / descartado",
};

/** Campos do lead que uma evidência pode sustentar (null = fato livre). */
export const CAMPOS_EVIDENCIA = [
  "nome_comercial",
  "endereco",
  "municipio",
  "site",
  "instagram",
  "telefone",
  "email",
  "responsavel_comercial",
  "sinais_demanda",
  "compatibilidade_parrilla",
  "limitacoes",
] as const;
export type CampoEvidencia = (typeof CAMPOS_EVIDENCIA)[number];
export const ROTULOS_CAMPO: Record<CampoEvidencia, string> = {
  nome_comercial: "Nome comercial",
  endereco: "Endereço",
  municipio: "Município",
  site: "Site",
  instagram: "Instagram",
  telefone: "Telefone",
  email: "E-mail",
  responsavel_comercial: "Responsável comercial",
  sinais_demanda: "Sinais de demanda",
  compatibilidade_parrilla: "Compatibilidade com parrilla",
  limitacoes: "Limitações",
};

export const CANAIS = ["whatsapp", "instagram", "email"] as const;
export type Canal = (typeof CANAIS)[number];
export const ROTULOS_CANAL: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "E-mail",
};

export const ESTADOS_MENSAGEM = [
  "aguardando_revisao",
  "aprovada",
  "envio_iniciado",
  "enviada",
  "respondida",
  "descartada",
] as const;
export type EstadoMensagem = (typeof ESTADOS_MENSAGEM)[number];
export const ROTULOS_ESTADO_MENSAGEM: Record<EstadoMensagem, string> = {
  aguardando_revisao: "Aguardando revisão",
  aprovada: "Aprovada (não enviada)",
  envio_iniciado: "Canal aberto (envio não confirmado)",
  enviada: "Enviada (confirmada)",
  respondida: "Respondida",
  descartada: "Descartada",
};

/**
 * De quais estados cada ação parte. Gerar não aprova, aprovar não envia,
 * abrir o canal não envia: só `confirmar_envio` (clique explícito) chega a "enviada".
 * Editar uma aprovada volta para revisão (a aprovação vale para o texto aprovado).
 */
export const ACOES_MENSAGEM = ["editar", "aprovar", "descartar", "abrir_canal", "confirmar_envio"] as const;
export type AcaoMensagem = (typeof ACOES_MENSAGEM)[number];
export const ORIGENS_ACAO_MENSAGEM: Record<AcaoMensagem, EstadoMensagem[]> = {
  editar: ["aguardando_revisao", "aprovada"],
  aprovar: ["aguardando_revisao"],
  descartar: ["aguardando_revisao", "aprovada", "envio_iniciado"],
  abrir_canal: ["aprovada", "envio_iniciado"],
  confirmar_envio: ["aprovada", "envio_iniciado"],
};

export function acaoPermitida(acao: AcaoMensagem, estado: EstadoMensagem): boolean {
  return ORIGENS_ACAO_MENSAGEM[acao].includes(estado);
}

export const TIPOS_INTERACAO = [
  "envio_confirmado",
  "resposta",
  "reuniao",
  "proposta",
  "conversao",
  "sem_interesse",
  "nao_contatar",
  "reativado",
  "nota",
] as const;
export type TipoInteracao = (typeof TIPOS_INTERACAO)[number];
export const ROTULOS_INTERACAO: Record<TipoInteracao, string> = {
  envio_confirmado: "Envio confirmado",
  resposta: "Resposta recebida",
  reuniao: "Reunião agendada/realizada",
  proposta: "Proposta enviada",
  conversao: "Parceria fechada",
  sem_interesse: "Sem interesse",
  nao_contatar: "Pediu para não ser contatado",
  reativado: "Bloqueio de contato removido",
  nota: "Anotação",
};

/** Interações que o usuário registra pelo formulário de resultado do contato. */
export const INTERACOES_REGISTRAVEIS: TipoInteracao[] = [
  "resposta",
  "reuniao",
  "proposta",
  "conversao",
  "sem_interesse",
  "nota",
];

/**
 * Status para o qual o lead vai ao registrar a interação, ou null se não muda.
 * Só avança: um lead em reunião que responde de novo continua em reunião.
 */
export function statusAposInteracao(atual: StatusLead, tipo: TipoInteracao): StatusLead | null {
  const ordem = (s: StatusLead) => STATUS_LEAD.indexOf(s);
  const avancarPara = (alvo: StatusLead) =>
    atual === "nao_contatar" || atual === "sem_interesse" || atual === "convertido" || ordem(atual) >= ordem(alvo)
      ? null
      : alvo;

  switch (tipo) {
    case "envio_confirmado":
      return avancarPara("contatado");
    case "resposta":
      return avancarPara("em_conversa");
    case "reuniao":
    case "proposta":
      return avancarPara("reuniao_proposta");
    case "conversao":
      return atual === "convertido" ? null : "convertido";
    case "sem_interesse":
      return atual === "sem_interesse" ? null : "sem_interesse";
    case "nao_contatar":
      return "nao_contatar";
    case "reativado":
    case "nota":
      return null;
  }
}

/**
 * Status após registrar uma qualificação. Só mexe em lead que ainda está na fase
 * de pesquisa (novo / em pesquisa / a verificar); daí em diante o status é do funil.
 */
export function statusAposQualificacao(
  atual: StatusLead,
  prioridade: "A" | "B" | "C" | "baixa" | "indefinida",
): StatusLead | null {
  if (atual !== "novo" && atual !== "em_pesquisa" && atual !== "a_verificar") return null;
  if (prioridade === "indefinida") return atual === "novo" ? "em_pesquisa" : null;
  return prioridade === "baixa" ? "prioridade_baixa" : "qualificado";
}

export function ehUm<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === "string" && (lista as readonly string[]).includes(valor);
}
