-- Schema do banco de dados - Fase 1: Central de Eventos
-- Sistema Anjos Eventos

-- Tabela de empresas do grupo
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários (login sem senha)
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de eventos
CREATE TABLE eventos (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id),
    cliente TEXT NOT NULL,
    data_evento TIMESTAMP NOT NULL,
    tipo_evento TEXT,
    num_convidados INTEGER,
    status TEXT NOT NULL DEFAULT 'orcado' CHECK (status IN ('orcado', 'confirmado', 'realizado', 'cancelado')),
    valor NUMERIC(10, 2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de contratos
CREATE TABLE contratos (
    id SERIAL PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    arquivo_pdf TEXT NOT NULL,
    dados_extraidos_raw JSONB,
    confirmado_por TEXT,
    confirmado_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas frequentes
CREATE INDEX idx_eventos_empresa_id ON eventos(empresa_id);
CREATE INDEX idx_eventos_data_evento ON eventos(data_evento);
CREATE INDEX idx_eventos_status ON eventos(status);
CREATE INDEX idx_contratos_evento_id ON contratos(evento_id);

-- Comentários nas tabelas para documentação
COMMENT ON TABLE empresas IS 'Empresas do grupo: Buffet Senhor Churrasco, Anjos Cerimonial, Em Plena Natureza';
COMMENT ON TABLE usuarios IS 'Usuários do sistema - login por seleção de nome, sem senha';
COMMENT ON TABLE eventos IS 'Eventos das 3 empresas - agenda unificada';
COMMENT ON TABLE contratos IS 'Contratos PDF vinculados aos eventos, com dados extraídos';
COMMENT ON COLUMN contratos.dados_extraidos_raw IS 'JSON com resultado bruto da extração automática do PDF';
