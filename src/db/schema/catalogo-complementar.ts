/**
 * Tabelas do NocoDB que ficaram FORA do primeiro desenho
 * (docs/schema-fisico-detalhado.md cobre só 7 tabelas) mas que o app real
 * lê hoje — incluídas por decisão do Pedro em 2026-09-21
 * (docs/CHECKLIST_CORTE_PRODUCAO.md, decisão 1). Colunas conferidas ao
 * vivo no NocoDB (GET /api/v2/meta/tables/...), não inventadas.
 *
 * Decisões técnicas minhas, sinalizadas para revisão (mesmo padrão de
 * cautela de cardapio-referencia.ts):
 * - Tipos numéricos seguem a regra do projeto: dinheiro numeric(10,2),
 *   peso/tolerância numeric(6,2)/(10,2) — nunca float.
 * - cardapio_modelo_itens.cardapio_modelo_id: ON DELETE CASCADE (item de
 *   cardápio não tem significado sem o cardápio pai — mesma lógica de
 *   Composição). preparo_id: comportamento padrão (NO ACTION) — mesma
 *   política de Itens_Orcamento (não excluir Preparo referenciado).
 * - orcamento_itens_adicionais.orcamento_id NOT NULL, sem regra de ON
 *   DELETE (não decidido — mesma pendência de Itens_Orcamento, Lacuna 5).
 */
import { pgTable, serial, text, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { preparos, subcategoriaProteinaEnum } from "./preparos";
import { orcamentos } from "./orcamentos";

export const origemDadoEnum = pgEnum("origem_dado", ["Dado Operacional", "Estimativa Heurística"]);

export const hierarquiaProteina = pgTable("hierarquia_proteina", {
  id: serial("id").primaryKey(),
  subcategoria: subcategoriaProteinaEnum("subcategoria").notNull(),
  pesoPadrao: numeric("peso_padrao", { precision: 6, scale: 2 }).notNull(),
  origemDado: origemDadoEnum("origem_dado").notNull(),
});

/** Linha única (Id=1) hoje — tolerância de troca de pacote fixo, ajustável sem deploy. */
export const configuracoesGlobais = pgTable("configuracoes_globais", {
  id: serial("id").primaryKey(),
  toleranciaTrocaPrecoFixo: numeric("tolerancia_troca_preco_fixo", { precision: 10, scale: 2 }).notNull(),
});

export const cardapiosModelo = pgTable("cardapios_modelo", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  /** Nulo = cardápio sem preço fixo (cálculo dinâmico custo × 1,40). */
  precoFixoPorPessoa: numeric("preco_fixo_por_pessoa", { precision: 10, scale: 2 }),
});

export const cardapioModeloItens = pgTable("cardapio_modelo_itens", {
  id: serial("id").primaryKey(),
  cardapioModeloId: integer("cardapio_modelo_id")
    .notNull()
    .references(() => cardapiosModelo.id, { onDelete: "cascade" }),
  preparoId: integer("preparo_id")
    .notNull()
    .references(() => preparos.id),
});

export const orcamentoItensAdicionais = pgTable("orcamento_itens_adicionais", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valor: numeric("valor", { precision: 10, scale: 2 }).notNull(),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
});
