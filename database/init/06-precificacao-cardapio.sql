-- Precificação por Cardápio Selecionado + Custo de Equipe Fixa
-- Ver docs/DECISOES.md, seção "Precificação por Cardápio Selecionado +
-- Custo de Equipe Fixa".

ALTER TABLE eventos
    ADD COLUMN IF NOT EXISTS regiao_metropolitana_curitiba BOOLEAN,
    ADD COLUMN IF NOT EXISTS quantidade_copeira_sugerida INTEGER,
    ADD COLUMN IF NOT EXISTS custo_copeira_total NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS custo_assador_total NUMERIC(10, 2);

COMMENT ON COLUMN eventos.regiao_metropolitana_curitiba IS 'Toggle manual "Região Metropolitana de Curitiba?" — define Taxa_Deslocamento (R$250 se true, R$0 se false), sem geolocalização automática.';
COMMENT ON COLUMN eventos.quantidade_copeira_sugerida IS 'Sugestão automática CETO(Num_Convidados/50), R$250/profissional — uso exclusivo interno no cálculo de Margem Real, nunca exibido/cobrado do cliente. Não confundir com qtd_copeiras (quantidade real escalada, editada manualmente pela operação).';
COMMENT ON COLUMN eventos.custo_copeira_total IS 'quantidade_copeira_sugerida x R$250 — uso exclusivo interno no cálculo de Margem Real.';
COMMENT ON COLUMN eventos.custo_assador_total IS 'qtd_churrasqueiros x R$250 — "Assador" na terminologia de docs/DECISOES.md é o mesmo cargo de qtd_churrasqueiros, agora calculado automaticamente (CETO(Num_Convidados/100)) em vez de editado manualmente. Uso exclusivo interno no cálculo de Margem Real.';
