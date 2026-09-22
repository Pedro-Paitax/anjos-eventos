---
description: Cadastra ficha técnica completa (Preparo + Composição + Insumos) via pesquisa na internet e verificação contra o NocoDB real, com confirmação humana antes de gravar
argument-hint: [nome do preparo]
---

Você vai criar uma ficha técnica completa para o preparo: $ARGUMENTS

Siga este fluxo, na ordem exata, sem pular nenhum passo:

1. PESQUISE na internet uma receita técnica de referência para esse
   preparo em escala de buffet profissional (base de 10 porções),
   identificando insumos e quantidades típicas de produção profissional
   (não receita doméstica).

2. PESQUISE preços atuais de mercado em Curitiba/Região Metropolitana do
   Paraná para cada insumo identificado — supermercados, atacados
   (Atacadão, Assaí), frigoríficos/casas de carnes. Se não encontrar
   preço exato, use a melhor estimativa técnica e SINALIZE claramente
   quais preços são estimados vs. pesquisados de verdade.

3. BUSQUE via API do NocoDB (token em NOCODB_API_TOKEN do .env) todos os
   Insumos já cadastrados hoje na tabela Insumos.

4. Para cada insumo que o preparo precisa, faça o casamento:
   - Compare o nome ignorando maiúscula/minúscula e acentuação (ex:
     "batata inglesa" e "Batata Inglesa" e "BATATA INGLESA" são o mesmo
     insumo).
   - Se encontrar um insumo já cadastrado que corresponda: REAPROVEITE
     o que já existe — nome, preço e Fator de Correção EXATAMENTE como
     estão no banco. NUNCA sobrescreva um insumo já cadastrado com o
     preço que você encontrou na pesquisa, mesmo que seja diferente
     (os preços cadastrados já incluem uma margem interna do negócio,
     não são preço puro de mercado).
   - Se não encontrar nenhuma correspondência: PROPONHA um insumo novo,
     com o nome em Title Case (ex: "Batata Inglesa", "Creme De Leite"),
     com o preço e Fator de Correção que você pesquisou.

5. MONTE a ficha técnica completa (Preparo + Composição), respeitando as
   regras já documentadas em docs/DECISOES.md e docs/REGRAS_NEGOCIO.md,
   incluindo:
   - Rendimento total e Unidade_Rendimento (G, ML ou Unidade)
   - Porção sugerida por pessoa, respeitando os tetos de Macro_Categorias
     já cadastrados no NocoDB (consulte a tabela real antes de sugerir
     um número, não assuma valores de memória)
   - Categoria, Apresentação/Utensílio, Tags, Tempo_Preparo
   - Se Categoria = Carnes: Subcategoria_Proteina (nunca preencha
     Peso_Atratividade neste caso, é resolvido automaticamente)
   - Se Categoria ≠ Carnes: Peso_Atratividade sugerido (padrão 1.0, só
     diferente com justificativa em uma linha)
   - Porcao_Maxima_Individual, apenas se fizer sentido (teste: "se esse
     prato fosse o único da categoria e recebesse 100% do teto, seria uma
     porção razoável?" — se não, sugira um teto; se sim, deixe em branco)
   - Se Unidade_Rendimento = Unidade: verifique a Macro_Categoria real do
     preparo (via Header_UI vinculado, consultando o NocoDB) — se ela for
     medida em g/ml, Peso_Medio_Unidade_G é OBRIGATÓRIO (docs/DECISOES.md,
     "Correção do Bug de Mistura de Unidades"). NUNCA derive esse valor
     automaticamente a partir da Composição (vetado explicitamente — perda
     de peso por cocção/evaporação torna a soma crua dos insumos não
     confiável). Se não for possível determinar um peso médio real e
     confiável (pesquisado ou informado por você), PARE e pergunte ao
     Pedro em vez de estimar um número às cegas.

6. APRESENTE UM RESUMO DE REVISÃO antes de gravar qualquer coisa,
   mostrando claramente e separado:
   - Insumos que serão REAPROVEITADOS (já existem, zero alteração neles)
   - Insumos que serão CRIADOS (novos, com preço/fator pesquisado, nome
     em Title Case)
   - O Preparo e a Composição completos, prontos para conferência
   - Quais preços são estimativa vs. pesquisa confirmada

7. NÃO grave nada no NocoDB até eu confirmar explicitamente depois de ver
   esse resumo.

8. Após minha confirmação, grave nesta ordem: primeiro os Insumos novos
   (se houver), depois o Preparo, depois a Composição ligando tudo.