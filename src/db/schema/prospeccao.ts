/**
 * Prospecção comercial (leads de parceiros: cervejarias, bares, espaços de eventos...).
 * Tabelas novas — não existem no banco antes da migration 0008.
 * Domínios em `src/lib/prospeccao-opcoes.ts` (os CHECKs abaixo repetem as mesmas listas).
 *
 * Sem DELETE na interface: histórico comercial se preserva. Lead que não deve
 * mais ser abordado fica com `nao_contatar = true`; evidência errada é marcada
 * como `divergente`, não apagada (mensagens guardam os ids das evidências usadas).
 */
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  date,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usuarios } from "./nucleo-existente";

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    nomeComercial: text("nome_comercial").notNull(),
    nomeLegal: text("nome_legal"),
    categoria: text("categoria").notNull(),
    segmento: text("segmento"),
    municipio: text("municipio"),
    endereco: text("endereco"),
    site: text("site"),
    /** Só o usuário, sem @ (ex.: "cervejariaexemplo"). */
    instagram: text("instagram"),
    outrosPerfis: text("outros_perfis"),
    /** Dígitos com DDI (ex.: 5541999999999). */
    telefone: text("telefone"),
    email: text("email"),
    responsavelComercial: text("responsavel_comercial"),
    sinaisDemanda: text("sinais_demanda"),
    compatibilidadeParrilla: text("compatibilidade_parrilla"),
    limitacoes: text("limitacoes"),
    observacoes: text("observacoes"),
    origem: text("origem").notNull().default("manual"),
    status: text("status").notNull().default("novo"),
    naoContatar: boolean("nao_contatar").notNull().default(false),
    naoContatarMotivo: text("nao_contatar_motivo"),
    proximaAcao: text("proxima_acao"),
    proximaAcaoEm: date("proxima_acao_em"),
    responsavelUsuarioId: integer("responsavel_usuario_id").references(() => usuarios.id),
    /** Derivados de nome/site, gravados para a deduplicação (src/lib/prospeccao-normalizacao.ts). */
    nomeNormalizado: text("nome_normalizado").notNull(),
    dominio: text("dominio"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_leads_status").on(t.status),
    index("idx_leads_categoria").on(t.categoria),
    index("idx_leads_municipio").on(t.municipio),
    index("idx_leads_nome_normalizado").on(t.nomeNormalizado),
    index("idx_leads_dominio").on(t.dominio),
    index("idx_leads_telefone").on(t.telefone),
    check(
      "leads_categoria_check",
      sql`${t.categoria} IN ('cervejaria', 'bar_restaurante', 'espaco_eventos', 'outro')`,
    ),
    check(
      "leads_status_check",
      sql`${t.status} IN ('novo', 'em_pesquisa', 'a_verificar', 'qualificado', 'prioridade_baixa', 'pronto_para_contato', 'contatado', 'em_conversa', 'reuniao_proposta', 'convertido', 'sem_interesse', 'nao_contatar')`,
    ),
    check("leads_origem_check", sql`${t.origem} IN ('manual', 'csv')`),
  ],
);

export const leadEvidencias = pgTable(
  "lead_evidencias",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    fonte: text("fonte").notNull(),
    url: text("url"),
    consultadoEm: date("consultado_em").notNull(),
    tipo: text("tipo").notNull(),
    /** "fato" (a fonte afirma) ou "inferencia" (conclusão nossa a partir da fonte). */
    natureza: text("natureza").notNull().default("fato"),
    /** Campo do lead que a evidência sustenta (ex.: "telefone"); nulo = fato livre. */
    campo: text("campo"),
    fato: text("fato").notNull(),
    trecho: text("trecho"),
    confianca: text("confianca").notNull().default("media"),
    verificacao: text("verificacao").notNull().default("a_verificar"),
    registradoPor: integer("registrado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_lead_evidencias_lead_id").on(t.leadId),
    check(
      "lead_evidencias_tipo_check",
      sql`${t.tipo} IN ('site_oficial', 'rede_social', 'diretorio', 'imprensa', 'outro')`,
    ),
    check("lead_evidencias_natureza_check", sql`${t.natureza} IN ('fato', 'inferencia')`),
    check("lead_evidencias_confianca_check", sql`${t.confianca} IN ('alta', 'media', 'baixa')`),
    check(
      "lead_evidencias_verificacao_check",
      sql`${t.verificacao} IN ('verificado', 'a_verificar', 'divergente')`,
    ),
  ],
);

/** Uma linha por avaliação; a vigente é a mais recente. */
export const leadQualificacoes = pgTable(
  "lead_qualificacoes",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    /** [{ chave, pontos|null, justificativa, evidenciaIds, confianca }] — ver prospeccao-pontuacao.ts. */
    dimensoes: jsonb("dimensoes").notNull(),
    pontuacao: integer("pontuacao").notNull(),
    pontuacaoMaxima: integer("pontuacao_maxima").notNull(),
    completude: integer("completude").notNull(),
    prioridade: text("prioridade").notNull(),
    provisoria: boolean("provisoria").notNull(),
    confianca: text("confianca").notNull(),
    observacoes: text("observacoes"),
    avaliadoPor: integer("avaliado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_lead_qualificacoes_lead_id").on(t.leadId),
    check("lead_qualificacoes_prioridade_check", sql`${t.prioridade} IN ('A', 'B', 'C', 'baixa', 'indefinida')`),
    check("lead_qualificacoes_confianca_check", sql`${t.confianca} IN ('alta', 'media', 'baixa')`),
  ],
);

