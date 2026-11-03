---
description: Cadastra fichas técnicas completas (Preparo + Composição + Header_UI + Insumos novos) no Postgres, com pesquisa de receita e preço e aprovação do Pedro antes de gravar
argument-hint: [nome do preparo, ou "lista" para uma lista colada na conversa]
---

Você vai cadastrar ficha(s) técnica(s) para: $ARGUMENTS

Se o Pedro colou uma lista de preparos (feita por outra IA ou por ele), trate a lista como
**rascunho**: confira cada item com as regras abaixo e com o banco real, corrija o que não
bater e aponte o que mudou. Trabalhe em lotes de até 5 preparos por arquivo.

O banco é o **Postgres de produção** (Oracle). O NocoDB não é mais fonte de verdade: não use.
Toda leitura e escrita passa pelo script `scripts/cadastrar-preparo.ts`, que valida as regras,
mostra o resumo e grava numa transação. Não escreva SQL de INSERT à mão.

Siga o fluxo, na ordem, sem pular passos:

1. **REFERÊNCIA DO BANCO.** Rode `npx tsx scripts/cadastrar-preparo.ts --referencia`.
   Ele lista os Headers_UI (com macro-categoria e teto por pessoa), todos os insumos
   (unidade, preço cadastrado, fator) e os fornecedores ativos. Use só nomes que aparecem ali.

2. **RECEITA.** Para cada preparo, pesquise uma receita técnica em escala de buffet
   profissional (base de 10 porções), não receita doméstica. Se a lista colada já traz
   insumos e quantidades, use-a como ponto de partida e corrija o que estiver fora de escala.

3. **INSUMOS.** Para cada insumo da receita:
   - Se existe no banco (o script compara sem maiúsculas, acentos e espaços extras):
     REAPROVEITE. Use o nome que está lá. Nunca altere preço, fator ou nome de insumo
     existente, mesmo que a pesquisa ache outro preço (o cadastro já tem a margem interna).
   - Se não existe: proponha um insumo **novo** (o nome vira Title Case sozinho). Pesquise o
     preço em Curitiba/Região Metropolitana (atacados como Atacadão e Assaí, mercados,
     frigoríficos) e informe o **preço do fornecedor, bruto**: o script soma os 10% de margem
     no cadastro (decisão do Pedro, 2026-11-02). Guarde o link e a data da fonte.
   - Não achou preço confiável? Marque `"estimado": true`. O insumo entra sem data e aparece
     como "sem data" na tela de insumos para o Pedro conferir. Nunca apresente estimativa como
     preço pesquisado.
   - Quantidade sempre na unidade comercial do insumo (KG, Litro, Unidade, Maço), sem converter.

4. **FICHA.** Monte cada ficha respeitando `docs/DECISOES.md` e `docs/REGRAS_NEGOCIO.md`:
   - `header`: um Header_UI existente. **Obrigatório**: sem header o preparo sai do cálculo
     do cardápio em silêncio. A unidade do rendimento (G/ML) tem que bater com a da macro.
   - `rendimento` + `unidadeRendimento` (G, ML ou Unidade).
   - `categoria`: Bebidas, Carnes, Entrada, Guarnições, Massas, Molhos, Saladas ou Sobremesa.
   - Carnes: `subcategoriaProteina` (Carne Vermelha, Ovino, Suíno, Peixe, Aves) e **sem**
     `pesoAtratividade` (vem da hierarquia de proteínas).
   - Demais categorias: `pesoAtratividade` (padrão 1.0; outro valor só com justificativa em
     uma linha).
   - `porcaoMaximaIndividual`: só se fizer sentido. Teste: "se esse prato fosse o único da
     categoria e recebesse 100% do teto da macro, a porção seria razoável?" Se não, sugira um
     teto; se sim, deixe `null`.
   - Rendimento em Unidade: `pesoMedioUnidadeG` é **obrigatório** e tem que ser real
     (pesquisado ou informado pelo Pedro). Nunca derive da soma da composição. Se não souber,
     PARE e pergunte ao Pedro.
   - `passos`: lista `{ "ordem", "descricao", "tempo_estimado_min" }` (o modo de preparo em
     texto é gerado a partir deles). `tags`, `tempoPreparoMinutos` e `apresentacaoUtensilio`
     são opcionais.

5. **ARQUIVO.** Escreva as fichas em `fichas-preparo/AAAA-MM-DD-<assunto>.json` (pasta fora
   do git). Formato: uma lista de fichas, cada uma assim:

   ```json
   {
     "nome": "Farofa de Bacon",
     "categoria": "Guarnições",
     "header": "Acompanhamentos Rústicos",
     "rendimento": 1000,
     "unidadeRendimento": "G",
     "pesoAtratividade": 1.0,
     "porcaoMaximaIndividual": null,
     "tempoPreparoMinutos": 25,
     "apresentacaoUtensilio": "Cuba GN 1/2",
     "tags": [],
     "passos": [
       { "ordem": 1, "descricao": "Frite o bacon em cubos até dourar.", "tempo_estimado_min": 10 }
     ],
     "composicao": [
       { "insumo": "Bacon", "quantidade": 0.25 },
       { "insumo": "Farinha De Mandioca Torrada", "quantidade": 0.6,
         "novo": { "unidade": "KG", "precoFornecedor": 9.9, "fatorCorrecao": 1,
                   "fonte": "pesquisa_web", "url": "https://...", "observadoEm": "2026-11-02",
                   "fornecedor": "Atacadão Curitiba", "canal": "atacado" } },
       { "insumo": "Cheiro Verde", "quantidade": 0.5,
         "novo": { "unidade": "Maço", "precoFornecedor": 3, "fatorCorrecao": 0.7, "estimado": true } }
     ]
   }
   ```

   No `novo`: `fonte` é `pesquisa_web`, `nota_fiscal`, `ceasa` ou `manual`; `fornecedor` é
   opcional e precisa existir em /fornecedores; `canal` é `atacado` ou `varejo`. Um insumo
   novo usado em duas fichas do mesmo arquivo leva o `novo` só na primeira.

6. **SIMULAÇÃO.** Rode `npx tsx scripts/cadastrar-preparo.ts fichas-preparo/<arquivo>.json`
   (sem `--gravar`). Se der erro, corrija o JSON e rode de novo. Não contorne a validação.

7. **REVISÃO DO PEDRO.** Mostre o resumo da simulação, organizado por preparo:
   - insumos REAPROVEITADOS (nada muda neles);
   - insumos NOVOS, com preço do fornecedor → preço de cadastro (+10%), fonte e link;
   - quais preços são ESTIMADOS e quais foram pesquisados de verdade;
   - a ficha completa e o custo do rendimento;
   - o que você mudou em relação à lista colada, se houver.

   NÃO grave nada até o Pedro aprovar explicitamente esse resumo.

8. **GRAVAÇÃO.** Depois da aprovação, rode o mesmo comando com `--gravar`. O script grava,
   numa única transação, insumos novos (com histórico de preço), preparos, composição e o
   vínculo com o header. Se qualquer ficha falhar, nada é gravado. Informe ao Pedro os ids
   criados.

Regras que o script garante e você não deve tentar burlar: não cria preparo com nome que já
existe (para alterar um preparo existente, use a tela do app), não altera insumo existente,
não grava sem header, não aceita insumo inexistente sem `novo`, só roda contra o banco do
Oracle (`.env` na raiz do projeto).
