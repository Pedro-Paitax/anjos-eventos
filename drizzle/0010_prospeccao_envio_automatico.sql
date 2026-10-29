CREATE TABLE "prospeccao_envio_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"limite_diario" integer DEFAULT 10 NOT NULL,
	"nome_remetente" text,
	"mensagem_modelo_id" integer,
	"ligado_por" integer,
	"ligado_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prospeccao_envio_config_unica_check" CHECK ("prospeccao_envio_config"."id" = 1),
	CONSTRAINT "prospeccao_envio_config_limite_check" CHECK ("prospeccao_envio_config"."limite_diario" BETWEEN 1 AND 10),
	CONSTRAINT "prospeccao_envio_config_ligado_check" CHECK (NOT "prospeccao_envio_config"."ativo" OR ("prospeccao_envio_config"."mensagem_modelo_id" IS NOT NULL AND "prospeccao_envio_config"."nome_remetente" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "prospeccao_fila_envio" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"estado" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"motivo" text,
	"mensagem_id" integer,
	"enfileirado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"iniciado_em" timestamp with time zone,
	"concluido_em" timestamp with time zone,
	CONSTRAINT "prospeccao_fila_envio_estado_check" CHECK ("prospeccao_fila_envio"."estado" IN ('pendente', 'enviando', 'enviada', 'falhou', 'cancelada', 'conferir'))
);
--> statement-breakpoint
ALTER TABLE "prospeccao_envio_config" ADD CONSTRAINT "prospeccao_envio_config_mensagem_modelo_id_lead_mensagens_id_fk" FOREIGN KEY ("mensagem_modelo_id") REFERENCES "public"."lead_mensagens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospeccao_envio_config" ADD CONSTRAINT "prospeccao_envio_config_ligado_por_usuarios_id_fk" FOREIGN KEY ("ligado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospeccao_fila_envio" ADD CONSTRAINT "prospeccao_fila_envio_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospeccao_fila_envio" ADD CONSTRAINT "prospeccao_fila_envio_mensagem_id_lead_mensagens_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."lead_mensagens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospeccao_fila_envio" ADD CONSTRAINT "prospeccao_fila_envio_enfileirado_por_usuarios_id_fk" FOREIGN KEY ("enfileirado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_prospeccao_fila_envio_estado" ON "prospeccao_fila_envio" USING btree ("estado","id");--> statement-breakpoint
CREATE INDEX "idx_prospeccao_fila_envio_lead" ON "prospeccao_fila_envio" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_prospeccao_fila_envio_aberto" ON "prospeccao_fila_envio" USING btree ("lead_id") WHERE "prospeccao_fila_envio"."estado" IN ('pendente', 'enviando', 'conferir');