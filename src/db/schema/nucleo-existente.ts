/**
 * Espelho das tabelas que já existem fisicamente no Postgres
 * (database/init/01-schema.sql), fora do escopo de redesenho desta
 * sessão (docs/schema-fisico-detalhado.md cobre só Preparos, Insumos,
 * Composição, Macro_Categorias, Headers_UI, Itens_Orcamento,
 * Orcamentos). Definidas aqui só para servir de alvo de referência
 * (FK) às tabelas novas — colunas e tipos copiados exatamente do DDL
 * real, nada foi decidido ou alterado aqui.
 */
import { pgTable, serial, text, integer, timestamp, numeric } from "drizzle-orm/pg-core";

export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const eventos = pgTable("eventos", {
  id: serial("id").primaryKey(),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id),
  cliente: text("cliente").notNull(),
  dataEvento: timestamp("data_evento", { mode: "date" }).notNull(),
  tipoEvento: text("tipo_evento"),
  numConvidados: integer("num_convidados"),
  status: text("status").notNull().default("orcado"),
  valor: numeric("valor", { precision: 10, scale: 2 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});
