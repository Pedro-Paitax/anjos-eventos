CREATE TABLE "lead_evidencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"fonte" text NOT NULL,
	"url" text,
	"consultado_em" date NOT NULL,
	"tipo" text NOT NULL,
	"natureza" text DEFAULT 'fato' NOT NULL,
	"campo" text,
	"fato" text NOT NULL,
	"trecho" text,
	"confianca" text DEFAULT 'media' NOT NULL,
	"verificacao" text DEFAULT 'a_verificar' NOT NULL,
	"registrado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_evidencias_tipo_check" CHECK ("lead_evidencias"."tipo" IN ('site_oficial', 'rede_social', 'diretorio', 'imprensa', 'outro')),
	CONSTRAINT "lead_evidencias_natureza_check" CHECK ("lead_evidencias"."natureza" IN ('fato', 'inferencia')),
	CONSTRAINT "lead_evidencias_confianca_check" CHECK ("lead_evidencias"."confianca" IN ('alta', 'media', 'baixa')),
	CONSTRAINT "lead_evidencias_verificacao_check" CHECK ("lead_evidencias"."verificacao" IN ('verificado', 'a_verificar', 'divergente'))
);
--> statement-breakpoint
CREATE TABLE "lead_interacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"mensagem_id" integer,
	"tipo" text NOT NULL,
	"canal" text,
	"resumo" text,
	"ocorrida_em" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_interacoes_tipo_check" CHECK ("lead_interacoes"."tipo" IN ('envio_confirmado', 'resposta', 'reuniao', 'proposta', 'conversao', 'sem_interesse', 'nao_contatar', 'reativado', 'nota'))
);
--> statement-breakpoint
CREATE TABLE "lead_mensagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"canal" text NOT NULL,
	"objetivo" text NOT NULL,
	"assunto" text,
	"conteudo" text NOT NULL,
	"estado" text DEFAULT 'aguardando_revisao' NOT NULL,
	"versao" integer NOT NULL,
	"evidencia_ids" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"fatos_usados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gerador" text NOT NULL,
	"modelo" text,
	"criada_por" integer,
	"editada_por" integer,
	"editada_em" timestamp with time zone,
	"aprovada_por" integer,
	"aprovada_em" timestamp with time zone,
	"envio_iniciado_em" timestamp with time zone,
	"enviada_por" integer,
	"enviada_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_mensagens_canal_check" CHECK ("lead_mensagens"."canal" IN ('whatsapp', 'instagram', 'email')),
	CONSTRAINT "lead_mensagens_estado_check" CHECK ("lead_mensagens"."estado" IN ('aguardando_revisao', 'aprovada', 'envio_iniciado', 'enviada', 'respondida', 'descartada')),
	CONSTRAINT "lead_mensagens_gerador_check" CHECK ("lead_mensagens"."gerador" IN ('modelo_local', 'manual', 'anthropic'))
);
--> statement-breakpoint
CREATE TABLE "lead_qualificacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"dimensoes" jsonb NOT NULL,
	"pontuacao" integer NOT NULL,
	"pontuacao_maxima" integer NOT NULL,
	"completude" integer NOT NULL,
	"prioridade" text NOT NULL,
	"provisoria" boolean NOT NULL,
	"confianca" text NOT NULL,
	"observacoes" text,
	"avaliado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_qualificacoes_prioridade_check" CHECK ("lead_qualificacoes"."prioridade" IN ('A', 'B', 'C', 'baixa', 'indefinida')),
	CONSTRAINT "lead_qualificacoes_confianca_check" CHECK ("lead_qualificacoes"."confianca" IN ('alta', 'media', 'baixa'))
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome_comercial" text NOT NULL,
	"nome_legal" text,
	"categoria" text NOT NULL,
	"segmento" text,
	"municipio" text,
	"endereco" text,
	"site" text,
	"instagram" text,
	"outros_perfis" text,
	"telefone" text,
	"email" text,
	"responsavel_comercial" text,
	"sinais_demanda" text,
	"compatibilidade_parrilla" text,
	"limitacoes" text,
	"observacoes" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"status" text DEFAULT 'novo' NOT NULL,
	"nao_contatar" boolean DEFAULT false NOT NULL,
	"nao_contatar_motivo" text,
	"proxima_acao" text,
	"proxima_acao_em" date,
	"responsavel_usuario_id" integer,
	"nome_normalizado" text NOT NULL,
	"dominio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_categoria_check" CHECK ("leads"."categoria" IN ('cervejaria', 'bar_restaurante', 'espaco_eventos', 'outro')),
	CONSTRAINT "leads_status_check" CHECK ("leads"."status" IN ('novo', 'em_pesquisa', 'a_verificar', 'qualificado', 'prioridade_baixa', 'pronto_para_contato', 'contatado', 'em_conversa', 'reuniao_proposta', 'convertido', 'sem_interesse', 'nao_contatar')),
	CONSTRAINT "leads_origem_check" CHECK ("leads"."origem" IN ('manual', 'csv'))
);
--> statement-breakpoint
ALTER TABLE "lead_evidencias" ADD CONSTRAINT "lead_evidencias_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_evidencias" ADD CONSTRAINT "lead_evidencias_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_interacoes" ADD CONSTRAINT "lead_interacoes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_interacoes" ADD CONSTRAINT "lead_interacoes_mensagem_id_lead_mensagens_id_fk" FOREIGN KEY ("mensagem_id") REFERENCES "public"."lead_mensagens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_interacoes" ADD CONSTRAINT "lead_interacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_mensagens" ADD CONSTRAINT "lead_mensagens_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_mensagens" ADD CONSTRAINT "lead_mensagens_criada_por_usuarios_id_fk" FOREIGN KEY ("criada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_mensagens" ADD CONSTRAINT "lead_mensagens_editada_por_usuarios_id_fk" FOREIGN KEY ("editada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_mensagens" ADD CONSTRAINT "lead_mensagens_aprovada_por_usuarios_id_fk" FOREIGN KEY ("aprovada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_mensagens" ADD CONSTRAINT "lead_mensagens_enviada_por_usuarios_id_fk" FOREIGN KEY ("enviada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_qualificacoes" ADD CONSTRAINT "lead_qualificacoes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_qualificacoes" ADD CONSTRAINT "lead_qualificacoes_avaliado_por_usuarios_id_fk" FOREIGN KEY ("avaliado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_responsavel_usuario_id_usuarios_id_fk" FOREIGN KEY ("responsavel_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lead_evidencias_lead_id" ON "lead_evidencias" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_interacoes_lead_id" ON "lead_interacoes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_interacoes_tipo" ON "lead_interacoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_lead_mensagens_lead_id" ON "lead_mensagens" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_qualificacoes_lead_id" ON "lead_qualificacoes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_categoria" ON "leads" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX "idx_leads_municipio" ON "leads" USING btree ("municipio");--> statement-breakpoint
CREATE INDEX "idx_leads_nome_normalizado" ON "leads" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE INDEX "idx_leads_dominio" ON "leads" USING btree ("dominio");--> statement-breakpoint
CREATE INDEX "idx_leads_telefone" ON "leads" USING btree ("telefone");