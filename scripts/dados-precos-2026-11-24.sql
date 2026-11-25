-- Atualização de preços — cotação de 24/11/2026 (varejo, Super Muffato).
-- NÃO APLICADO. Aguarda aprovação do Pedro. Veja docs/cotacoes/COTACAO_2026-11-24.md.
--
-- Como usar (depois de aprovar):
--   1) pg_dump -Fc validado (pg_restore --list) antes de qualquer coisa;
--   2) ensaio em cópia local:  psql -v ON_ERROR_STOP=1 -f scripts/dados-precos-2026-11-24.sql <copia>
--   3) produção, só com o dump válido:  psql -v ON_ERROR_STOP=1 -f scripts/dados-precos-2026-11-24.sql <producao>
-- Transação única: qualquer conferência que falhar aborta tudo (nada é gravado).
-- Casamento por id. Conferência prévia: o nome e o preço atuais têm de ser os esperados
-- (se alguém mudou o preço depois da pesquisa, o script para).
-- Preço novo = preço pago (bruto) × 1,10 (decisão do Pedro, varejo), em 2 casas, como precoComMargem().
-- Linhas com variação acima de 15% ficam COMENTADAS (⚠): tire o "--" para aprovar.
-- fornecedor_principal_id e canal NÃO são alterados.

BEGIN;

CREATE TEMP TABLE novo_preco (
  insumo_id int PRIMARY KEY,
  nome_esperado text NOT NULL,
  preco_atual_esperado numeric(10,4) NOT NULL,
  bruto numeric(10,4) NOT NULL,
  preco_novo numeric(10,2) NOT NULL,
  nome_no_fornecedor text NOT NULL,
  unidade_fornecedor text NOT NULL,
  url_fonte text NOT NULL
) ON COMMIT DROP;

