# Banco de Dados — Anjos Eventos

## Banco principal

O banco de dados central do sistema é PostgreSQL.

O NocoDB funciona como interface administrativa sobre o PostgreSQL.

Antes de alterar estruturas ou operações relacionadas ao banco, o agente deve verificar o schema existente.

> Esta versão do documento foi corrigida em 2026-09-08 a partir do schema
> real (`GET /api/v2/meta/tables/...` e `GET /api/v2/meta/bases/.../tables`
> no NocoDB), não de memória. Nomes de campo, opções de select e presença/
> ausência de campos foram todos conferidos contra o banco vivo. Onde a
> versão anterior deste documento divergia do banco real, a divergência é
> sinalizada explicitamente abaixo (não foi corrigida em silêncio).

---

# Tabelas principais

## Empresas

ID da tabela: `m3op8f60x747yun`

| Campo | Tipo |
|---|---|
| Title | Single line text |
| Eventos | Link → Eventos (um-para-muitos) |
| Orcamentos | Link → Orcamentos (um-para-muitos) |

**Divergência com versão anterior:** o campo de nome era documentado como
`Nome`. No banco real o campo se chama `Title`.

---

## Eventos

ID da tabela: `mu7rs9mid43zhlm`

| Campo | Tipo |
|---|---|
| Cliente | Single line text |
| Empresa | Link → Empresas |
| Data_Evento | Date |
| Tipo_Evento | Single select |
| Num_Convidados | Number |
| Status | Single select |
| Observacoes | Long text |
| Caminho_Contrato | Single line text |
| Orcamentos | Link → Orcamentos (um-para-muitos) |
| Itens_Eventos_Confirmados | Link → Itens_Eventos_Confirmado (muitos-para-muitos) |

**Divergência com versão anterior:** os campos `Veiculo`,
`Valor_Base_Por_Pessoa_Fechado`, `Desconto_Tipo`, `Desconto_Valor` e
`Valor_Total_Fechado` estavam documentados aqui e **não existem** na tabela
Eventos do banco real, nem são referenciados em nenhum arquivo de
`src/` (busca confirmada). Isso bate parcialmente com a pendência de
`docs/DECISOES.md` (seção "Motor logístico") sobre remover `Veiculo` — o
campo já não existe mais no banco, então essa parte da pendência de
execução parece já resolvida (não confirmado se foi removida
deliberadamente ou nunca chegou a ser criada; vale conferir com o Pedro).
Os campos financeiros (`Valor_Base_Por_Pessoa`, `Desconto_Tipo`,
`Desconto_Valor`) existem, mas na tabela **Orcamentos**, não em Eventos —
ver abaixo. Não existe hoje nenhum campo `Valor_Total_Fechado` em nenhuma
tabela da base.

---

## Preparos

ID da tabela: `m3yr136ykw6ju2w`

| Campo | Tipo |
|---|---|
| Nome Do Preparo | Single line text |
| Categoria | Single select |
| Rendimento | Number |
| UOM Rendimento | Single select |
| Requisitos de Logística | Multi select |
| Restrições | Multi select |
| Modo de Preparo | Long text |
| Minutes | Decimal |
| Peso_Atratividade | Number |
| Subcategoria_Proteina | Single select |
| Porcao_Maxima_Individual | Decimal |
| Macro_Categoria | Link → Headers_UI (nome do campo é enganoso — ver nota abaixo) |
| Composição | Link → Composicao (um-para-muitos) |
| Itens_Orcamentos | Link → Itens_Orcamento (muitos-para-muitos) |
| Itens_Eventos_Confirmados | Link → Itens_Eventos_Confirmado (muitos-para-muitos) |
| Cardapio_Modelo_Itens | Link → Cardapio_Modelo_Itens |

Categorias (Single select `Categoria`):

- Carnes
- Entrada
- Guarnições
- Massas
- Molhos
- Saladas
- Sobremesa
- Bebidas

Unidades de rendimento (Single select `UOM Rendimento`):

- Unidade
- KG
- ML
- Pessoas
- G

Requisitos de Logística (Multi select):

- Finalizado na Brasa
- Finalizado na Panela
- Finalizado no Forno
- Precisa de Bisnaga
- Precisa de Descartável
- Réchaud Quadrado
- Réchaud Redondo
- Servido Frio
- Servido Quente
- Taça de Mesa de Vidro
- Travessa (Salada)
- Maçarico
- Tábua pra Frios
- Espetos
- Taça de 170Ml Descartavel
- Parrilha
- Jarras

