CREATE TABLE "preparo_variacoes" (
	"preparo_id" integer PRIMARY KEY NOT NULL,
	"base_preparo_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preparo_variacoes_nao_propria_check" CHECK ("preparo_variacoes"."preparo_id" <> "preparo_variacoes"."base_preparo_id")
);
--> statement-breakpoint
ALTER TABLE "preparo_variacoes" ADD CONSTRAINT "preparo_variacoes_preparo_id_preparos_id_fk" FOREIGN KEY ("preparo_id") REFERENCES "public"."preparos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparo_variacoes" ADD CONSTRAINT "preparo_variacoes_base_preparo_id_preparos_id_fk" FOREIGN KEY ("base_preparo_id") REFERENCES "public"."preparos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_preparo_variacoes_base" ON "preparo_variacoes" USING btree ("base_preparo_id");