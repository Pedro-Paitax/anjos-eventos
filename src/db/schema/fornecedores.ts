/**
 * Fornecedores de insumos (atacadistas, açougues, mercados, Ceasa...).
 * Tabela nova — não existe no banco antes da migration 0011.
 * Arquivo próprio (sem importar insumos) para `insumos` e `precos` referenciarem sem ciclo.
 */
import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  /** Dígitos com DDI (ex.: 5541999999999). */
  telefone: text("telefone"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