Restrições (Multi select):

- Sem Gluten
- Sem Lactose
- Vegano
- Vegetariano

Subcategoria_Proteina (Single select):

- Carne Vermelha
- Ovino
- Suíno
- Peixe
- Aves

**Divergência com versão anterior:**
- `Apresentação/Utensílio` (single line text) não existe. O campo real
  equivalente é `Requisitos de Logística` (multi select, lista fixa acima).
- `Tags` (multi select livre) não existe. O campo real com esse papel é
  `Restrições` (multi select, lista fixa de 4 opções — não é uma tag
  genérica).
- `Peso_Medio_Unidade_G` não existe na tabela.
- `Categoria` tinha `Massas` fora da lista documentada — corrigido acima.
- `Unidade_Rendimento` é o nome documentado; o campo real chama-se
  `UOM Rendimento` e tem duas opções a mais (`KG`, `Pessoas`) além de
  G/ML/Unidade.
- **Achado não documentado antes:** existe um campo de link chamado
  `Macro_Categoria` em Preparos, mas ele liga a **Headers_UI**, não a
  Macro_Categorias — o nome do campo é enganoso (confirmado também em
  comentário de código, `src/lib/dimensionamento-cardapio.ts:19`). A
  Macro_Categoria de um preparo é resolvida indiretamente: Preparo →
  Headers_UI (este campo) → Headers_UI.Macro_Economias → Macro_Categorias.
  Um preparo sem esse link não aparece no motor de dimensionamento nem no
  simulador (fica em `itens_excluidos`).
- **Achado de processo:** `src/lib/preparos.ts` (`criarPreparo`/
  `atualizarPreparo`, usados pela tela de cadastro) não grava esse link
  Preparo→Headers_UI. Um preparo criado só pela tela de cadastro atual
  fica sem macro-categoria resolvida até alguém vincular manualmente pelo
  NocoDB (ou por chamada direta à API de Links).

---

## Insumos

ID da tabela: `m2ll6qtupa1q1il`

| Campo | Tipo |
|---|---|
| Nome | Single line text |
| UDM | Single select |
| Custo Médio | Currency |
| Rendimento (%) | Decimal |
| Custo Total | Formula |
| Composição | Link → Composicao (um-para-muitos) |

UDM (Single select):

- KG
- Litro
- Maço
- Unidade

Fórmula de `Custo Total`:

```text
Custo Médio / Rendimento (%)
```

Regra de borda: se `Rendimento (%)` for 0 ou `Custo Médio` estiver vazio, o
custo deve ser tratado como R$0 para evitar divisão por zero (implementado
em `src/lib/custo-preparo.ts`, `calcularCustoTotalComposicao`).

**Divergência com versão anterior:** os nomes documentados (`Unidade`,
`Preco`, `Fator de Correção`, `Preço Corrigido`) não existem. Os campos
reais são `UDM`, `Custo Médio`, `Rendimento (%)` e `Custo Total`
respectivamente — mesmo papel/fórmula, nomes diferentes.

---

## Composicao

ID da tabela: `mj1muse0q0pjli8`

| Campo | Tipo |
|---|---|
| Quantidade | Decimal |
| Insumo | Link → Insumos |
| Preparo | Link → Preparos |
| Resumo | Formula (`CONCAT({Insumo}, " : ", {Quantidade})`) |

`Quantidade` é expressa na mesma unidade (`UDM`) cadastrada no Insumo
vinculado (ex.: se o Insumo está em KG, `Quantidade` é em kg, não em
gramas).

---

## Hierarquia_Proteina

ID da tabela: `mmzb31uy5dbo7g7`

Tabela de referência fixa.

| Campo | Tipo |
|---|---|
| Subcategoria | Single select (Carne Vermelha, Ovino, Suíno, Peixe, Aves) |
| Peso_Padrao | Decimal |
| Origem_Dado | Single select (Dado Operacional, Estimativa Heurística) |

Os valores atuais de `Peso_Padrao` devem ser lidos diretamente do NocoDB
antes de qualquer decisão — `docs/DECISOES.md` e `docs/REGRAS_NEGOCIO.md`
registram dois conjuntos de pesos diferentes entre si (divergência de
documentação já sinalizada, não corrigida aqui: este documento trata só de
nomes/tipos de campo, não da regra de negócio em si).

---

## Macro_Categorias

ID da tabela: `me1h77whhyj9ghj`

