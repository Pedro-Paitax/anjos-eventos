/**
 * docs/schema-fisico-detalhado.md, seção 2.
 *
 * "Preço Corrigido" NÃO é uma coluna física (Lacuna 6, resolvida
 * aqui): escolhido calcular em runtime, não como coluna gerada
 * (GENERATED ALWAYS AS ... STORED). Motivo: a fórmula, incluindo a
 * regra de borda (Fator de Correção vazio ou 0 → custo R$0, evitando
 * divisão por zero), já está implementada e testada em
 * src/lib/custo-preparo.ts (calcularCustoTotalComposicao). Duplicar
 * essa lógica também como expressão SQL geraria duas fontes de
 * verdade que podem divergir silenciosamente; a camada de
 * aplicação/Drizzle deve continuar sendo a única responsável por esse
 * cálculo.
 */
import { pgTable, serial, text, numeric, pgEnum, integer, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { fornecedores } from "./fornecedores";

export const unidadeInsumoEnum = pgEnum("unidade_insumo", ["KG", "Litro", "Unidade", "Maço"]);

export const insumos = pgTable("insumos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  unidade: unidadeInsumoEnum("unidade").notNull(),
  /** Já inclui margem interna de 10-15% sobre o custo de fornecedor — não é preço bruto (docs/DECISOES.md). */
  preco: numeric("preco", { precision: 10, scale: 4 }),
  /** Fração aproveitável após limpeza/perda, 0 a 1. Vazio ou 0 → tratar custo como R$0 na aplicação. */
  fatorCorrecao: numeric("fator_correcao", { precision: 4, scale: 3 }),
  /**
   * Migração 0011 — origem e idade do preço. Lidas e gravadas só por src/lib/precos-insumo.ts,
   * com try/catch (as consultas de src/lib/insumos.ts selecionam colunas explícitas e não as incluem).
   */
  fornecedorPrincipalId: integer("fornecedor_principal_id").references(() => fornecedores.id),
  /** Como o insumo costuma ser comprado: "atacado" ou "varejo". */
  canal: text("canal"),
  /** De onde veio o valor atual de `preco` (mesma lista de historico_precos.fonte). */
  fontePreco: text("fonte_preco"),
  precoAtualizadoEm: timestamp("preco_atualizado_em", { withTimezone: true }),
}, (t) => [
  check("insumos_canal_check", sql`${t.canal} IS NULL OR ${t.canal} IN ('atacado', 'varejo')`),
  check(
    "insumos_fonte_preco_check",
    sql`${t.fontePreco} IS NULL OR ${t.fontePreco} IN ('cotacao_pdf', 'nota_fiscal', 'pesquisa_web', 'ceasa', 'manual')`,
  ),
]);
