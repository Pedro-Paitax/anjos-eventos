-- Dados da migração 0016: checklist de carregamento do Senhor Churrasco
-- (docs/specs/SPEC_CHECKLIST_CARREGAMENTO.md, decisões do Pedro em 21/11/2026; Fase 0 aprovada em 23/11/2026).
-- Aprovado pelo Pedro em 23/11/2026. NÃO APLICADO. Só roda DEPOIS da migração 0016
-- (tabelas itens_carga / preparo_itens_carga e coluna insumos.eh_tempero).
--
-- O que faz:
--   1. Cadastra os itens fixos (seção 3) e a lista de itens de carga marcáveis nas fichas (seção 5, C19).
--   2. Liga os temperos fixos aos insumos equivalentes (o mesmo insumo vindo das fichas não se repete).
--   3. Marca eh_tempero nos insumos do grupo A aprovado na Fase 0.
-- NÃO marca nenhum item nas fichas: a carga inicial ficha por ficha é proposta à parte (seção 8.3).
--
-- Transação única: qualquer divergência (nome de insumo diferente do esperado, contagem errada)
-- aborta e nada é gravado. Nenhuma linha existente é apagada; só insumos.eh_tempero é atualizado.

BEGIN;

-- 1. Itens de carga --------------------------------------------------------------------------
-- Colunas: nome, categoria, subgrupo, sempre, marcavel_ficha, regra, ordem
INSERT INTO itens_carga (nome, categoria, subgrupo, sempre, marcavel_ficha, regra, ordem) VALUES
  -- Talheres de serviço (C9, C10)
  ('Pegadores / colheres',        'Talheres de serviço', NULL,      true,  false, 'dois_por_preparo', 10),
  ('Chaira / pedra / afiador',    'Talheres de serviço', NULL,      true,  false, NULL,               20),
  ('Facas de carne',              'Talheres de serviço', NULL,      true,  false, NULL,               30),
  ('Faca do chef',                'Talheres de serviço', NULL,      true,  false, NULL,               40),
  ('Faca de serrinha',            'Talheres de serviço', NULL,      true,  false, NULL,               50),
  ('Espátula de bolo',            'Talheres de serviço', NULL,      true,  false, 'so_casamento',     60),
  -- Churrasco (C14)
  ('Cano com espetos',            'Churrasco',           NULL,      true,  false, NULL,               10),
  ('Parrilla pequena',            'Churrasco',           NULL,      true,  false, NULL,               20),
  ('Carvão',                      'Churrasco',           NULL,      true,  false, NULL,               30),
  ('Álcool etanol',               'Churrasco',           NULL,      true,  false, NULL,               40),
  -- Limpeza (C11)
  ('Pano de prato',               'Limpeza',             NULL,      true,  false, NULL,               10),
  ('Perflex',                     'Limpeza',             NULL,      true,  false, NULL,               20),
  ('Esponjas',                    'Limpeza',             NULL,      true,  false, NULL,               30),
  ('Bombril',                     'Limpeza',             NULL,      true,  false, NULL,               40),
  ('Detergente / sabão',          'Limpeza',             NULL,      true,  false, NULL,               50),
  ('Pasta limpa-alumínio',        'Limpeza',             NULL,      true,  false, NULL,               60),
  ('Fósforo',                     'Limpeza',             NULL,      true,  false, NULL,               70),
  ('Álcool + borrifador',         'Limpeza',             NULL,      true,  false, NULL,               80),
  ('Pano de polimento',           'Limpeza',             NULL,      true,  false, NULL,               90),
  ('Sacos de lixo',               'Limpeza',             NULL,      true,  false, NULL,              100),
  ('Papel-filme',                 'Limpeza',             NULL,      true,  false, NULL,              110),
  ('Rolo de sacolinha',           'Limpeza',             NULL,      true,  false, NULL,              120),
  -- Temperos fixos e do buffet (C12; os do cardápio vêm de insumos.eh_tempero)
  ('Sal de parrilla',             'Temperos',            'Fixos',   true,  false, NULL,               10),
  ('Sal grosso',                  'Temperos',            'Fixos',   true,  false, NULL,               20),
  ('Sal temperado',               'Temperos',            'Fixos',   true,  false, NULL,               30),
  ('Sal comum',                   'Temperos',            'Fixos',   true,  false, NULL,               40),
  ('Óleo',                        'Temperos',            'Fixos',   true,  false, NULL,               50),
  ('Azeite',                      'Temperos',            'Fixos',   true,  false, NULL,               60),
  ('Alho triturado',              'Temperos',            'Fixos',   true,  false, NULL,               70),
  ('Alho',                        'Temperos',            'Fixos',   true,  false, NULL,               80),
  ('Azeite do buffet',            'Temperos',            'Buffet',  true,  false, NULL,              110),
  ('Vinagre do buffet',           'Temperos',            'Buffet',  true,  false, NULL,              120),
  ('Sal do buffet',               'Temperos',            'Buffet',  true,  false, NULL,              130),
  -- Louças e servir: "Sempre" (os que também podem ser marcados na ficha saem uma vez só)
  ('Bowls de reposição',          'Louças e servir',     'Sempre',  true,  false, NULL,               10),
  ('Travessas de inox',           'Louças e servir',     'Sempre',  true,  true,  NULL,               20),
  ('Tábuas de carne',             'Louças e servir',     'Sempre',  true,  true,  NULL,               30),
  ('Tábuas de salada',            'Louças e servir',     'Sempre',  true,  true,  NULL,               40),
  ('Tábuas padrão',               'Louças e servir',     'Sempre',  true,  true,  NULL,               50),
  ('Louças de cerâmica',          'Louças e servir',     'Sempre',  true,  true,  NULL,               60),
  -- Louças e servir: marcáveis nas fichas (C19)
  ('Saladeiras',                  'Louças e servir',     NULL,      false, true,  NULL,              110),
  ('Bowls',                       'Louças e servir',     NULL,      false, true,  NULL,              120),
  ('Rechauds',                    'Louças e servir',     NULL,      false, true,  NULL,              130),
  ('Travessas de lasanha',        'Louças e servir',     NULL,      false, true,  NULL,              140),
  ('Formas',                      'Louças e servir',     NULL,      false, true,  NULL,              150),
  ('Taças de vidro grandes (para comida)', 'Louças e servir', NULL, false, true,  NULL,              160),
  ('Barca de boas-vindas',        'Louças e servir',     NULL,      false, true,  NULL,              170),
  -- Bebidas: marcáveis nas fichas (C19)
  ('Jarras grandes',              'Bebidas',             NULL,      false, true,  NULL,               10),
  ('Jarras pequenas',             'Bebidas',             NULL,      false, true,  NULL,               20),
  ('Suqueiras',                   'Bebidas',             NULL,      false, true,  NULL,               30),
  ('Aquários de ponche',          'Bebidas',             NULL,      false, true,  NULL,               40),
  ('Vasos para suco',             'Bebidas',             NULL,      false, true,  NULL,               50),
  ('Taças ou copos',              'Bebidas',             NULL,      false, true,  NULL,               60),
  -- Equipamentos: marcáveis nas fichas (C19)
  ('Mixer',                       'Equipamentos',        NULL,      false, true,  NULL,               10),
  ('Processador',                 'Equipamentos',        NULL,      false, true,  NULL,               20),
  ('Liquidificador',              'Equipamentos',        NULL,      false, true,  NULL,               30),
  ('Cabrita (cortador de legumes)', 'Equipamentos',      NULL,      false, true,  NULL,               40),
  -- Descartáveis (C13)
  ('Copos',                       'Descartáveis',        NULL,      true,  false, NULL,               10),
  ('Pratinhos',                   'Descartáveis',        NULL,      true,  false, NULL,               20),
  ('Garfinhos',                   'Descartáveis',        NULL,      true,  false, NULL,               30),
  ('Guardanapos',                 'Descartáveis',        NULL,      true,  false, NULL,               40),
  ('Luvas descartáveis',          'Descartáveis',        NULL,      true,  false, NULL,               50),
  -- Equipe (C15)
  ('Uniformes',                   'Equipe',              NULL,      true,  false, NULL,               10);

