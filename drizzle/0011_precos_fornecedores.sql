CREATE TABLE "fornecedores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"telefone" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fornecedores_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "cotacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"fornecedor_id" integer NOT NULL,
	"data_cotacao" date NOT NULL,
	"origem" text NOT NULL,
	"arquivo_nome" text,
	"status" text DEFAULT 'rascunho' NOT NULL,
	"observacoes" text,
	"registrado_por" integer,
	"aprovada_por" integer,
	"aprovada_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cotacoes_origem_check" CHECK ("cotacoes"."origem" IN ('pdf_ia', 'planilha', 'manual')),
	CONSTRAINT "cotacoes_status_check" CHECK ("cotacoes"."status" IN ('rascunho', 'aprovada', 'descartada'))
);
--> statement-breakpoint
CREATE TABLE "historico_precos" (
	"id" serial PRIMARY KEY NOT NULL,
	"insumo_id" integer,
	"fornecedor_id" integer,
	"cotacao_id" integer,
	"nome_no_fornecedor" text,
	"unidade_fornecedor" text,
	"preco" numeric(10, 4) NOT NULL,
	"fonte" text NOT NULL,
	"observado_em" date NOT NULL,
	"url_fonte" text,
	"observacao" text,
	"registrado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historico_precos_preco_check" CHECK ("historico_precos"."preco" >= 0),
	CONSTRAINT "historico_precos_fonte_check" CHECK ("historico_precos"."fonte" IN ('cotacao_pdf', 'nota_fiscal', 'pesquisa_web', 'ceasa', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "fornecedor_principal_id" integer;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "canal" text;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "fonte_preco" text;--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "preco_atualizado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotacoes" ADD CONSTRAINT "cotacoes_aprovada_por_usuarios_id_fk" FOREIGN KEY ("aprovada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_cotacao_id_cotacoes_id_fk" FOREIGN KEY ("cotacao_id") REFERENCES "public"."cotacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historico_precos" ADD CONSTRAINT "historico_precos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cotacoes_fornecedor" ON "cotacoes" USING btree ("fornecedor_id","data_cotacao");--> statement-breakpoint
CREATE INDEX "idx_historico_precos_insumo" ON "historico_precos" USING btree ("insumo_id","observado_em");--> statement-breakpoint
CREATE INDEX "idx_historico_precos_fornecedor" ON "historico_precos" USING btree ("fornecedor_id","observado_em");--> statement-breakpoint
CREATE INDEX "idx_historico_precos_cotacao" ON "historico_precos" USING btree ("cotacao_id");--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_fornecedor_principal_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_principal_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_canal_check" CHECK ("insumos"."canal" IS NULL OR "insumos"."canal" IN ('atacado', 'varejo'));--> statement-breakpoint
ALTER TABLE "insumos" ADD CONSTRAINT "insumos_fonte_preco_check" CHECK ("insumos"."fonte_preco" IS NULL OR "insumos"."fonte_preco" IN ('cotacao_pdf', 'nota_fiscal', 'pesquisa_web', 'ceasa', 'manual'));