/**
 * docs/schema-fisico-detalhado.md, seções 4 e 5, + Lacuna 7 (tabela
 * de junção Headers_UI <-> Preparos, sem nome/estrutura definida no
 * documento — desenhada aqui).
 *
 * UNIQUE em nomeMacro e nomeExibicao: não pedido explicitamente, mas
 * aplicado por julgamento próprio — são tabelas de referência pequenas
 * (9-15 linhas), mantidas manualmente, cujo nome é usado como rótulo
 * único de negócio. Sinalizando como decisão minha para revisão, não
 * como algo já formalizado com o Pedro/Gemini (mesmo padrão de cautela
 * das outras lacunas "óbvias" deste documento).
 */
import { pgTable, serial, text, numeric, integer, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { preparos } from "./preparos";

export const unidadeMacroEnum = pgEnum("unidade_macro", ["g", "ml"]);

export const macroCategorias = pgTable("macro_categorias", {
  id: serial("id").primaryKey(),
  nomeMacro: text("nome_macro").notNull().unique(),
  capacidadeTeto: numeric("capacidade_teto", { precision: 8, scale: 2 }).notNull(),
  unidade: unidadeMacroEnum("unidade").notNull(),
});

export const headersUi = pgTable("headers_ui", {
  id: serial("id").primaryKey(),
  nomeExibicao: text("nome_exibicao").notNull().unique(),
  macroCategoriaId: integer("macro_categoria_id")
    .notNull()
    .references(() => macroCategorias.id),
});

/**
 * Lacuna 7 resolvida: junção N:N nativa (o NocoDB gerenciava isso
 * internamente com prefixo `nc_`, sem estrutura própria pra herdar).
 *
 * ON DELETE CASCADE nas duas pontas — decisão minha, não instruída
 * explicitamente, por analogia direta com Composição (mesma natureza:
 * dado de vínculo/agrupamento sem significado próprio fora do par).
 * Diferente de Itens_Orcamento (histórico/financeiro, propositalmente
 * não decidido esta sessão) — aqui excluir um Preparo ou um Header_UI
 * não apaga nenhum dado de negócio, só a associação entre os dois.
 */
export const headerPreparo = pgTable(
  "header_preparo",
  {
    headerUiId: integer("header_ui_id")
      .notNull()
      .references(() => headersUi.id, { onDelete: "cascade" }),
    preparoId: integer("preparo_id")
      .notNull()
      .references(() => preparos.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.headerUiId, t.preparoId] })]
);
