ALTER TABLE "macro_categorias" ADD COLUMN "peso_acompanhamento" numeric(3, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "macro_categorias" ADD COLUMN "ajusta_por_acompanhamentos" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracoes_globais" ADD COLUMN "acomp_referencia" numeric(4, 1);--> statement-breakpoint
ALTER TABLE "configuracoes_globais" ADD COLUMN "acomp_reducao_por_item" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "configuracoes_globais" ADD COLUMN "teto_carne_piso_g" numeric(6, 2);