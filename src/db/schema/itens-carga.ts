/**
 * Checklist de carregamento do Senhor Churrasco (docs/specs/SPEC_CHECKLIST_CARREGAMENTO.md).
 * Migração 0016 — tabelas novas. Lidas e gravadas só por src/lib/checklist-carregamento-dados.ts,
 * com try/catch: sem a migração, a tela do evento e a ficha abrem normalmente.
 *
 * `itens_carga` é o cadastro de itens (o Pedro acrescenta itens sem mexer no código). Um item pode
 * ir em todo evento (`sempre`), ser marcável nas fichas técnicas (`marcavel_ficha`) ou os dois.
 * O local de armazenamento (seção 7 do spec) entra depois só com
 * `ALTER TABLE itens_carga ADD COLUMN local text` — nada aqui depende dele.
 */
import { pgTable, serial, text, integer, boolean, primaryKey, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { insumos } from "./insumos";
import { preparos } from "./preparos";

/** Categorias que vêm deste cadastro. Pratos, talheres dos convidados, taças e comida vêm do evento. */
export const CATEGORIAS_ITEM_CARGA = [
  "Talheres de serviço",
  "Churrasco",
  "Limpeza",
  "Temperos",
  "Louças e servir",
  "Bebidas",
  "Equipamentos",
  "Descartáveis",
  "Equipe",
] as const;

export const REGRAS_ITEM_CARGA = ["so_casamento", "dois_por_preparo"] as const;

const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

export const itensCarga = pgTable(
  "itens_carga",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull().unique(),
    categoria: text("categoria").notNull(),
    /** Subgrupo dentro da categoria (ex.: "Fixos", "Buffet", "Sempre"). Nulo = sem subgrupo. */
    subgrupo: text("subgrupo"),
    /** Vai em todo evento. */
    sempre: boolean("sempre").notNull().default(false),
    /** Aparece na lista de marcar da ficha técnica. */
    marcavelFicha: boolean("marcavel_ficha").notNull().default(false),
    /** so_casamento: só sai em casamento; dois_por_preparo: mostra a conta 2 x preparos. */
    regra: text("regra"),
    /** Tempero fixo ligado ao insumo: o mesmo insumo vindo das fichas não se repete. */
    insumoId: integer("insumo_id").references(() => insumos.id, { onDelete: "set null" }),
    /** Ordem dentro da categoria. */
    ordem: integer("ordem").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [
    check("itens_carga_categoria_check", sql`${t.categoria} IN (${lista(CATEGORIAS_ITEM_CARGA)})`),
    check("itens_carga_regra_check", sql`${t.regra} IS NULL OR ${t.regra} IN (${lista(REGRAS_ITEM_CARGA)})`),
  ],
);

/** Itens de carga marcados em cada ficha técnica (N:N). */
export const preparoItensCarga = pgTable(
  "preparo_itens_carga",
  {
    preparoId: integer("preparo_id")
      .notNull()
      .references(() => preparos.id, { onDelete: "cascade" }),
    itemCargaId: integer("item_carga_id")
      .notNull()
      .references(() => itensCarga.id),
  },
  (t) => [
    primaryKey({ columns: [t.preparoId, t.itemCargaId] }),
    index("idx_preparo_itens_carga_item").on(t.itemCargaId),
  ],
);