INSERT INTO novo_preco VALUES
  (98, 'Peito De Frango', 18.2600, 15.6000, 17.16, 'Filé de Peito de Frango Congelado Kg', 'produto Muffato R$ 15,60/kg', 'https://www.supermuffato.com.br/file-de-peito-de-frango-congelado-kg/p'),
  (8, 'Salsinha Fresca', 4.0700, 3.7000, 4.07, 'Salsa Furukita Un', 'produto Muffato R$ 3,70 (antes R$ 3,70)', 'https://www.supermuffato.com.br/salsa-furukita-un-126510/p'),
  (102, 'Paleta Suína', 21.9000, 20.6000, 22.66, 'Paleta Suína com Osso sem Pele Kg', 'produto Muffato R$ 20,60/kg', 'https://www.supermuffato.com.br/carne-suina-paleta-com-osso-sem-pele-kg-7685/p'),
  (1, 'Tomate', 13.6400, 13.4000, 14.74, 'Tomate Kg', 'produto Muffato R$ 13,40 (antes R$ 12,40)', 'https://www.supermuffato.com.br/tomate-kg-3416/p'),
  (121, 'Gorgonzola', 110.8800, 98.8000, 108.68, 'Queijo Gorgonzola Quatá Kg', 'produto Muffato R$ 98,80 (antes R$ 100,80)', 'https://www.supermuffato.com.br/queijo-gorgonzola-quata-kg-10144/p'),
  (106, 'Salame', 79.2000, 67.9000, 74.69, 'Salame Italiano Pequeno Seara Gourmet Kg', 'produto Muffato R$ 67,90 (antes R$ 72,00)', 'https://www.supermuffato.com.br/salame-seara-tipo-italiano-pequeno-kg-94959/p'),
  (133, 'Farinha De Mandioca', 10.2300, 8.2000, 9.02, 'Farinha de Mandioca Pinduca Torrada 1kg', 'produto Muffato R$ 8,20 (antes R$ 9,30)', 'https://www.supermuffato.com.br/farinha-de-mandioca-pinduca-torrada-1kg-194/p'),
  (9, 'Orégano Seco', 213.4000, 194.0000, 213.40, 'Orégano Chileno Kinino 50g', 'produto Muffato R$ 9,70 (antes R$ 9,70)', 'https://www.supermuffato.com.br/oregano-chileno-kinino-50g-74438/p'),
  (114, 'Palmito', 41.0600, 37.3300, 41.06, 'Palmito Pupunha Roecker Em Conserva Espaguete 300g', 'produto Muffato R$ 11,20 (antes R$ 11,20)', 'https://www.supermuffato.com.br/palmito-pupunha-roecker-em-conserva-espaguete-300g-312879/p'),
  (56, 'Arroz Agulinha', 4.9700, 4.5200, 4.97, 'Arroz Agulhinha Martinelli Tipo 1 5kg', 'produto Muffato R$ 22,60 (antes R$ 22,60)', 'https://www.supermuffato.com.br/arroz-agulhinha-martinelli-tipo-1-5kg-118/p'),
  (119, 'Massa De Lasanha', 19.1400, 18.4000, 20.24, 'Massa Romanha para Lasanha 500g', 'produto Muffato R$ 9,20 (antes R$ 8,70)', 'https://www.supermuffato.com.br/massa-romanha-para-lasanha-500g-1254/p'),
  (137, 'Proteína de Soja', 41.2500, 37.5000, 41.25, 'Proteína Kodilar Texturizada Média Carne 400g', 'produto Muffato R$ 15,00 (antes R$ 15,00)', 'https://www.supermuffato.com.br/proteina-kodilar-texturizada-media-carne-400g-185480/p'),
  (75, 'Creme De Leite', 14.3000, 14.0000, 15.40, 'Creme de Leite Lider 200g', 'produto Muffato R$ 2,80 (antes R$ 2,60)', 'https://www.supermuffato.com.br/creme-de-leite-lider-200g-62401/p'),
  (64, 'Coca Cola', 6.4900, 5.9000, 6.49, 'Refrigerante Coca-Cola Original Garrafa 2l', 'produto Muffato R$ 11,80 (antes R$ 11,80)', 'https://www.supermuffato.com.br/refrigerante-coca-cola-original-2l-273064/p'),
  (86, 'Rúcula', 5.6100, 5.1000, 5.61, 'Rúcula Morakami Hidropônica Un', 'produto Muffato R$ 5,10 (antes R$ 5,10)', 'https://www.supermuffato.com.br/rucula-morakami-hidroponica-pct-un-223541/p'),
  (33, 'Queijo Prato', 58.6500, 53.3200, 58.65, 'Queijo Prato Frimesa Metade Kg', 'produto Muffato R$ 53,32 (antes R$ 53,32)', 'https://www.supermuffato.com.br/queijo-prato-frimesa-metade-kg-17043/p'),
  (19, 'Leite Integral', 5.9400, 5.0000, 5.50, 'Leite UHT Parmalat Integral 1L', 'produto Muffato R$ 5,00 (antes R$ 5,40)', 'https://www.supermuffato.com.br/leite-parmalat-integral-longa-vida-1l-17469/p'),
  (12, 'Óleo de Soja', 8.8000, 8.3333, 9.17, 'Óleo de Soja Cocamar 900ml', 'produto Muffato R$ 7,50 (antes R$ 7,20)', 'https://www.supermuffato.com.br/oleo-de-soja-cocamar--900ml-8059/p'),
  (24, 'Alho Triturado', 25.5800, 23.2500, 25.58, 'Alho Guidan Alim Triturado Pote 400g', 'produto Muffato R$ 9,30 (antes R$ 9,30)', 'https://www.supermuffato.com.br/alho-guidan-alim-triturado-pote-400g-255976/p');

