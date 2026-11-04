CREATE TABLE "alteracoes_preco_insumo" (
	"id" serial PRIMARY KEY NOT NULL,
	"insumo_id" integer NOT NULL,
	"preco_anterior" numeric(10, 4),
	"preco_novo" numeric(10, 4),
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "alteracoes_preco_insumo" ADD CONSTRAINT "alteracoes_preco_insumo_insumo_id_insumos_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."insumos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alteracoes_preco_pendentes" ON "alteracoes_preco_insumo" USING btree ("enviado_em","alterado_em");--> statement-breakpoint
-- Escrito a mao (drizzle-kit nao gera gatilho): toda mudanca de insumos.preco vira uma linha.
-- So grava; nao altera a linha do insumo nem bloqueia o UPDATE/INSERT.
CREATE FUNCTION "registrar_alteracao_preco_insumo"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO alteracoes_preco_insumo (insumo_id, preco_anterior, preco_novo) VALUES (NEW.id, NULL, NEW.preco);
  ELSIF NEW.preco IS DISTINCT FROM OLD.preco THEN
    INSERT INTO alteracoes_preco_insumo (insumo_id, preco_anterior, preco_novo) VALUES (NEW.id, OLD.preco, NEW.preco);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "trg_insumos_alteracao_preco" AFTER INSERT OR UPDATE OF "preco" ON "insumos"
  FOR EACH ROW EXECUTE FUNCTION "registrar_alteracao_preco_insumo"();