-- Fora da carga inicial (Fase 0: sem decisão do Pedro). Para incluir, descomente antes de rodar:
-- INSERT INTO itens_carga (nome, categoria, subgrupo, sempre, marcavel_ficha, regra, ordem) VALUES
--   ('Maçarico',                    'Equipamentos',    NULL, false, true, NULL,  50),
--   ('Ramequins 200 ml',            'Louças e servir', NULL, false, true, NULL, 180),
--   ('Taças descartáveis 170 ml',   'Descartáveis',    NULL, false, true, NULL,  60),
--   ('Cuba GN 1/2',                 'Louças e servir', NULL, false, true, NULL, 190),
--   ('Bisnagas',                    'Louças e servir', NULL, false, true, NULL, 200),
--   ('Rechauds quadrados',          'Louças e servir', NULL, false, true, NULL, 135);

-- 2. Temperos fixos ligados aos insumos (id e nome conferidos em produção em 23/11/2026) ------
CREATE TEMP TABLE _ligacoes (item text, insumo_id int, insumo_nome text) ON COMMIT DROP;
INSERT INTO _ligacoes VALUES
  ('Sal grosso',     42, 'Sal Grosso'),
  ('Sal comum',      16, 'Sal'),
  ('Óleo',           12, 'Óleo de Soja'),
  ('Azeite',          5, 'Azeite de Oliva Extra Virgem'),
  ('Alho triturado', 24, 'Alho Triturado'),
  ('Alho',           10, 'Alho');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM _ligacoes l JOIN insumos i ON i.id = l.insumo_id AND i.nome = l.insumo_nome;
  IF n <> 6 THEN RAISE EXCEPTION 'Ligacao de temperos fixos: esperava 6 insumos com id e nome conferidos, achou %', n; END IF;