-- ⚠ Variação acima de 15%: cada linha abaixo é um INSERT completo. Para aprovar, tire o "-- " do começo
-- e apague o comentário do final (ela é executada antes da conferência prévia).
-- INSERT INTO novo_preco VALUES (44, 'Filé Mignon', 119.3500, 133.9000, 147.29, 'Filé Mignon Bovino Cerro Verde Kg', 'produto Muffato R$ 133,90/kg', 'https://www.supermuffato.com.br/file-mignon-bovino-cerro-verde-kg-274035/p');  -- +23,4%
-- INSERT INTO novo_preco VALUES (159, 'Contra-filé', 58.0800, 63.8000, 70.18, 'Contra Filé Bovino Kg', 'produto Muffato R$ 63,80/kg', 'https://www.supermuffato.com.br/contra-file-bovino-kg-87407/p');  -- +20,8%
-- INSERT INTO novo_preco VALUES (158, 'Maminha', 54.8900, 72.1000, 79.31, 'Carne Bovina Maminha Muffato Foods Kg', 'produto Muffato R$ 72,10/kg', 'https://www.supermuffato.com.br/carne-bovina-maminha-muffato-foods-kg-269873/p');  -- +44,5%
-- INSERT INTO novo_preco VALUES (99, 'Picanha', 78.1000, 82.4000, 90.64, 'Picanha Carne Bovina Steak Brasa Forte Kg', 'produto Muffato R$ 82,40/kg', 'https://www.supermuffato.com.br/picanha-carne-bovina-steak-brasa-forte-kg-321812/p');  -- +16,1%
-- INSERT INTO novo_preco VALUES (54, 'Alcatra', 50.4900, 61.8000, 67.98, 'Alcatra Bovina Peça Kg', 'produto Muffato R$ 61,80/kg', 'https://www.supermuffato.com.br/carne-bovina-alcatra-peca-7178/p');  -- +34,6%
-- INSERT INTO novo_preco VALUES (109, 'Queijo Coalho', 42.9900, 54.0000, 59.40, 'Queijo Coalho Frimesa para Churrasco Kg', 'produto Muffato R$ 54,00/kg', 'https://www.supermuffato.com.br/queijo-coalho-frimesa-para-churrasco-kg-133035/p');  -- +38,2%
-- INSERT INTO novo_preco VALUES (40, 'Coração de Galinha', 42.2400, 53.6000, 58.96, 'Coração de Frango Congelado Perdigão na Brasa 500g', 'produto Muffato R$ 26,80 → kg x2', 'https://www.supermuffato.com.br/coracao-de-frango-congelado-perdigao-na-brasa-500g-300682/p');  -- +39,6%
-- INSERT INTO novo_preco VALUES (34, 'Queijo Provolone', 105.6000, 125.3333, 137.87, 'Queijo Lac Lélo Provolone Fatiado 150g', 'produto Muffato R$ 18,80 (antes R$ 14,40)', 'https://www.supermuffato.com.br/queijo-lac-lelo-provolone-fatiado-150g-252153/p');  -- +30,6%
-- INSERT INTO novo_preco VALUES (100, 'Costela Bovina', 28.9000, 30.9000, 33.99, 'Costela Minga Bovina Kg', 'produto Muffato R$ 30,90/kg', 'https://www.supermuffato.com.br/costela-minga-bovina-kg-7206/p');  -- +17,6%
-- INSERT INTO novo_preco VALUES (95, 'Costelinha Suína', 15.6200, 29.8000, 32.78, 'Costela Suína Resfriada Kg', 'produto Muffato R$ 29,80/kg', 'https://www.supermuffato.com.br/costela-suina--resfriada-kg-7658/p');  -- +109,9%
-- INSERT INTO novo_preco VALUES (155, 'Panceta', 17.6200, 30.9000, 33.99, 'Panceta Suína Peça Kg', 'produto Muffato R$ 30,90/kg', 'https://www.supermuffato.com.br/panceta-suina-peca-kg-237085/p');  -- +92,9%
-- INSERT INTO novo_preco VALUES (154, 'Picanha Suína', 19.7800, 39.1000, 43.01, 'Picanha Suína Fatiada Kg', 'produto Muffato R$ 39,10/kg', 'https://www.supermuffato.com.br/carne-suina-picanha-fatiada-129663/p');  -- +117,4%
-- INSERT INTO novo_preco VALUES (93, 'Copa Lombo', 18.6600, 27.8000, 30.58, 'Copa Lombo Suíno Sem Osso Kg', 'produto Muffato R$ 27,80/kg', 'https://www.supermuffato.com.br/carne-suina-copa-lombo-sem-osso-kg-7657/p');  -- +63,9%
-- INSERT INTO novo_preco VALUES (94, 'Coxinha Da Asa De Frango', 12.6100, 16.5000, 18.15, 'Coxinha da asa Seara IQF 1kg', 'produto Muffato R$ 16,50/kg', 'https://www.supermuffato.com.br/coxinha-da-asa-seara-iqf-1kg-180029/p');  -- +43,9%
-- INSERT INTO novo_preco VALUES (151, 'Lombo Suíno', 23.1000, 28.8000, 31.68, 'Lombo Suíno Kg', 'produto Muffato R$ 28,80/kg', 'https://www.supermuffato.com.br/carne-suino-lombo-7677/p');  -- +37,1%
-- INSERT INTO novo_preco VALUES (118, 'Batata Palha', 64.4700, 73.2625, 80.59, 'Batata Delizza Palha Tradicional 101g', 'produto Muffato R$ 7,40 (antes R$ 5,92)', 'https://www.supermuffato.com.br/batata-delizza-palha-tradicional-101g-289536/p');  -- +25,0%
-- INSERT INTO novo_preco VALUES (101, 'Sobrecoxa De Frango', 9.4600, 16.5000, 18.15, 'Sobrecoxa de Frango Big Frango Resfriada Kg', 'produto Muffato R$ 16,50/kg', 'https://www.supermuffato.com.br/sobrecoxa-de-frango-big-frango-resfriada-kg-4807/p');  -- +91,9%
-- INSERT INTO novo_preco VALUES (72, 'Bacon', 20.5700, 39.0000, 42.90, 'Bacon Muffato Foods Manta Sadia  Kg', 'produto Muffato R$ 39,00/kg', 'https://www.supermuffato.com.br/bacon-muffato-foods-manta-sadia-kg-269574/p');  -- +108,6%
-- INSERT INTO novo_preco VALUES (38, 'Cream Cheese', 56.9000, 77.3284, 85.06, 'Cream Cheese Tradicional Danubio Pote 300g', 'produto Muffato R$ 23,20 (antes R$ 15,52)', 'https://www.supermuffato.com.br/queijo-cream-cheese-danubio-tradicional-300g-196010/p');  -- +49,5%
-- INSERT INTO novo_preco VALUES (10, 'Alho', 22.6600, 17.4000, 19.14, 'Alho Kg', 'produto Muffato R$ 17,40 (antes R$ 20,60)', 'https://www.supermuffato.com.br/alho-kg-28168/p');  -- -15,5%
-- INSERT INTO novo_preco VALUES (71, 'Batata Inglesa', 4.5100, 7.1000, 7.81, 'Batata Monalisa Kg', 'produto Muffato R$ 7,10 (antes R$ 4,10)', 'https://www.supermuffato.com.br/batata-monalisa-kg-3210/p');  -- +73,2%
-- INSERT INTO novo_preco VALUES (145, 'Geleia De Damasco', 123.7500, 90.0000, 99.00, 'Geleia Queensberry Classic Damasco 320g', 'produto Muffato R$ 28,80 (antes R$ 36,00)', 'https://www.supermuffato.com.br/geleia-queensberry-classic-damasco-320g-98586/p');  -- -20,0%
-- INSERT INTO novo_preco VALUES (2, 'Cebola Branca', 5.6100, 11.3000, 12.43, 'Cebola Kg', 'produto Muffato R$ 11,30 (antes R$ 5,10)', 'https://www.supermuffato.com.br/cebola-kg-3355/p');  -- +121,6%
-- INSERT INTO novo_preco VALUES (123, 'Arroz Arbóreo', 22.6200, 25.7000, 28.27, 'Arroz Mondo Arboreo 1kg', 'produto Muffato R$ 25,70 (antes R$ 20,56)', 'https://www.supermuffato.com.br/arroz-mondo-arboreo-1kg-283622/p');  -- +25,0%
-- INSERT INTO novo_preco VALUES (4, 'Pimentão Vermelho', 18.1500, 20.6000, 22.66, 'Pimentão Vermelho Kg', 'produto Muffato R$ 20,60 (antes R$ 16,50)', 'https://www.supermuffato.com.br/pimentao-vermelho-kg-3372/p');  -- +24,8%
-- INSERT INTO novo_preco VALUES (49, 'Batata Doce', 4.5100, 2.2400, 2.46, 'Batata Doce Roxa Kg', 'produto Muffato R$ 2,24 (antes R$ 4,10)', 'https://www.supermuffato.com.br/batata-doce-roxa-kg-3200/p');  -- -45,5%
-- INSERT INTO novo_preco VALUES (52, 'Pepino em Conserva', 24.0600, 27.3375, 30.07, 'Pepino Delizza Conserva 300g', 'produto Muffato R$ 8,20 (antes R$ 6,56)', 'https://www.supermuffato.com.br/pepino-delizza-conserva-300g-277554/p');  -- +25,0%
-- INSERT INTO novo_preco VALUES (78, 'Cenoura', 3.4100, 2.6000, 2.86, 'Cenoura Kg', 'produto Muffato R$ 2,60 (antes R$ 3,10)', 'https://www.supermuffato.com.br/cenoura-kg-3408/p');  -- -16,1%

