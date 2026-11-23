-- Carga inicial dos itens de carga nas fichas técnicas (spec do checklist, seção 8.3).
-- Proposta a partir de preparos.apresentacao_utensilio e aprovada pelo Pedro em 23/11/2026.
-- Roda depois da migração 0016 e de scripts/dados-0016-checklist-carregamento.sql.
--
-- Regra aprovada:
--   texto com "Réchaud Redondo"      -> Rechauds        (48 fichas)
--   texto com "Travessa (Salada)"    -> Saladeiras      (10 fichas)
--   "Jarras"                         -> Jarras grandes  (Coca Cola)
--   "Taça de Mesa de Vidro"          -> Taças de vidro grandes (para comida) (Vinagrete)
--   "Tábua pra Frios"                -> Tábuas padrão   (Bruschetta, Tábua de Frios)
-- Fichas só com espetos/parrilla/brasa/servido frio, ou com itens não cadastrados (ramequin, taça
-- descartável, cuba GN, bisnaga, maçarico), ficam sem marcação e saem no aviso do PDF.
--
-- Transação única. Confere que cada id tem o texto antigo esperado e que nenhuma ficha com esse
-- texto ficou de fora; se algo não bater, aborta e nada é gravado. Só insere em preparo_itens_carga.
-- O texto antigo (apresentacao_utensilio) não é alterado.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM preparo_itens_carga) THEN
    RAISE EXCEPTION 'preparo_itens_carga já tem marcações: carga inicial já feita?';
  END IF;
END $$;

-- padrao: trecho ASCII do texto antigo (evita depender de acento no terminal)
CREATE TEMP TABLE _carga (item text, padrao text, ids int[]) ON COMMIT DROP;
INSERT INTO _carga VALUES
  ('Rechauds', '%chaud Redondo%', ARRAY[
     85,12,93,95,94,90,91,92,24,66,28,82,84,83,23,72,87,88,89,31,79,80,30,86,77,78,71,75,76,97,70,73,74,98,
     35,48,51,49,47,46,45,50,54,
     52,53,
     13,20,21]),
  ('Saladeiras', '%Travessa (Salada)%', ARRAY[55,36,41,38,40,39,43,42,37,14]),
  ('Jarras grandes', 'Jarras', ARRAY[15]),
  ('Taças de vidro grandes (para comida)', '%de Mesa de Vidro%', ARRAY[2]),
  ('Tábuas padrão', '%bua pra Frios%', ARRAY[8,61]);

DO $$
DECLARE r record; n_ok int; n_texto int; n_item int;
BEGIN
  FOR r IN SELECT * FROM _carga LOOP
    SELECT count(*) INTO n_item FROM itens_carga WHERE nome = r.item AND ativo;
    IF n_item <> 1 THEN RAISE EXCEPTION 'Item de carga % não encontrado', r.item; END IF;
    -- todos os ids têm o texto esperado
    SELECT count(*) INTO n_ok FROM preparos WHERE id = ANY(r.ids) AND apresentacao_utensilio LIKE r.padrao;
    IF n_ok <> cardinality(r.ids) THEN
      RAISE EXCEPTION 'Item %: esperava % fichas com o texto %, achou %', r.item, cardinality(r.ids), r.padrao, n_ok;
    END IF;
    -- nenhuma ficha com esse texto ficou de fora
    SELECT count(*) INTO n_texto FROM preparos WHERE apresentacao_utensilio LIKE r.padrao;
    IF n_texto <> cardinality(r.ids) THEN
      RAISE EXCEPTION 'Item %: % fichas têm o texto %, mas a carga cobre %', r.item, n_texto, r.padrao, cardinality(r.ids);
    END IF;
  END LOOP;
END $$;

INSERT INTO preparo_itens_carga (preparo_id, item_carga_id)
SELECT unnest(c.ids), i.id FROM _carga c JOIN itens_carga i ON i.nome = c.item;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM preparo_itens_carga;
  IF n <> 62 THEN RAISE EXCEPTION 'Esperava 62 marcações, achou %', n; END IF;
  SELECT count(DISTINCT preparo_id) INTO n FROM preparo_itens_carga;
  IF n <> 62 THEN RAISE EXCEPTION 'Esperava 62 fichas marcadas, achou %', n; END IF;
END $$;

COMMIT;
