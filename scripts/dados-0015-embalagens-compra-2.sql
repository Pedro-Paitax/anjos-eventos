-- Embalagens de compra que faltavam (valores do Pedro em 23/11/2026). Roda depois de
-- scripts/dados-0015-embalagens-compra.sql.
--   Pão De Alho Tradicional: bandeja com 5 baguetes
--   Ovo: bandeja de 30, sempre
-- Pão de Baguete e Pão Francês não têm embalagem: ficam sem (como hoje).
-- "Pão de Alho Zinho" (bandeja de 12 bolinhas) não existe como insumo em 23/11/2026: quando for
-- cadastrado, a embalagem pode ser preenchida na tela do insumo.
-- Transação única: confere id, nome e unidade e que ainda estão sem embalagem; senão aborta.

BEGIN;

CREATE TEMP TABLE _embalagens (id int, nome text, embalagem text, qtd numeric(10,3)) ON COMMIT DROP;
INSERT INTO _embalagens VALUES
  (146, U&'P\00E3o De Alho Tradicional', 'bandeja', 5),
  ( 51, 'Ovo',                          'bandeja', 30);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM insumos i JOIN _embalagens e ON e.id = i.id AND e.nome = i.nome
   WHERE i.unidade = 'Unidade' AND i.embalagem_compra_nome IS NULL;
  IF n <> 2 THEN RAISE EXCEPTION 'Esperava 2 insumos (id, nome, Unidade, sem embalagem), achou %', n; END IF;
END $$;

UPDATE insumos i
   SET embalagem_compra_nome = e.embalagem,
       embalagem_compra_qtd  = e.qtd
  FROM _embalagens e
 WHERE e.id = i.id;

DO $$
BEGIN
  IF (SELECT count(*) FROM insumos WHERE embalagem_compra_nome IS NOT NULL) <> 16 THEN
    RAISE EXCEPTION 'Esperava 16 insumos com embalagem no total';
  END IF;
END $$;

COMMIT;