-- Conferência prévia
DO $$
DECLARE n_total int; n_ok int;
BEGIN
  SELECT count(*) INTO n_total FROM novo_preco;
  SELECT count(*) INTO n_ok FROM novo_preco n JOIN insumos i ON i.id = n.insumo_id
   WHERE i.nome = n.nome_esperado AND i.preco = n.preco_atual_esperado;
  IF n_ok <> n_total THEN
    RAISE EXCEPTION 'Conferência prévia falhou: % de % insumos com nome/preço diferentes do esperado', n_total - n_ok, n_total;
  END IF;
END $$;

-- Histórico de preço (só se a tabela existir). Preço bruto por unidade do insumo, como o app grava.
DO $$
BEGIN
  IF to_regclass('historico_precos') IS NOT NULL THEN
    INSERT INTO historico_precos (insumo_id, fornecedor_id, nome_no_fornecedor, unidade_fornecedor, preco, fonte, observado_em, url_fonte, observacao)
    SELECT n.insumo_id, (SELECT id FROM fornecedores WHERE nome = 'Super Muffato'), n.nome_no_fornecedor, n.unidade_fornecedor,
           n.bruto, 'pesquisa_web', DATE '2026-11-24', n.url_fonte, 'Cotação noturna 24/11/2026 (preço de prateleira, site)'
      FROM novo_preco n;
  ELSE
    RAISE NOTICE 'historico_precos não existe: histórico não gravado.';
  END IF;
