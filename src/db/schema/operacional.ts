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
} from "drizzle-orm/pg-core";
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

export const decisoesOperacionaisEvento = pgTable("decisoes_operacionais_evento", {
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
  tacaChampanhe: boolean("taca_champanhe").default(false),
  tipoTalher: text("tipo_talher"),
  ordensDisparadasEm: timestamp("ordens_disparadas_em", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