| Campo | Tipo |
|---|---|
| Nome_Macro | Single line text |
| Capacidade_Categoria | Decimal |
| UOM | Single select |
| Headers_UI | Link → Headers_UI (muitos-para-muitos) |

UOM (Single select):

- g
- ml
- un

**Divergência com versão anterior:** o campo de teto era documentado como
`Capacidade_Teto`. O campo real chama-se `Capacidade_Categoria`. A lista de
UOM também tinha só `g`/`ml`; o banco real também tem `un`.

---

## Headers_UI

ID da tabela: `m1wg9dhlf23jby6`

| Campo | Tipo |
|---|---|
| Nome_Exibicao | Single line text |
| Macro_Economias | Link → Macro_Categorias (muitos-para-um; nome do campo também é enganoso, ver nota) |
| Preparos | Link → Preparos (um-para-muitos) |
| Itens_Orcamentos | Link → Itens_Orcamento (muitos-para-muitos) |

Existe relação muitos-para-muitos com Preparos (via o campo `Macro_Categoria`
de Preparos, que na prática aponta pra cá).

**Nota:** o campo de link para Macro_Categorias dentro de Headers_UI se
chama `Macro_Economias`, não `Macro_Categoria` — mais um nome de campo que
não corresponde ao conceito de negócio que representa. Ver
`src/lib/dimensionamento-cardapio.ts:20`.

---

## Orcamentos

ID da tabela: `mpobqls8ibt3ay3`

Não estava documentada na versão anterior deste arquivo.

| Campo | Tipo |
|---|---|
| Cliente_Nome | Single line text |
| Evento | Link → Eventos |
| Empresa | Link → Empresas |
| Num_Convidados | Number |
| Status | Single select |
| Criado_Em | Created time |
| Atualizado_Em | Last modified time |
| Itens_Orcamentos1 | Link → Itens_Orcamento (um-para-muitos) |
| Itens_Eventos_Confirmados | Link → Itens_Eventos_Confirmado (muitos-para-muitos) |
| Valor_Base_Por_Pessoa | Decimal |
| Desconto_Tipo | Single select (Percentual, Valor Fixo, Nenhum) |
| Desconto_Valor | Decimal |
| Orcamento_Itens_Adicionais | Link → Orcamento_Itens_Adicionais |

Estes três últimos campos correspondem à decisão "Arquitetura Financeira do
Orçamento" em `docs/DECISOES.md` (lá registrada como "schema pendente de
criação") — o schema já existe no banco real; vale atualizar o status dessa
decisão se/quando o Pedro confirmar.

---

## Itens_Orcamento

ID da tabela: `m4tc69znld4pmxa`

Não estava documentada na versão anterior deste arquivo.

| Campo | Tipo |
|---|---|
| Orcamento | Link → Orcamentos |
| Preparo | Link → Preparos (muitos-para-muitos) |
| Header_UI | Link → Headers_UI (muitos-para-muitos) |

---

## Orcamento_Itens_Adicionais

ID da tabela: `m8hw626eihfsnzs`

Não estava documentada na versão anterior deste arquivo.

| Campo | Tipo |
|---|---|
| Descricao | Single line text |
| Valor | Decimal |
| Orcamento | Link → Orcamentos |

Representa receita adicional cobrada do cliente — ver
`docs/REGRAS_NEGOCIO.md` seção 13 (não confundir com
Custos_Operacionais_Evento, que não foi localizada como tabela própria no
schema atual).

---

# Regra de segurança

Antes de:

- criar tabela;
- remover tabela;
- alterar coluna;
- alterar relacionamento;
- alterar tipo de campo;
- alterar fórmula;

o agente deve verificar o schema atual e a documentação.

Nunca assumir que a documentação está mais atualizada que o banco sem
verificar.

---

# Histórico

Quando um orçamento é confirmado como evento, determinadas informações
devem ser congeladas para preservar o histórico.

A tabela real é **Itens_Eventos_Confirmado** (ID `mw4uoldmjxp7bbe`), não
`Itens_Evento_Confirmados` como o nome sugeria antes:

| Campo | Tipo |
|---|---|
| Evento | Link → Eventos (muitos-para-muitos) |
| Preparo | Link → Preparos (muitos-para-muitos) |
| Orcamento_Origem | Link → Orcamentos (muitos-para-muitos) |
| Quantidade_Confirmada | Number |
| Custo_Unitario_Snapshot | Decimal |

Esses valores representam o estado confirmado do evento e não devem ser
recalculados retroativamente por alterações futuras nos preços.
