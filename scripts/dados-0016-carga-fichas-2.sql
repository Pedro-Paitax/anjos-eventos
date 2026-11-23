-- Segunda carga de itens de carga nas fichas (decisões do Pedro em 23/11/2026):
--   1. Fichas de espeto e parrilla que estavam sem marcação -> Tábuas de carne (22 fichas).
--      "Tábuas de carne" já vai sempre: o PDF não ganha linha nova, só tira essas fichas do aviso.
--   2. Lasanhas e Batata Gratinada -> Formas (além dos Rechauds que já têm).
-- Roda depois de scripts/dados-0016-carga-fichas.sql. Transação única; confere ids e textos antes
-- de gravar e aborta se algo não bater. Só insere em preparo_itens_carga.

BEGIN;

CREATE TEMP TABLE _carga (item text, ids int[]) ON COMMIT DROP;
INSERT INTO _carga VALUES
  (U&'T\00E1buas de carne', ARRAY[10,25,26,27,29,32,33,34,56,58,59,60,62,63,64,67,68,69,81,99,100,101]),
  ('Formas', ARRAY[20,52,53]);

DO $$
DECLARE n int;
BEGIN
  IF (SELECT count(*) FROM itens_carga WHERE nome IN (SELECT item FROM _carga) AND ativo) <> 2 THEN
    RAISE EXCEPTION 'Itens Tabuas de carne / Formas nao encontrados';
  END IF;
  -- Tábuas de carne: exatamente as fichas sem marcação com espeto ou parrilla no texto antigo.
  SELECT count(*) INTO n FROM preparos p
   WHERE NOT EXISTS (SELECT 1 FROM preparo_itens_carga x WHERE x.preparo_id = p.id)
     AND (p.apresentacao_utensilio LIKE '%Espetos%' OR p.apresentacao_utensilio LIKE '%Parrilha%')
     AND p.id IN (SELECT unnest(ids) FROM _carga WHERE item = U&'T\00E1buas de carne');
  IF n <> 22 THEN RAISE EXCEPTION 'Tabuas de carne: esperava 22 fichas sem marcacao com espeto/parrilla, achou %', n; END IF;
  -- Formas: lasanhas e batata gratinada, que vão ao forno e já têm Rechauds.
  SELECT count(*) INTO n FROM preparos
   WHERE id IN (20, 52, 53) AND apresentacao_utensilio LIKE '%Finalizado no Forno%';
  IF n <> 3 THEN RAISE EXCEPTION 'Formas: esperava 3 fichas de forno, achou %', n; END IF;
END $$;

INSERT INTO preparo_itens_carga (preparo_id, item_carga_id)
SELECT unnest(c.ids), i.id FROM _carga c JOIN itens_carga i ON i.nome = c.item;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM preparo_itens_carga;
  IF n <> 87 THEN RAISE EXCEPTION 'Esperava 87 marcacoes no total (62 + 25), achou %', n; END IF;
END $$;

COMMIT;
