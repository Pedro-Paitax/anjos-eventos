CREATE TYPE "public"."unidade_insumo" AS ENUM('KG', 'Litro', 'Unidade', 'Maço');--> statement-breakpoint
CREATE TYPE "public"."categoria_preparo" AS ENUM('Bebidas', 'Carnes', 'Entrada', 'Guarnições', 'Massas', 'Molhos', 'Saladas', 'Sobremesa');--> statement-breakpoint
CREATE TYPE "public"."restricao_alimentar" AS ENUM('Vegano', 'Vegetariano', 'Sem Gluten', 'Sem Lactose');--> statement-breakpoint
CREATE TYPE "public"."subcategoria_proteina" AS ENUM('Carne Vermelha', 'Ovino', 'Suíno', 'Peixe', 'Aves');--> statement-breakpoint
CREATE TYPE "public"."unidade_rendimento" AS ENUM('G', 'ML', 'Unidade');--> statement-breakpoint
CREATE TYPE "public"."unidade_macro" AS ENUM('g', 'ml');--> statement-breakpoint
CREATE TYPE "public"."desconto_tipo" AS ENUM('Percentual', 'Valor Fixo', 'Nenhum');--> statement-breakpoint
CREATE TYPE "public"."status_orcamento" AS ENUM('Simulação', 'Enviado', 'Aceito', 'Recusado');--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "empresas_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"empresa_id" integer NOT NULL,
	"cliente" text NOT NULL,
	"data_evento" timestamp NOT NULL,
	"tipo_evento" text,
	"num_convidados" integer,
	"status" text DEFAULT 'orcado' NOT NULL,
	"valor" numeric(10, 2),
	"observacoes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"unidade" "unidade_insumo" NOT NULL,
	"preco" numeric(10, 4),
	"fator_correcao" numeric(4, 3),
	CONSTRAINT "insumos_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "preparos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_preparo" text NOT NULL,
	"categoria" "categoria_preparo" NOT NULL,
	"rendimento" numeric(10, 3) NOT NULL,
	"unidade_rendimento" "unidade_rendimento" NOT NULL,
	"apresentacao_utensilio" text,
	"tags" "restricao_alimentar"[],
	"modo_preparo" text NOT NULL,
	"tempo_preparo_minutos" integer,
	"peso_atratividade" numeric(6, 2),
	"subcategoria_proteina" "subcategoria_proteina",
	"porcao_maxima_individual" numeric(10, 3),
	"peso_medio_unidade_g" numeric(10, 3)
);
--> statement-breakpoint
CREATE TABLE "composicao" (
	"id" serial PRIMARY KEY NOT NULL,
	"quantidade" numeric(10, 4) NOT NULL,
	"insumo_id" integer NOT NULL,
	"preparo_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "header_preparo" (
	"header_ui_id" integer NOT NULL,
	"preparo_id" integer NOT NULL,
	CONSTRAINT "header_preparo_header_ui_id_preparo_id_pk" PRIMARY KEY("header_ui_id","preparo_id")
);
--> statement-breakpoint
CREATE TABLE "headers_ui" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_exibicao" text NOT NULL,
	"macro_categoria_id" integer NOT NULL,
	CONSTRAINT "headers_ui_nome_exibicao_unique" UNIQUE("nome_exibicao")
);
--> statement-breakpoint
CREATE TABLE "macro_categorias" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_macro" text NOT NULL,
	"capacidade_teto" numeric(8, 2) NOT NULL,
	"unidade" "unidade_macro" NOT NULL,
	CONSTRAINT "macro_categorias_nome_macro_unique" UNIQUE("nome_macro")
);
--> statement-breakpoint
CREATE TABLE "itens_evento_confirmados" (
	"id" serial PRIMARY KEY NOT NULL,
	"evento_id" integer NOT NULL,
	"preparo_id" integer NOT NULL,
	"orcamento_origem_id" integer,
	"quantidade_confirmada" numeric(10, 4) NOT NULL,
	"custo_unitario_snapshot" numeric(10, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itens_orcamento" (
	"id" serial PRIMARY KEY NOT NULL,
	"orcamento_id" integer NOT NULL,
	"preparo_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"evento_id" integer,
	"empresa_id" integer NOT NULL,
	"cliente_nome" text,
	"num_convidados" integer NOT NULL,
	"status" "status_orcamento" NOT NULL,
	"desconto_tipo" "desconto_tipo",
	"desconto_valor" numeric(10, 2),
	"usar_preco_fixo_modelo" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composicao" ADD CONSTRAINT "composicao_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "composicao" ADD CONSTRAINT "composicao_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "header_preparo" ADD CONSTRAINT "header_preparo_header_ui_id_headers_ui_id_fk" FOREIGN KEY ("header_ui_id") REFERENCES "public"."headers_ui"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "header_preparo" ADD CONSTRAINT "header_preparo_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "headers_ui" ADD CONSTRAINT "headers_ui_macro_categoria_id_macro_categorias_id_fk" FOREIGN KEY ("macro_categoria_id") REFERENCES "public"."macro_categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_evento_confirmados" ADD CONSTRAINT "itens_evento_confirmados_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_evento_confirmados" ADD CONSTRAINT "itens_evento_confirmados_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_evento_confirmados" ADD CONSTRAINT "itens_evento_confirmados_orcamento_origem_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_origem_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itens_orcamento" ADD CONSTRAINT "itens_orcamento_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;