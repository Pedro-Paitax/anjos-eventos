# Banco de Dados — Anjos Eventos

## Banco principal

O banco de dados central do sistema é **PostgreSQL**, acessado via **Drizzle ORM** (`src/db/schema/*.ts`, migrations em `drizzle/`).

> **Atualização 2026-09-22 — corte de produção concluído.** O NocoDB deixou
> de ser a fonte de dados em produção (`docs/CHECKLIST_CORTE_PRODUCAO.md`).
> Produção roda com `DATA_SOURCE=oracle`, banco em PostgreSQL no Oracle
> Cloud. O NocoDB e o Postgres local ("ender") continuam ligados só como
> janela de observação/rollback (Fase C, em andamento) — não escrever
> nenhum código novo assumindo NocoDB como fonte de verdade. Em
> desenvolvimento local, o default de `DATA_SOURCE` continua `"nocodb"`
> (`src/lib/data-source.ts`) até que o Postgres local de dev tenha os
> mesmos dados carregados.
>
> Esta versão do documento foi reescrita a partir do schema Drizzle real
> (`src/db/schema/*.ts`, `drizzle/0000_hot_madame_hydra.sql`,
> `drizzle/0001_tabelas_faltantes.sql`, `database/init/01..06.sql`), não do
> NocoDB. A versão anterior (corrigida em 2026-09-08 contra o NocoDB) está
> obsoleta — o NocoDB é fonte legada, não a fonte de verdade do schema.
> Ver `docs/schema-fisico-detalhado.md` para o racional de design de cada
> tabela (por que cada tipo/constraint foi escolhido, lacunas resolvidas
> durante o desenho).

Antes de alterar estruturas ou operações relacionadas ao banco, o agente deve verificar o schema existente (código Drizzle + `information_schema` do Postgres real, quando houver acesso).

---

# Núcleo existente (`src/db/schema/nucleo-existente.ts`)

Tabelas que já existiam fisicamente no Postgres local (`database/init/01..06.sql`) antes da migração do catálogo — nunca estiveram no NocoDB. Migradas para o Oracle no corte de produção preservando a mesma estrutura.

## `empresas`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome | text | NOT NULL, UNIQUE |
| created_at | timestamp | default now() |

## `usuarios`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome | text | NOT NULL, UNIQUE |
| created_at | timestamp | default now() |

Autenticação sem senha — ver seção "Autenticação" abaixo.

## `eventos`

42 colunas (herdadas de `database/init/01-schema.sql` + `03-evento-detalhes.sql` + `04-evento-detalhes-empresa.sql` + `05-cardapio-categorias.sql` + `06-precificacao-cardapio.sql`).

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| empresa_id | integer | FK → `empresas.id`, NOT NULL |
| cliente | text | NOT NULL |
| data_evento | timestamp | NOT NULL |
| tipo_evento | text | — |
| num_convidados | integer | **só existe no espelho do Oracle, não no Postgres local** (dívida herdada, remoção planejada, ver nota no código) |
| status | text | NOT NULL, default `'orcado'`, CHECK IN (`orcado`, `confirmado`, `realizado`, `cancelado`) |
| valor | numeric(10,2) | — |
| observacoes | text | — |
| created_at / updated_at | timestamp | default now() |
| detalhes | jsonb | — |
| qtd_adultos, qtd_criancas_ate_5, qtd_criancas_5_a_10, qtd_fornecedores | integer | — |
| cardapio_carnes, cardapio_acompanhamentos, cardapio_saladas, cardapio_bebidas, cardapio_entrada, cardapio_sobremesa | text | — |
| preco_pessoa, preco_crianca_meia, valor_garcom, taxa_deslocamento | numeric(10,2) | — |
| qtd_garcons, qtd_churrasqueiros, qtd_copeiras, quantidade_copeira_sugerida | integer | — |
| custo_copeira_total, custo_assador_total | numeric(10,2) | uso interno (Margem Real) — nunca exibidos ao cliente |
| contato, telefone, endereco_evento | text | — |
| hora_chegada_equipe, hora_aperitivo, hora_almoco, hora_encerramento | time | — |
| prazo_pagamento | date | — |
| chave_pix | text | — |
| caminho_contrato | text | — |
| regiao_metropolitana_curitiba | boolean | controla `Taxa_Deslocamento` (R$250 vs R$0) |

