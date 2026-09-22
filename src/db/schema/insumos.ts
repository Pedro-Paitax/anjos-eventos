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
import { pgTable, serial, text, numeric, pgEnum } from "drizzle-orm/pg-core";

export const unidadeInsumoEnum = pgEnum("unidade_insumo", ["KG", "Litro", "Unidade", "Maço"]);

export const insumos = pgTable("insumos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  unidade: unidadeInsumoEnum("unidade").notNull(),
  /** Já inclui margem interna de 10-15% sobre o custo de fornecedor — não é preço bruto (docs/DECISOES.md). */
  preco: numeric("preco", { precision: 10, scale: 4 }),
  /** Fração aproveitável após limpeza/perda, 0 a 1. Vazio ou 0 → tratar custo como R$0 na aplicação. */
  fatorCorrecao: numeric("fator_correcao", { precision: 4, scale: 3 }),
});