END $$;

UPDATE itens_carga c SET insumo_id = l.insumo_id FROM _ligacoes l WHERE c.nome = l.item;

-- 3. eh_tempero: grupo A da Fase 0 ------------------------------------------------------------
CREATE TEMP TABLE _temperos (id int, nome text) ON COMMIT DROP;
INSERT INTO _temperos VALUES
  (140, 'Açafrão'),
  (124, 'Caldo De Galinha'),
  (129, 'Canela Em Pó'),
  (139, 'Colorau'),
  (138, 'Creme de Cebola'),
  ( 61, 'Gergelim Branco'),
  ( 62, 'Gergelim Preto'),
  ( 47, 'Mostarda Dijon'),
  ( 77, 'Noz-Moscada'),
  (  9, 'Orégano Seco'),
  (134, 'Páprica'),
  ( 14, 'Pimenta Calabresa'),
  ( 53, 'Pimenta do Reino');
-- Grupo C (sem decisão do Pedro). Para incluir, descomente antes de rodar:
-- INSERT INTO _temperos VALUES
--   (35, 'Alecrim'), (28, 'Cheiro Verde'), (113, 'Hortelã'), (8, 'Salsinha Fresca'),
--   (58, 'Alho Crispy'), (27, 'Cebola Crispy'), (48, 'Molho Inglês'),
--   (11, 'Vinagre de Vinho Tinto'), (6, 'Vinagre de Álcool');

DO $$
DECLARE esperado int; n int;
BEGIN
  SELECT count(*) INTO esperado FROM _temperos;
  SELECT count(*) INTO n FROM _temperos t JOIN insumos i ON i.id = t.id AND i.nome = t.nome;
  IF n <> esperado THEN RAISE EXCEPTION 'eh_tempero: esperava % insumos com id e nome conferidos, achou %', esperado, n; END IF;
END $$;

UPDATE insumos i SET eh_tempero = true FROM _temperos t WHERE i.id = t.id;

-- Conferência final
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM itens_carga;
  IF n <> 62 THEN RAISE EXCEPTION 'itens_carga: esperava 62 linhas, achou % (ajuste se descomentou extras)', n; END IF;
  SELECT count(*) INTO n FROM itens_carga WHERE insumo_id IS NOT NULL;
  IF n <> 6 THEN RAISE EXCEPTION 'itens_carga com insumo ligado: esperava 6, achou %', n; END IF;
END $$;

COMMIT;