Índices: `empresa_id`, `data_evento`, `status`.

**Campo `Veiculo` (motor logístico)**: removido — decisão DESCARTADA em `docs/DECISOES.md` ("Motor logístico"), confirmado ausente tanto no Postgres quanto no schema real.

## `contratos`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| evento_id | integer | FK → `eventos.id`, ON DELETE CASCADE, NOT NULL |
| arquivo_pdf | text | NOT NULL |
| dados_extraidos_raw | jsonb | — |
| confirmado_por | text | — |
| confirmado_em | timestamp | — |
| created_at | timestamp | default now() |

Índice: `evento_id`.

---

# Catálogo e Orçamento (`src/db/schema/preparos.ts`, `insumos.ts`, `composicao.ts`, `cardapio-referencia.ts`, `orcamentos.ts`, `catalogo-complementar.ts`)

Migradas via `drizzle/0000_hot_madame_hydra.sql` (7 tabelas) + `drizzle/0001_tabelas_faltantes.sql` (6 tabelas). Espelham o antigo schema do NocoDB, com nomes/tipos revisados — ver `docs/schema-fisico-detalhado.md` para o racional completo de cada decisão de tipo/constraint.

## `preparos`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome_preparo | text | NOT NULL |
| categoria | enum `categoria_preparo` (Bebidas, Carnes, Entrada, Guarnições, Massas, Molhos, Saladas, Sobremesa) | NOT NULL |
| rendimento | numeric(10,3) | NOT NULL |
| unidade_rendimento | enum `unidade_rendimento` (G, ML, Unidade) | NOT NULL |
| apresentacao_utensilio | text | nullable (texto livre — substitui o multi-select "Requisitos de Logística" do NocoDB) |
| tags | enum `restricao_alimentar` (Vegano, Vegetariano, Sem Gluten, Sem Lactose), array | nullable |
| modo_preparo | text | NOT NULL |
| tempo_preparo_minutos | integer | nullable |
| peso_atratividade | numeric(6,2) | nullable, **sem DEFAULT deliberadamente** — fail-fast se ausente (motor de dimensionamento) |
| subcategoria_proteina | enum (Carne Vermelha, Ovino, Suíno, Peixe, Aves) | nullable, só preenchido quando `categoria = Carnes` |
| porcao_maxima_individual | numeric(10,3) | nullable (Hard Cap) |
| peso_medio_unidade_g | numeric(10,3) | nullable no schema, **obrigatório por validação de aplicação** quando `unidade_rendimento = Unidade` dentro de macro em g/ml |

Categoria `Saladas` **não** foi dividida em Leves/Pesadas neste campo — só o agrupamento visual (`headers_ui` → `macro_categorias`) foi dividido, ver decisão "Divisão de Saladas Leves e Pesadas" em `docs/DECISOES.md`.

## `insumos`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome | text | NOT NULL, UNIQUE |
| unidade | enum `unidade_insumo` (KG, Litro, Unidade, Maço) | NOT NULL |
| preco | numeric(10,4) | nullable (alguns insumos "grátis" têm preço vazio) — **já inclui margem interna de 10-15% sobre o custo de fornecedor**, não é preço bruto (ver `docs/DECISOES.md`) |
| fator_correcao | numeric(4,3) | nullable — vazio ou 0 → custo tratado como R$0 (evita divisão por zero, `src/lib/custo-preparo.ts`) |

