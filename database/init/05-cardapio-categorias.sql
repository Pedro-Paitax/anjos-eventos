-- Cardápio: alinha as colunas às categorias reais da base de fichas
-- técnicas do NocoDB (Entrada, Acompanhamentos, Carnes, Saladas, Bebidas,
-- Sobremesa). "Aperitivos" não existe como categoria real e é substituído
-- por "Entrada"; "Molhos" foi descartado a pedido; "Sobremesa" é nova.

ALTER TABLE eventos
    DROP COLUMN IF EXISTS cardapio_aperitivos,
    ADD COLUMN IF NOT EXISTS cardapio_entrada TEXT,
    ADD COLUMN IF NOT EXISTS cardapio_sobremesa TEXT;

ALTER TABLE eventos RENAME COLUMN cardapio_salada TO cardapio_saladas;

COMMENT ON COLUMN eventos.cardapio_entrada IS 'Itens selecionados da categoria Entrada (fichas técnicas do NocoDB)';
COMMENT ON COLUMN eventos.cardapio_acompanhamentos IS 'Itens selecionados da categoria Acompanhamentos (= "Guarnições" no NocoDB)';
COMMENT ON COLUMN eventos.cardapio_saladas IS 'Itens selecionados da categoria Saladas';
COMMENT ON COLUMN eventos.cardapio_sobremesa IS 'Itens selecionados da categoria Sobremesa';
