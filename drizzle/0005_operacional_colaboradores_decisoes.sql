CREATE TYPE "public"."funcao_colaborador" AS ENUM('copeira', 'assador', 'garcom');--> statement-breakpoint
CREATE TABLE "colaboradores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"funcao" "funcao_colaborador" NOT NULL,
	"telefone_whatsapp" text,
	"ativo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisoes_operacionais_evento" (
	"id" serial PRIMARY KEY NOT NULL,
	"evento_id" integer NOT NULL,
	"veiculo" text,
	"modelo_prato" text,
	"sousplat" boolean DEFAULT false,
	"tipo_bebida_recipiente" text,
	"taca_furta_cor" boolean DEFAULT false,
	"taca_champanhe" boolean DEFAULT false,
	"tipo_talher" text,
	"ordens_disparadas_em" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "decisoes_operacionais_evento_evento_id_unique" UNIQUE("evento_id")
);
--> statement-breakpoint
CREATE TABLE "evento_colaboradores" (
	"evento_id" integer NOT NULL,
	"colaborador_id" integer NOT NULL,
	"papel_no_evento" text,
	CONSTRAINT "evento_colaboradores_evento_id_colaborador_id_pk" PRIMARY KEY("evento_id","colaborador_id")
);
--> statement-breakpoint
ALTER TABLE "decisoes_operacionais_evento" ADD CONSTRAINT "decisoes_operacionais_evento_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_colaboradores" ADD CONSTRAINT "evento_colaboradores_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_colaboradores" ADD CONSTRAINT "evento_colaboradores_colaborador_id_colaboradores_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores"("id") ON DELETE no action ON UPDATE no action;