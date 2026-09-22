/**
 * docs/schema-fisico-detalhado.md, seção 1.
 *
 * DIVERGÊNCIA ENCONTRADA E CORRIGIDA (não presumida): o documento
 * propõe Categoria = Entrada/Guarnições/Molhos/Carnes/Saladas
 * Leves/Saladas Pesadas/Bebidas/Sobremesa. Os valores REAIS hoje em
 * uso em Preparos.Categoria no NocoDB (conferido ao vivo,
 * 2026-09-16) são outros: Bebidas, Carnes, Entrada, Guarnições,
 * Massas, Molhos, Saladas, Sobremesa — sem "Massas" no documento, e
 * "Saladas" nunca foi dividida em Leves/Pesadas nesse campo (só a
 * Macro_Categoria/Header_UI vinculada foi dividida, ver
 * docs/DECISOES.md "Divisão de Saladas Leves e Pesadas"). O enum
 * abaixo segue o dado real, não o documento — usar o do documento
 * quebraria a inserção de qualquer Preparo real no ETL.
 *
 * Unidade_Rendimento: o campo NocoDB ("UOM Rendimento") permite G, ML,
 * Unidade, KG e Pessoas, mas só G/ML/Unidade têm uso real hoje
 * (conferido ao vivo) — segue o documento (G, ML, Unidade). Se um
 * Preparo futuro usar KG/Pessoas antes do ETL rodar, o enum precisa
 * ser expandido primeiro.
 */
import { pgTable, serial, text, numeric, integer, pgEnum } from "drizzle-orm/pg-core";

export const categoriaPreparoEnum = pgEnum("categoria_preparo", [
  "Bebidas",
  "Carnes",
  "Entrada",
  "Guarnições",
  "Massas",
  "Molhos",
  "Saladas",
  "Sobremesa",
]);

export const unidadeRendimentoEnum = pgEnum("unidade_rendimento", ["G", "ML", "Unidade"]);

export const subcategoriaProteinaEnum = pgEnum("subcategoria_proteina", [
  "Carne Vermelha",
  "Ovino",
  "Suíno",
  "Peixe",
  "Aves",
]);

export const restricaoAlimentarEnum = pgEnum("restricao_alimentar", [
  "Vegano",
  "Vegetariano",
  "Sem Gluten",
  "Sem Lactose",
]);

export const preparos = pgTable("preparos", {
  id: serial("id").primaryKey(),
  nomePreparo: text("nome_preparo").notNull(),
  categoria: categoriaPreparoEnum("categoria").notNull(),
  rendimento: numeric("rendimento", { precision: 10, scale: 3 }).notNull(),
  unidadeRendimento: unidadeRendimentoEnum("unidade_rendimento").notNull(),
  /**
   * Substitui "Requisitos de Logística" (multi-select fixo do NocoDB)
   * por texto livre — decisão já registrada no schema lógico
   * ("decidido explicitamente aberto"). O ETL precisa concatenar os
   * valores multi-select existentes num texto equivalente; não é uma
   * migração 1:1 de tipo.
   */
  apresentacaoUtensilio: text("apresentacao_utensilio"),
  tags: restricaoAlimentarEnum("tags").array(),
  modoPreparo: text("modo_preparo").notNull(),
  tempoPreparoMinutos: integer("tempo_preparo_minutos"),
  /** Sem default deliberadamente — fail-fast se não preenchido (docs/DECISOES.md, Motor de dimensionamento). */
  pesoAtratividade: numeric("peso_atratividade", { precision: 6, scale: 2 }),
  subcategoriaProteina: subcategoriaProteinaEnum("subcategoria_proteina"),
  porcaoMaximaIndividual: numeric("porcao_maxima_individual", { precision: 10, scale: 3 }),
  /** Obrigatório por validação de aplicação (não constraint de banco — Lacuna 4) quando unidadeRendimento = "Unidade" dentro de macro em g/ml. */
  pesoMedioUnidadeG: numeric("peso_medio_unidade_g", { precision: 10, scale: 3 }),
});
