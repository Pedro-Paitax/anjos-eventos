CREATE TYPE "public"."origem_dado" AS ENUM('Dado Operacional', 'Estimativa Heurística');--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" serial PRIMARY KEY NOT NULL,
	"evento_id" integer NOT NULL,
	"arquivo_pdf" text NOT NULL,
	"dados_extraidos_raw" jsonb,
	"confirmado_por" text,
	"confirmado_em" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "usuarios_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "cardapio_modelo_itens" (
	"id" serial PRIMARY KEY NOT NULL,
	"cardapio_modelo_id" integer NOT NULL,
	"preparo_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cardapios_modelo" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_fixo_por_pessoa" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "configuracoes_globais" (
	"id" serial PRIMARY KEY NOT NULL,
	"tolerancia_troca_preco_fixo" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hierarquia_proteina" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcategoria" "subcategoria_proteina" NOT NULL,
	"peso_padrao" numeric(6, 2) NOT NULL,
	"origem_dado" "origem_dado" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_itens_adicionais" (
	"id" serial PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"orcamento_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "detalhes" jsonb;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_adultos" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_criancas_ate_5" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_criancas_5_a_10" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_fornecedores" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_carnes" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_acompanhamentos" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_saladas" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_bebidas" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "preco_pessoa" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "preco_crianca_meia" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "valor_garcom" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "taxa_deslocamento" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_garcons" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "contato" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "telefone" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "endereco_evento" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "hora_chegada_equipe" time;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "hora_aperitivo" time;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "hora_almoco" time;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "hora_encerramento" time;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_churrasqueiros" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "qtd_copeiras" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "prazo_pagamento" date;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "chave_pix" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "caminho_contrato" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_entrada" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "cardapio_sobremesa" text;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "regiao_metropolitana_curitiba" boolean;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "quantidade_copeira_sugerida" integer;--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "custo_copeira_total" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "eventos" ADD COLUMN "custo_assador_total" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardapio_modelo_itens" ADD CONSTRAINT "cardapio_modelo_itens_cardapio_modelo_id_cardapios_modelo_id_fk" FOREIGN KEY ("cardapio_modelo_id") REFERENCES "public"."cardapios_modelo"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cardapio_modelo_itens" ADD CONSTRAINT "cardapio_modelo_itens_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_itens_adicionais" ADD CONSTRAINT "orcamento_itens_adicionais_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_contratos_evento_id" ON "contratos" USING btree ("evento_id");--> statement-breakpoint
CREATE INDEX "idx_eventos_empresa_id" ON "eventos" USING btree ("empresa_id");--> statement-breakpoint
CREATE INDEX "idx_eventos_data_evento" ON "eventos" USING btree ("data_evento");--> statement-breakpoint
CREATE INDEX "idx_eventos_status" ON "eventos" USING btree ("status");--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_status_check" CHECK ("eventos"."status" IN ('orcado', 'confirmado', 'realizado', 'cancelado'));