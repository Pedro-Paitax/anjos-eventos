/**
 * docs/schema-fisico-detalhado.md, seção 3.
 *
 * ON DELETE CASCADE em `preparoId` (instruído explicitamente): ao
 * excluir um Preparo já elegível para exclusão, suas linhas de
 * Composição são removidas junto — não têm significado próprio sem o
 * Preparo pai.
 *
 * `insumoId` fica sem regra de ON DELETE explícita (não instruído) —
 * comportamento padrão do Postgres (NO ACTION) impede excluir um
 * Insumo referenciado por alguma Composição, mesmo efeito prático de
 * RESTRICT.
 */
import { pgTable, serial, numeric, integer } from "drizzle-orm/pg-core";
import { insumos } from "./insumos";
import { preparos } from "./preparos";

export const composicao = pgTable("composicao", {
  id: serial("id").primaryKey(),
  /** Na mesma unidade comercial do Insumo referenciado — nunca convertida. */
  quantidade: numeric("quantidade", { precision: 10, scale: 4 }).notNull(),
  insumoId: integer("insumo_id")
    .notNull()
    .references(() => insumos.id),
  preparoId: integer("preparo_id")
    .notNull()
    .references(() => preparos.id, { onDelete: "cascade" }),
});
