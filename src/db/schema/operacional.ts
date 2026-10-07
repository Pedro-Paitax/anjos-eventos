/**
 * Equipe e decisões operacionais por evento (Senhor Churrasco).
 * Tabelas novas — não existem no banco antes da migration 0005.
 */
import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  primaryKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { eventos } from "./nucleo-existente";

export const funcaoColaboradorEnum = pgEnum("funcao_colaborador", [
  "copeira",
  "assador",
  "garcom",
]);

export const colaboradores = pgTable("colaboradores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  funcao: funcaoColaboradorEnum("funcao").notNull(),
  /** Formato internacional, ex.: 5541999999999. */
  telefoneWhatsapp: text("telefone_whatsapp"),
  ativo: boolean("ativo").notNull().default(true),
});

export const eventoColaboradores = pgTable(
  "evento_colaboradores",
  {
    eventoId: integer("evento_id")
      .notNull()
      .references(() => eventos.id, { onDelete: "cascade" }),
    colaboradorId: integer("colaborador_id")
      .notNull()
      .references(() => colaboradores.id),
    papelNoEvento: text("papel_no_evento"),
  },
  (t) => [primaryKey({ columns: [t.eventoId, t.colaboradorId] })],
);

export const decisoesOperacionaisEvento = pgTable(
  "decisoes_operacionais_evento",
  {
    id: serial("id").primaryKey(),
    eventoId: integer("evento_id")
      .notNull()
      .unique()
      .references(() => eventos.id, { onDelete: "cascade" }),
    veiculo: text("veiculo"),
    modeloPrato: text("modelo_prato"),
    sousplat: boolean("sousplat").default(false),
    tipoBebidaRecipiente: text("tipo_bebida_recipiente"),
    tacaFurtaCor: boolean("taca_furta_cor").default(false),
    /** Nula = sem quantidade informada (registros antigos com a caixa marcada ficam assim). */
    qtdTacaFurtaCor: integer("qtd_taca_furta_cor"),
    tacaChampanhe: boolean("taca_champanhe").default(false),
    qtdTacaChampanhe: integer("qtd_taca_champanhe"),
    tipoTalher: text("tipo_talher"),
    ordensDisparadasEm: timestamp("ordens_disparadas_em", { withTimezone: true }),
    /**
     * Migração 0007 — NÃO APLICADA. Lida e gravada só por src/lib/lista-compras-envio.ts,
     * fora das consultas de decisões (que não a incluem), com try/catch.
     */
    listaComprasEnviadaEm: timestamp("lista_compras_enviada_em", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check(
      "decisoes_operacionais_evento_qtd_taca_furta_cor_check",
      sql`${t.qtdTacaFurtaCor} IS NULL OR ${t.qtdTacaFurtaCor} > 0`,
    ),
    check(
      "decisoes_operacionais_evento_qtd_taca_champanhe_check",
      sql`${t.qtdTacaChampanhe} IS NULL OR ${t.qtdTacaChampanhe} > 0`,
    ),
  ],
);
