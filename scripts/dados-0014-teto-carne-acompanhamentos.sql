-- DADOS da migração 0014 (teto de carne por acompanhamentos). APLICADO em 2026-11-05 (junto com a 0014,
-- transação única; dump pre-0014-20261105-102842.dump). Fica só como registro: não rodar de novo
-- (o UPDATE do teto confere "capacidade_teto = 280" e falharia).
-- Valores aprovados pelo Pedro em 2026-11-04; ids conferidos no banco no mesmo dia.
-- Ordem em produção: dump validado → drizzle/0014_teto_carne_acompanhamentos.sql → deploy do app → este script.
-- (O teto 315 vale assim que este script roda, mesmo sem o código novo; o ajuste por acompanhamentos
--  só depois do deploy. Por isso este script vai por último.)
-- Transação única; cada UPDATE confere nome e valor esperados. Sem DELETE.

BEGIN;

-- Pesos de acompanhamento. Os demais ficam no default 0:
-- 1 Proteínas Principais, 2 Carboidratos Densos, 5 Condimentos/Molhos, 6 Bebidas S Alcool,
-- 7 Bebidas C Alcool, 11 Sobremesas.
UPDATE macro_categorias SET peso_acompanhamento = 1   WHERE id = 10 AND nome_macro = 'Entradas e Petiscos';
UPDATE macro_categorias SET peso_acompanhamento = 1   WHERE id = 9  AND nome_macro = 'Guarnições Leves';
UPDATE macro_categorias SET peso_acompanhamento = 1   WHERE id = 12 AND nome_macro = 'Saladas Pesadas';
UPDATE macro_categorias SET peso_acompanhamento = 0.5 WHERE id = 4  AND nome_macro = 'Saladas Leves';

-- Carne: 450 g comprados (bruto) × 0,7 = 315 g servidos; liga o ajuste por acompanhamentos.
UPDATE macro_categorias
   SET capacidade_teto = 315, ajusta_por_acompanhamentos = true
 WHERE id = 1 AND nome_macro = 'Proteínas Principais' AND capacidade_teto = 280;

-- Parâmetros globais (linha única, id = 1). Piso 252 g = 360 g comprados × 0,7 (−20 %).
UPDATE configuracoes_globais
   SET acomp_referencia = 5, acomp_reducao_por_item = 0.05, teto_carne_piso_g = 252
 WHERE id = 1;

-- Conferência (esperado: 5 macros alteradas; 1 linha em configuracoes_globais).
SELECT id, nome_macro, capacidade_teto, peso_acompanhamento, ajusta_por_acompanhamentos
  FROM macro_categorias ORDER BY id;
SELECT id, acomp_referencia, acomp_reducao_por_item, teto_carne_piso_g FROM configuracoes_globais;

COMMIT;
