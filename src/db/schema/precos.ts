/**
 * Fornecedores, cotações e histórico de preços de insumos.
 * Tabelas novas — não existem no banco antes da migration 0011.
 * Domínios em `src/lib/precos-opcoes.ts` (os CHECKs abaixo repetem as mesmas listas).
 *
 * O preço do histórico é o BRUTO do fornecedor (o que está na cotação ou na nota).
 * `insumos.preco` já tem a margem interna de 10-15% embutida (docs/DECISOES.md):
 * nada aqui atualiza `insumos.preco` sozinho.
 *
 * Sem DELETE pela interface: fornecedor que saiu fica com `ativo = false`;
 * cotação errada fica `descartada` (as linhas dela saem das comparações).
 */
import {
  pgTable,
  serial,
  integer,
  text,
  date,
  numeric,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usuarios } from "./nucleo-existente";
import { insumos } from "./insumos";
import { fornecedores } from "./fornecedores";

/** Um documento de preços de um fornecedor: PDF de cotação, planilha da tarefa agendada ou digitação. */
export const cotacoes = pgTable(
  "cotacoes",
  {
    id: serial("id").primaryKey(),
    fornecedorId: integer("fornecedor_id")
      .notNull()
      .references(() => fornecedores.id),
    dataCotacao: date("data_cotacao").notNull(),
    origem: text("origem").notNull(),
    arquivoNome: text("arquivo_nome"),
    /** `rascunho` = lida, aguardando conferência; só `aprovada` entra nas comparações. */
    status: text("status").notNull().default("rascunho"),
    observacoes: text("observacoes"),
    registradoPor: integer("registrado_por").references(() => usuarios.id),
    aprovadaPor: integer("aprovada_por").references(() => usuarios.id),
    aprovadaEm: timestamp("aprovada_em", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_cotacoes_fornecedor").on(t.fornecedorId, t.dataCotacao),
    check("cotacoes_origem_check", sql`${t.origem} IN ('pdf_ia', 'planilha', 'manual')`),
    check("cotacoes_status_check", sql`${t.status} IN ('rascunho', 'aprovada', 'descartada')`),
  ],
);

/**
 * Cada mudança de `insumos.preco` (preço de cadastro, já com a margem), gravada pelo gatilho
 * `trg_insumos_alteracao_preco` da migration 0013 — vale para qualquer caminho (tela, botão
 * "Usar no cadastro", scripts). Insumo novo entra com `preco_anterior` nulo.
 * `enviado_em` nulo = ainda não saiu no resumo diário de preços pelo WhatsApp (src/lib/precos-resumo.ts).
 */
export const alteracoesPrecoInsumo = pgTable(
  "alteracoes_preco_insumo",
  {
    id: serial("id").primaryKey(),
    insumoId: integer("insumo_id")
      .notNull()
      .references(() => insumos.id),
    precoAnterior: numeric("preco_anterior", { precision: 10, scale: 4 }),
    precoNovo: numeric("preco_novo", { precision: 10, scale: 4 }),
    alteradoEm: timestamp("alterado_em", { withTimezone: true }).notNull().defaultNow(),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
  },
  (t) => [index("idx_alteracoes_preco_pendentes").on(t.enviadoEm, t.alteradoEm)],
);

/** Um preço observado. Linha sem insumo = item da cotação ainda não ligado a um insumo. */
export const historicoPrecos = pgTable(
  "historico_precos",
  {
    id: serial("id").primaryKey(),
    insumoId: integer("insumo_id").references(() => insumos.id),
    fornecedorId: integer("fornecedor_id").references(() => fornecedores.id),
    cotacaoId: integer("cotacao_id").references(() => cotacoes.id, { onDelete: "cascade" }),
    /** Como o item aparece no fornecedor (ex.: "PICANHA RESF. KG"). */
    nomeNoFornecedor: text("nome_no_fornecedor"),
    /** Unidade como o fornecedor vende (ex.: "KG", "CX 10 KG"); o preço já vem na unidade do insumo. */
    unidadeFornecedor: text("unidade_fornecedor"),
    /** Preço bruto do fornecedor, na unidade do insumo. Sem a margem interna. */
    preco: numeric("preco", { precision: 10, scale: 4 }).notNull(),
    fonte: text("fonte").notNull(),
    observadoEm: date("observado_em").notNull(),
    urlFonte: text("url_fonte"),
    observacao: text("observacao"),
    registradoPor: integer("registrado_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_historico_precos_insumo").on(t.insumoId, t.observadoEm),
    index("idx_historico_precos_fornecedor").on(t.fornecedorId, t.observadoEm),
    index("idx_historico_precos_cotacao").on(t.cotacaoId),
    check("historico_precos_preco_check", sql`${t.preco} >= 0`),
    check(
      "historico_precos_fonte_check",
      sql`${t.fonte} IN ('cotacao_pdf', 'nota_fiscal', 'pesquisa_web', 'ceasa', 'manual')`,
    ),
  ],
);