"Preço Corrigido" não é coluna física — calculado em runtime em `src/lib/custo-preparo.ts`, deliberadamente (evita duas fontes de verdade divergentes).

## `composicao`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| quantidade | numeric(10,4) | NOT NULL — mesma unidade comercial do Insumo referenciado, nunca convertida |
| insumo_id | integer | FK → `insumos.id`, NOT NULL, sem regra de ON DELETE explícita (efeito prático = RESTRICT) |
| preparo_id | integer | FK → `preparos.id`, ON DELETE CASCADE, NOT NULL |

## `macro_categorias`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome_macro | text | NOT NULL, UNIQUE |
| capacidade_teto | numeric(8,2) | NOT NULL |
| unidade | enum `unidade_macro` (g, ml) | NOT NULL |

## `headers_ui`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome_exibicao | text | NOT NULL, UNIQUE |
| macro_categoria_id | integer | FK → `macro_categorias.id`, NOT NULL |

## `header_preparo` (junção N:N nativa)

| Coluna | Tipo | Constraints |
|---|---|---|
| header_ui_id | integer | FK → `headers_ui.id`, ON DELETE CASCADE |
| preparo_id | integer | FK → `preparos.id`, ON DELETE CASCADE |

PK composta (`header_ui_id`, `preparo_id`). No NocoDB essa relação era gerenciada internamente (tabela `nc_*`); aqui é uma tabela de junção própria.

## `orcamentos`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| evento_id | integer | FK → `eventos.id`, nullable (só preenchido quando o orçamento vira evento) |
| empresa_id | integer | FK → `empresas.id`, NOT NULL |
| cliente_nome | text | nullable |
| num_convidados | integer | NOT NULL |
| status | enum `status_orcamento` (Simulação, Enviado, Aceito, Recusado) | NOT NULL |
| desconto_tipo | enum `desconto_tipo` (Percentual, Valor Fixo, Nenhum) | nullable |
| desconto_valor | numeric(10,2) | nullable |
| usar_preco_fixo_modelo | boolean | NOT NULL, default `false` — só `true` quando um Cardápio Modelo com preço fixo foi carregado |
| criado_em / atualizado_em | timestamp | NOT NULL, default now() (atualizado pela aplicação, sem trigger de banco) |

`Valor_Base_Por_Pessoa` **não existe** — removido deliberadamente (decisão "Arquitetura Financeira do Orçamento" / Lacuna 1, `docs/DECISOES.md`). `Valor_Sugerido_Por_Pessoa` nunca é persistido, sempre calculado em tempo real.

## `itens_orcamento`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| orcamento_id | integer | FK → `orcamentos.id`, NOT NULL, sem regra de ON DELETE explícita (comportamento padrão NO ACTION) |
| preparo_id | integer | FK → `preparos.id`, ON DELETE RESTRICT, NOT NULL |

Não armazena quantidade, porção nem Header_UI — tudo resolvido dinamicamente a cada cálculo.

## `itens_evento_confirmados`

Definição mínima — tabela fora do escopo original do desenho detalhado, existe para suportar o ON DELETE RESTRICT de `preparos` e o histórico de eventos confirmados.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| evento_id | integer | FK → `eventos.id`, NOT NULL |
| preparo_id | integer | FK → `preparos.id`, ON DELETE RESTRICT, NOT NULL |
| orcamento_origem_id | integer | FK → `orcamentos.id`, nullable |
| quantidade_confirmada | numeric(10,4) | NOT NULL |
| custo_unitario_snapshot | numeric(10,4) | NOT NULL |

Redesenho completo desta tabela segue pendente (marcado explicitamente no código como definição mínima).

## `hierarquia_proteina`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| subcategoria | enum (Carne Vermelha, Ovino, Suíno, Peixe, Aves) | NOT NULL |
| peso_padrao | numeric(6,2) | NOT NULL |
| origem_dado | enum `origem_dado` (Dado Operacional, Estimativa Heurística) | NOT NULL |

