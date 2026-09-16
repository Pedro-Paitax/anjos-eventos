/**
 * docs/schema-fisico-detalhado.md, seções 6 e 7.
 *
 * `Valor_Base_Por_Pessoa` NÃO existe aqui — Lacuna 1, resolvida
 * (docs/DECISOES.md, "Arquitetura Financeira do Orçamento" +
 * docs/schema-fisico-detalhado.md): Valor_Sugerido_Por_Pessoa nunca é
 * persistido, sempre calculado em tempo real. Desconto aplica sobre
 * Valor_Sugerido_Total_Evento, nunca sobre o valor por pessoa.
 *
 * ON DELETE em preparoId de `itensOrcamento`: RESTRICT (instruído
 * explicitamente) — não é possível excluir um Preparo referenciado
 * num Orçamento.
 *
 * `orcamentoId` em `itensOrcamento` fica SEM regra de ON DELETE
 * (não instruído — docs/schema-fisico-detalhado.md marca isso
 * explicitamente como "candidato a CASCADE... mas não formalizado",
 * Lacuna 5). Comportamento padrão do Postgres (NO ACTION) por ora.
 */
import { pgTable, serial, text, integer, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { empresas, eventos } from "./nucleo-existente";
import { preparos } from "./preparos";

export const statusOrcamentoEnum = pgEnum("status_orcamento", [
  "Simulação",
  "Enviado",
  "Aceito",
  "Recusado",
]);

export const descontoTipoEnum = pgEnum("desconto_tipo", ["Percentual", "Valor Fixo", "Nenhum"]);

export const orcamentos = pgTable("orcamentos", {
  id: serial("id").primaryKey(),
  eventoId: integer("evento_id").references(() => eventos.id),
  empresaId: integer("empresa_id")
    .notNull()
    .references(() => empresas.id),
  clienteNome: text("cliente_nome"),
  numConvidados: integer("num_convidados").notNull(),
  status: statusOrcamentoEnum("status").notNull(),
  descontoTipo: descontoTipoEnum("desconto_tipo"),
  descontoValor: numeric("desconto_valor", { precision: 10, scale: 2 }),
  /** Só true quando um Cardápio Modelo com preço fixo foi carregado — nunca default incondicional. */
  usarPrecoFixoModelo: boolean("usar_preco_fixo_modelo").notNull().default(false),
  criadoEm: timestamp("criado_em", { mode: "date" }).notNull().defaultNow(),
  /** Atualizado pela aplicação a cada modificação — sem trigger de banco, mesmo padrão já usado em eventos.updated_at. */
  atualizadoEm: timestamp("atualizado_em", { mode: "date" }).notNull().defaultNow(),
});

export const itensOrcamento = pgTable("itens_orcamento", {
  id: serial("id").primaryKey(),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  preparoId: integer("preparo_id")
    .notNull()
    .references(() => preparos.id, { onDelete: "restrict" }),
});

/**
 * Definição MÍNIMA — esta tabela está "fora do escopo pedido" em
 * docs/schema-fisico-detalhado.md (não teve suas próprias lacunas
 * resolvidas), mas precisa existir para o ON DELETE RESTRICT de
 * Preparos exigido explicitamente ("referenciado por Itens_Orcamento/
 * Itens_Evento_Confirmados"). Colunas conferidas contra docs/BANCO.md
 * (verificado ao vivo no NocoDB) — nullability de orcamentoOrigemId
 * marcada nullable por cautela (não confirmado se é sempre
 * preenchido); redesenho completo desta tabela fica pendente.
 */
export const itensEventoConfirmados = pgTable("itens_evento_confirmados", {
  id: serial("id").primaryKey(),
  eventoId: integer("evento_id")
    .notNull()
    .references(() => eventos.id),
  preparoId: integer("preparo_id")
    .notNull()
    .references(() => preparos.id, { onDelete: "restrict" }),
  orcamentoOrigemId: integer("orcamento_origem_id").references(() => orcamentos.id),
  quantidadeConfirmada: numeric("quantidade_confirmada", { precision: 10, scale: 4 }).notNull(),
  custoUnitarioSnapshot: numeric("custo_unitario_snapshot", { precision: 10, scale: 4 }).notNull(),
});