END $$;

UPDATE insumos i
   SET preco = n.preco_novo,
       fonte_preco = 'pesquisa_web',
       preco_atualizado_em = (DATE '2026-11-24')::timestamp AT TIME ZONE 'America/Sao_Paulo'
  FROM novo_preco n
 WHERE i.id = n.insumo_id;

-- Conferência final
DO $$
DECLARE n_total int; n_ok int; n_hist int;
BEGIN
  SELECT count(*) INTO n_total FROM novo_preco;
  SELECT count(*) INTO n_ok FROM novo_preco n JOIN insumos i ON i.id = n.insumo_id
   WHERE i.preco = n.preco_novo AND i.fonte_preco = 'pesquisa_web';
  IF n_ok <> n_total THEN RAISE EXCEPTION 'Conferência final falhou: % de % atualizados', n_ok, n_total; END IF;
  IF to_regclass('historico_precos') IS NOT NULL THEN
    SELECT count(*) INTO n_hist FROM historico_precos WHERE observado_em = DATE '2026-11-24' AND observacao LIKE 'Cotação noturna 24/11/2026%';
    IF n_hist <> n_total THEN RAISE EXCEPTION 'Histórico: % linhas para % insumos', n_hist, n_total; END IF;
  END IF;
  RAISE NOTICE 'OK: % insumos atualizados.', n_total;
END $$;

-- Resultado para olhar antes do COMMIT
SELECT i.id, i.nome, n.preco_atual_esperado AS antes, i.preco AS depois,
       round((i.preco / n.preco_atual_esperado - 1) * 100, 1) AS var_pct
  FROM insumos i JOIN novo_preco n ON n.insumo_id = i.id ORDER BY i.id;

COMMIT;