Pesos vigentes: ver `docs/DECISOES.md`, seção "Hierarquia de proteínas" — fonte de verdade sobre os valores. `docs/REGRAS_NEGOCIO.md` reflete os mesmos valores.

## `configuracoes_globais`

Linha única (id=1) hoje.

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| tolerancia_troca_preco_fixo | numeric(10,2) | NOT NULL — hoje 1,99, ajustável sem deploy |

## `cardapios_modelo`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| nome | text | NOT NULL |
| descricao | text | nullable |
| preco_fixo_por_pessoa | numeric(10,2) | nullable — nulo = cardápio sob cálculo dinâmico (custo × 1,40) |

## `cardapio_modelo_itens`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| cardapio_modelo_id | integer | FK → `cardapios_modelo.id`, ON DELETE CASCADE, NOT NULL |
| preparo_id | integer | FK → `preparos.id`, NOT NULL |

## `orcamento_itens_adicionais`

| Coluna | Tipo | Constraints |
|---|---|---|
| id | serial | PK |
| descricao | text | NOT NULL |
| valor | numeric(10,2) | NOT NULL |
| orcamento_id | integer | FK → `orcamentos.id`, NOT NULL, sem regra de ON DELETE explícita |

Representa receita adicional cobrada do cliente — ver `docs/REGRAS_NEGOCIO.md`.

---

# Regras de ON DELETE (resumo)

| Tabela filha | FK | Regra |
|---|---|---|
| `contratos.evento_id` | → `eventos` | CASCADE |
| `composicao.preparo_id` | → `preparos` | CASCADE |
| `composicao.insumo_id` | → `insumos` | NO ACTION (efeito = RESTRICT) |
| `header_preparo.*` | → `headers_ui` / `preparos` | CASCADE (ambos os lados) |
| `itens_orcamento.preparo_id` | → `preparos` | RESTRICT |
| `itens_orcamento.orcamento_id` | → `orcamentos` | NO ACTION (não formalizado — candidato a CASCADE, ver `docs/schema-fisico-detalhado.md` Lacuna 5) |
| `itens_evento_confirmados.preparo_id` | → `preparos` | RESTRICT |
| `cardapio_modelo_itens.cardapio_modelo_id` | → `cardapios_modelo` | CASCADE |
| `orcamento_itens_adicionais.orcamento_id` | → `orcamentos` | NO ACTION (não formalizado) |
| `eventos.empresa_id` | → `empresas` | NO ACTION |

`eventos` (hard delete via `src/lib/eventos.ts`, `DELETE FROM eventos`) hoje não tem restrição por status — ver `docs/REGRAS_NEGOCIO.md` seção 3.

---

# Autenticação

Não há senha. `usuarios` só armazena `id`/`nome`. Login é seleção de nome (`/login`), grava cookie `usuario_atual` httpOnly, `secure: false` (deliberado — app roda HTTP puro sobre Tailscale, `src/lib/usuario-atual.ts`). Sem middleware global; cada Server Action decide via `obterUsuarioAtual()`.

---

# Histórico / snapshots

Ao confirmar um orçamento como evento, `itens_evento_confirmados` congela `quantidade_confirmada` e `custo_unitario_snapshot`. Esses valores não devem ser recalculados retroativamente por alterações futuras nos preços.

---

# Regra de segurança

Antes de criar tabela, remover tabela, alterar coluna, alterar relacionamento, alterar tipo de campo ou alterar constraint:

- consultar o schema Drizzle (`src/db/schema/*.ts`) e as migrations em `drizzle/`;
- gerar migration via `drizzle-kit` (nunca DDL manual direto no Postgres de produção sem migration correspondente versionada);
- verificar o banco real via `information_schema` quando houver acesso.

Nunca assumir que a documentação está mais atualizada que o schema Drizzle/banco real sem verificar.
