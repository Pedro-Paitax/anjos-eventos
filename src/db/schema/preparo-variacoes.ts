/**
 * Versões de um preparo ("Fraldinha com Chimichurri" é versão de "Fraldinha").
 * Tabela nova — não existe no banco antes da migration 0012.
 *
 * Cada versão continua sendo um preparo completo (composição, header, custo, porção):
 * esta tabela só agrupa na tela. Nenhum cálculo lê daqui (decisão do Pedro, 2026-11-02,
 * caminho 1 — docs/DECISOES.md, "Versões de preparo").
 *
 * Linha existe = o preparo é versão do base. Apagar a versão ou o base apaga só o vínculo
 * (CASCADE nas duas pontas): a versão vira preparo avulso, nada de negócio se perde.
 * Um nível só (versão de versão não existe) e o base não pode ser versão: checado na aplicação
 * (src/lib/preparos-variacoes.ts), porque CHECK não enxerga outras linhas.
 */
import { pgTable, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { preparos } from "./preparos";

export const preparoVariacoes = pgTable(
  "preparo_variacoes",
  {
    preparoId: integer("preparo_id")
      .primaryKey()
      .references(() => preparos.id, { onDelete: "cascade" }),
    basePreparoId: integer("base_preparo_id")
      .notNull()
      .references(() => preparos.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_preparo_variacoes_base").on(t.basePreparoId),
    check("preparo_variacoes_nao_propria_check", sql`${t.preparoId} <> ${t.basePreparoId}`),
  ],
);
