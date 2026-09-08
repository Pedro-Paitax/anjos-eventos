-- Detalhamento do evento - Convidados por faixa, Cardápio, Valores e Serviços
-- Buffet Senhor Churrasco

ALTER TABLE eventos
    DROP COLUMN IF EXISTS num_convidados,
    ADD COLUMN IF NOT EXISTS qtd_adultos INTEGER,
    ADD COLUMN IF NOT EXISTS qtd_criancas_ate_5 INTEGER,
    ADD COLUMN IF NOT EXISTS qtd_criancas_5_a_10 INTEGER,
    ADD COLUMN IF NOT EXISTS qtd_fornecedores INTEGER,
    ADD COLUMN IF NOT EXISTS cardapio_aperitivos TEXT,
    ADD COLUMN IF NOT EXISTS cardapio_carnes TEXT,
    ADD COLUMN IF NOT EXISTS cardapio_acompanhamentos TEXT,
    ADD COLUMN IF NOT EXISTS cardapio_salada TEXT,
    ADD COLUMN IF NOT EXISTS cardapio_bebidas TEXT,
    ADD COLUMN IF NOT EXISTS preco_pessoa NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS preco_crianca_meia NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS valor_garcom NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS taxa_deslocamento NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS qtd_garcons INTEGER;

COMMENT ON COLUMN eventos.qtd_adultos IS 'Convidados adultos';
COMMENT ON COLUMN eventos.qtd_criancas_ate_5 IS 'Convidados crianças até 5 anos';
COMMENT ON COLUMN eventos.qtd_criancas_5_a_10 IS 'Convidados crianças de 5 a 10 anos';
COMMENT ON COLUMN eventos.qtd_fornecedores IS 'Fornecedores/prestadores presentes no evento';
COMMENT ON COLUMN eventos.preco_pessoa IS 'Preço por pessoa (adulto) usado no cálculo do valor sugerido';
COMMENT ON COLUMN eventos.preco_crianca_meia IS 'Preço meia (criança) usado no cálculo do valor sugerido';
COMMENT ON COLUMN eventos.valor_garcom IS 'Valor por garçom usado no cálculo do valor sugerido';
COMMENT ON COLUMN eventos.taxa_deslocamento IS 'Taxa de deslocamento usada no cálculo do valor sugerido';
COMMENT ON COLUMN eventos.qtd_garcons IS 'Quantidade de garçons contratados para o evento';