export const leadMensagens = pgTable(
  "lead_mensagens",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    canal: text("canal").notNull(),
    objetivo: text("objetivo").notNull(),
    assunto: text("assunto"),
    conteudo: text("conteudo").notNull(),
    estado: text("estado").notNull().default("aguardando_revisao"),
    /** Sequencial por lead (cada geração/regeneração é uma linha nova). */
    versao: integer("versao").notNull(),
    evidenciaIds: integer("evidencia_ids").array().notNull().default(sql`'{}'::integer[]`),
    /** Cópia dos fatos usados no momento da geração (a evidência pode mudar depois). */
    fatosUsados: jsonb("fatos_usados").notNull().default(sql`'[]'::jsonb`),
    gerador: text("gerador").notNull(),
    modelo: text("modelo"),
    criadaPor: integer("criada_por").references(() => usuarios.id),
    editadaPor: integer("editada_por").references(() => usuarios.id),
    editadaEm: timestamp("editada_em", { withTimezone: true }),
    aprovadaPor: integer("aprovada_por").references(() => usuarios.id),
    aprovadaEm: timestamp("aprovada_em", { withTimezone: true }),
    envioIniciadoEm: timestamp("envio_iniciado_em", { withTimezone: true }),
    enviadaPor: integer("enviada_por").references(() => usuarios.id),
    enviadaEm: timestamp("enviada_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_lead_mensagens_lead_id").on(t.leadId),
    check("lead_mensagens_canal_check", sql`${t.canal} IN ('whatsapp', 'instagram', 'email')`),
    check(
      "lead_mensagens_estado_check",
      sql`${t.estado} IN ('aguardando_revisao', 'aprovada', 'envio_iniciado', 'enviada', 'respondida', 'descartada')`,
    ),
    // 'gemini' entra na migração 0009; 'anthropic' fica (já está em produção, sem uso).
    check("lead_mensagens_gerador_check", sql`${t.gerador} IN ('modelo_local', 'manual', 'anthropic', 'gemini')`),
  ],
);

export const leadInteracoes = pgTable(
  "lead_interacoes",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    mensagemId: integer("mensagem_id").references(() => leadMensagens.id),
    tipo: text("tipo").notNull(),
    canal: text("canal"),
    resumo: text("resumo"),
    ocorridaEm: timestamp("ocorrida_em", { withTimezone: true }).notNull().defaultNow(),
    usuarioId: integer("usuario_id").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_lead_interacoes_lead_id").on(t.leadId),
    index("idx_lead_interacoes_tipo").on(t.tipo),
    check(
      "lead_interacoes_tipo_check",
      sql`${t.tipo} IN ('envio_confirmado', 'resposta', 'reuniao', 'proposta', 'conversao', 'sem_interesse', 'nao_contatar', 'reativado', 'nota')`,
    ),
  ],
);

/**
 * Envio automático de WhatsApp (migration 0010). Uma única linha (id = 1).
 * Nasce DESLIGADO: só liga com uma mensagem do Gemini aprovada por uma pessoa
 * (`mensagemModeloId`) — a validação humana da primeira mensagem.
 */
export const prospeccaoEnvioConfig = pgTable(
  "prospeccao_envio_config",
  {
    id: integer("id").primaryKey().default(1),
    ativo: boolean("ativo").notNull().default(false),
    /** Teto de envios por dia (fuso de São Paulo). Máximo 10 por decisão do Pedro (2026-10-29). */
    limiteDiario: integer("limite_diario").notNull().default(10),
    /** Nome que o Gemini usa para assinar ("Aqui é <nome>, da Anjos Eventos"). */
    nomeRemetente: text("nome_remetente"),
    mensagemModeloId: integer("mensagem_modelo_id").references(() => leadMensagens.id),
    ligadoPor: integer("ligado_por").references(() => usuarios.id),
    ligadoEm: timestamp("ligado_em", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("prospeccao_envio_config_unica_check", sql`${t.id} = 1`),
    check("prospeccao_envio_config_limite_check", sql`${t.limiteDiario} BETWEEN 1 AND 10`),
    check(
      "prospeccao_envio_config_ligado_check",
      sql`NOT ${t.ativo} OR (${t.mensagemModeloId} IS NOT NULL AND ${t.nomeRemetente} IS NOT NULL)`,
    ),
  ],
);

/** Fila de leads para o envio automático (um item por tentativa de abordagem). */
export const prospeccaoFilaEnvio = pgTable(
  "prospeccao_fila_envio",
  {
    id: serial("id").primaryKey(),
    leadId: integer("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    estado: text("estado").notNull().default("pendente"),
    tentativas: integer("tentativas").notNull().default(0),
    /** Motivo curto de cancelamento/falha (nunca guarda telefone nem texto da mensagem). */
    motivo: text("motivo"),
    mensagemId: integer("mensagem_id").references(() => leadMensagens.id),
    enfileiradoPor: integer("enfileirado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    iniciadoEm: timestamp("iniciado_em", { withTimezone: true }),
    concluidoEm: timestamp("concluido_em", { withTimezone: true }),
  },
  (t) => [
    index("idx_prospeccao_fila_envio_estado").on(t.estado, t.id),
    index("idx_prospeccao_fila_envio_lead").on(t.leadId),
    // Um lead não entra duas vezes na fila enquanto houver item em aberto.
    uniqueIndex("uq_prospeccao_fila_envio_aberto")
      .on(t.leadId)
      .where(sql`${t.estado} IN ('pendente', 'enviando', 'conferir')`),
    check(
      "prospeccao_fila_envio_estado_check",
      sql`${t.estado} IN ('pendente', 'enviando', 'enviada', 'falhou', 'cancelada', 'conferir')`,
    ),
  ],
);
