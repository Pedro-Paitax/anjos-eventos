-- Dados da migração 0015: embalagem de COMPRA dos insumos (só a lista de compras usa).
-- Valores informados pelo Pedro em 2026-11-05. NÃO APLICADO: aguarda o ok do Pedro, e só roda
-- DEPOIS da migração 0015 (colunas embalagem_compra_nome / embalagem_compra_qtd).
--
-- Fora deste arquivo (sem valor definido, ficam sem embalagem, como hoje):
--   Pão De Alho Tradicional (falta N unidades por bandeja), Ovo (12 ou 30?),
--   Pão de Baguete e Pão Francês (a definir). Carnes não mudam.
--
-- Transação única: cada linha tem de atualizar exatamente 1 insumo (nome exato do banco);
-- senão o script aborta e nada é gravado. Nenhum outro campo é alterado.

BEGIN;

CREATE TEMP TABLE _embalagens (nome text, embalagem text, qtd numeric(10,3)) ON COMMIT DROP;
INSERT INTO _embalagens (nome, embalagem, qtd) VALUES
  ('Ovo De Codorna',        'bandeja', 30),
  ('Arroz Agulinha',        'pacote',  5),
  ('Arroz Arbóreo',         'pacote',  1),
  ('Farinha De Mandioca',   'pacote',  1),
  ('Massa De Lasanha',      'pacote',  0.5),
  ('Orégano Seco',          'pacote',  0.05),
  ('Alho Triturado',        'pote',    0.4),
  ('Cream Cheese',          'pote',    0.3),
  ('Creme De Leite',        'caixa',   0.2),
  ('Manteiga',              'tablete', 0.2),
  ('Palmito',               'vidro',   0.3),
  ('Coca Cola',             'garrafa', 2),
  ('Leite Integral',        'caixa',   1),
  ('Óleo de Soja',          'garrafa', 0.9);

DO $$
DECLARE esperados int; achados int;
BEGIN
  SELECT count(*) INTO esperados FROM _embalagens;
  SELECT count(*) INTO achados FROM insumos i JOIN _embalagens e ON e.nome = i.nome;
  IF achados <> esperados THEN
    RAISE EXCEPTION 'Esperava % insumos pelo nome, achou %', esperados, achados;
  END IF;
END $$;

UPDATE insumos i
   SET embalagem_compra_nome = e.embalagem,
       embalagem_compra_qtd  = e.qtd
  FROM _embalagens e
 WHERE e.nome = i.nome;

-- Conferência: 14 linhas com embalagem; o resto da tabela intacto.
SELECT nome, unidade, embalagem_compra_nome, embalagem_compra_qtd
  FROM insumos WHERE embalagem_compra_nome IS NOT NULL ORDER BY nome;

COMMIT;
