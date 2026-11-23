CREATE TABLE "itens_carga" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"categoria" text NOT NULL,
	"subgrupo" text,
	"sempre" boolean DEFAULT false NOT NULL,
	"marcavel_ficha" boolean DEFAULT false NOT NULL,
	"regra" text,
	"insumo_id" integer,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "itens_carga_nome_unique" UNIQUE("nome"),
	CONSTRAINT "itens_carga_categoria_check" CHECK ("itens_carga"."categoria" IN ('Talheres de serviço', 'Churrasco', 'Limpeza', 'Temperos', 'Louças e servir', 'Bebidas', 'Equipamentos', 'Descartáveis', 'Equipe')),
	CONSTRAINT "itens_carga_regra_check" CHECK ("itens_carga"."regra" IS NULL OR "itens_carga"."regra" IN ('so_casamento', 'dois_por_preparo'))
);
--> statement-breakpoint
CREATE TABLE "preparo_itens_carga" (
	"preparo_id" integer NOT NULL,
	"item_carga_id" integer NOT NULL,
	CONSTRAINT "preparo_itens_carga_preparo_id_item_carga_id_pk" PRIMARY KEY("preparo_id","item_carga_id")
);
--> statement-breakpoint
ALTER TABLE "insumos" ADD COLUMN "eh_tempero" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "itens_carga" ADD CONSTRAINT "itens_carga_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparo_itens_carga" ADD CONSTRAINT "preparo_itens_carga_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparo_itens_carga" ADD CONSTRAINT "preparo_itens_carga_item_carga_id_itens_carga_id_fk" FOREIGN KEY ("item_carga_id") REFERENCES "public"."itens_carga"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_preparo_itens_carga_item" ON "preparo_itens_carga" USING btree ("item_carga_id");