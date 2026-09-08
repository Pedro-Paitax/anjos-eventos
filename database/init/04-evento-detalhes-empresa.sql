-- Campos por empresa - formulário completo de "Novo evento"
-- Buffet Senhor Churrasco (campos exclusivos) + campos compartilhados com
-- Anjos Cerimonial / Em Plena Natureza (formulário genérico provisório)

ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS contato TEXT,
    ADD COLUMN IF NOT EXISTS telefone TEXT,
    ADD COLUMN IF NOT EXISTS endereco_evento TEXT,
    ADD COLUMN IF NOT EXISTS hora_chegada_equipe TIME,
    ADD COLUMN IF NOT EXISTS hora_aperitivo TIME,
    ADD COLUMN IF NOT EXISTS hora_almoco TIME,
    ADD COLUMN IF NOT EXISTS hora_encerramento TIME,
    ADD COLUMN IF NOT EXISTS qtd_churrasqueiros INTEGER,
    ADD COLUMN IF NOT EXISTS qtd_copeiras INTEGER,
    ADD COLUMN IF NOT EXISTS prazo_pagamento DATE,
    ADD COLUMN IF NOT EXISTS chave_pix TEXT,
    ADD COLUMN IF NOT EXISTS caminho_contrato TEXT;

COMMENT ON COLUMN eventos.contato IS 'Nome para contato, se diferente do cliente (Senhor Churrasco)';
COMMENT ON COLUMN eventos.telefone IS 'Telefone/celular de contato';
COMMENT ON COLUMN eventos.endereco_evento IS 'Endereço onde o evento acontece';
COMMENT ON COLUMN eventos.qtd_churrasqueiros IS 'Quantidade de churrasqueiros escalados (Senhor Churrasco)';
COMMENT ON COLUMN eventos.qtd_copeiras IS 'Quantidade de copeiras escaladas (Senhor Churrasco)';
COMMENT ON COLUMN eventos.caminho_contrato IS 'Caminho do arquivo PDF do contrato, quando adicionado manualmente ao servidor';
