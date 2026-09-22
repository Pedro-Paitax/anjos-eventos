/**
 * Espelho das tabelas que já existem fisicamente no Postgres LOCAL
 * (database/init/01..06 + alterações posteriores), que passam a existir
 * também no Oracle no corte de produção (docs/CHECKLIST_CORTE_PRODUCAO.md).
 * Colunas e tipos conferidos contra information_schema do Postgres local
 * em 2026-09-21 — nada foi redesenhado aqui.
 *
 * CORREÇÃO (2026-09-21): a primeira versão deste arquivo espelhava só o
 * 01-schema.sql (eventos com 11 colunas). O Postgres local real tem 42
 * colunas em `eventos` (03..06 acrescentaram detalhes/cardápio/preço).
 * `numConvidados` é a única coluna que existe só aqui, não no local
 * (herança do espelho inicial): fica nullable e inofensiva; remover no
 * dia do corte junto com o truncate+reload, sob aprovação (evita DROP
 * COLUMN fora de janela).
 */
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  numeric,
  jsonb,
  boolean,
  time,
  date,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const eventos = pgTable(
  "eventos",
  {
    id: serial("id").primaryKey(),
    empresaId: integer("empresa_id")
      .notNull()
      .references(() => empresas.id),
    cliente: text("cliente").notNull(),
    dataEvento: timestamp("data_evento", { mode: "date" }).notNull(),
    tipoEvento: text("tipo_evento"),
    /** Só existe no espelho do Oracle, não no Postgres local — ver comentário do arquivo. */
    numConvidados: integer("num_convidados"),
    status: text("status").notNull().default("orcado"),
    valor: numeric("valor", { precision: 10, scale: 2 }),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
    detalhes: jsonb("detalhes"),
    qtdAdultos: integer("qtd_adultos"),
    qtdCriancasAte5: integer("qtd_criancas_ate_5"),
    qtdCriancas5a10: integer("qtd_criancas_5_a_10"),
    qtdFornecedores: integer("qtd_fornecedores"),
    cardapioCarnes: text("cardapio_carnes"),
    cardapioAcompanhamentos: text("cardapio_acompanhamentos"),
    cardapioSaladas: text("cardapio_saladas"),
    cardapioBebidas: text("cardapio_bebidas"),
    precoPessoa: numeric("preco_pessoa", { precision: 10, scale: 2 }),
    precoCriancaMeia: numeric("preco_crianca_meia", { precision: 10, scale: 2 }),
    valorGarcom: numeric("valor_garcom", { precision: 10, scale: 2 }),
    taxaDeslocamento: numeric("taxa_deslocamento", { precision: 10, scale: 2 }),
    qtdGarcons: integer("qtd_garcons"),
    contato: text("contato"),
    telefone: text("telefone"),
    enderecoEvento: text("endereco_evento"),
    horaChegadaEquipe: time("hora_chegada_equipe"),
    horaAperitivo: time("hora_aperitivo"),
    horaAlmoco: time("hora_almoco"),
    horaEncerramento: time("hora_encerramento"),
    qtdChurrasqueiros: integer("qtd_churrasqueiros"),
    qtdCopeiras: integer("qtd_copeiras"),
    prazoPagamento: date("prazo_pagamento"),
    chavePix: text("chave_pix"),
    caminhoContrato: text("caminho_contrato"),
    cardapioEntrada: text("cardapio_entrada"),
    cardapioSobremesa: text("cardapio_sobremesa"),
    regiaoMetropolitanaCuritiba: boolean("regiao_metropolitana_curitiba"),
    quantidadeCopeiraSugerida: integer("quantidade_copeira_sugerida"),
    custoCopeiraTotal: numeric("custo_copeira_total", { precision: 10, scale: 2 }),
    custoAssadorTotal: numeric("custo_assador_total", { precision: 10, scale: 2 }),
  },
  (t) => [
    index("idx_eventos_empresa_id").on(t.empresaId),
    index("idx_eventos_data_evento").on(t.dataEvento),
    index("idx_eventos_status").on(t.status),
    check(
      "eventos_status_check",
      sql`${t.status} IN ('orcado', 'confirmado', 'realizado', 'cancelado')`
    ),
  ]
);

export const contratos = pgTable(
  "contratos",
  {
    id: serial("id").primaryKey(),
    eventoId: integer("evento_id")
      .notNull()
      .references(() => eventos.id, { onDelete: "cascade" }),
    arquivoPdf: text("arquivo_pdf").notNull(),
    dadosExtraidosRaw: jsonb("dados_extraidos_raw"),
    confirmadoPor: text("confirmado_por"),
    confirmadoEm: timestamp("confirmado_em", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (t) => [index("idx_contratos_evento_id").on(t.eventoId)]
);
