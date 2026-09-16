# Documentação Arquitetônica — Anjos Eventos (Núcleo de Fichas Técnicas e Orçamento)

**Aviso de escopo, antes de qualquer tabela:** este documento consolida o
schema **lógico** — decidido, debatido e validado ao longo de todo o
desenvolvimento. Os **tipos físicos de PostgreSQL** (precisão exata,
tamanho de VARCHAR, tipo de chave primária, regras de `ON DELETE` em nível
de banco) **ainda não foram formalmente decididos** — até agora o sistema
rodou sobre as abstrações do NocoDB (Decimal, Single Select, Link to
Table), e o desenho do schema nativo é o Passo 2 do "Plano de Migração e
Remoção do NocoDB" (`docs/plano-migracao-postgres-vultr.md`), ainda não
executado. Onde proponho um tipo físico abaixo, está marcado como
**PROPOSTA**, não decisão — segue os princípios já estabelecidos no
projeto (NUMERIC/DECIMAL para dinheiro e peso, nunca FLOAT) mas exige
validação antes de virar DDL real.

---

## 1. `Preparos`

**Propósito core:** catálogo de fichas técnicas — cada linha é uma receita
com seus metadados de categorização, rendimento e regras de cálculo.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) — manter, não migrar para UUID (ver Lacuna 2) | PK |
| Nome Do Preparo | Texto curto | TEXT | NOT NULL |
| Categoria | Enum fechado: Entrada, Guarnições, Molhos, Carnes, Saladas Leves, Saladas Pesadas, Bebidas, Sobremesa | TEXT com CHECK constraint, ou tipo ENUM nativo | NOT NULL |
| Rendimento | Numérico | NUMERIC(10,3) | NOT NULL |
| Unidade_Rendimento | Enum fechado: G, ML, Unidade | TEXT com CHECK, ou ENUM | NOT NULL |
| Apresentação/Utensílio | Texto livre (lista informal, não enum fechado — decidido explicitamente aberto) | TEXT | nullable |
| Tags | Multi-seleção: Vegano, Vegetariano, Sem Gluten, Sem Lactose | TEXT[] (array) ou tabela de junção `Preparo_Tags` | nullable |
| Modo de Preparo | Texto longo | TEXT | NOT NULL |
| Tempo_Preparo | Minutos, opcional (vazio quando não há cozimento ativo) | INTEGER | nullable |
| Peso_Atratividade | Peso manual para rateio — **sem DEFAULT, aceita NULL** (decisão deliberada de fail-fast) | NUMERIC(6,2) | nullable, **sem default** |
| Subcategoria_Proteina | Enum fechado, só preenchido quando Categoria = Carnes: Carne Vermelha, Ovino, Suíno, Peixe, Aves | TEXT com CHECK, ou ENUM | nullable |
| Porcao_Maxima_Individual | Hard Cap opcional, mesma unidade de Unidade_Rendimento | NUMERIC(10,3) | nullable |
| Peso_Medio_Unidade_G | Conversão manual, obrigatório quando Unidade_Rendimento=Unidade dentro de macro em g/ml (decisão que vetou derivação automática) | NUMERIC(10,3) | nullable no schema, **obrigatório por validação de aplicação** quando a condição acima se aplica — ver Lacuna 4 |

**Relacionamentos:**
- 1:N com `Composição` (um Preparo tem várias linhas de composição).
- N:N com `Headers_UI` (um Preparo pode aparecer em mais de um Header; decidido resolver essa categorização **dinamicamente**, não gravada em `Itens_Orcamento`).
- 1:N com `Itens_Orcamento` (um Preparo pode estar em vários orçamentos).
- 1:N com `Itens_Evento_Confirmados` (fora do escopo pedido, mas referenciado para a regra de exclusão abaixo).
- **Regra de exclusão:** um Preparo só pode ser excluído se não estiver referenciado em `Itens_Orcamento` nem em `Itens_Evento_Confirmados` — isso é uma regra de **aplicação**, não uma FK com `ON DELETE RESTRICT` formalizada ainda (ver Lacuna 5).

---

## 2. `Insumos`

**Propósito core:** catálogo de matérias-primas com preço e fator de aproveitamento.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Nome | Texto curto | TEXT | NOT NULL |
| Unidade | Enum fechado: KG, Litro, Unidade, Maço | TEXT com CHECK, ou ENUM | NOT NULL |
| Preco | Preço já com margem interna embutida (10-15% acima do custo puro de fornecedor — confirmado com o Pedro, não é preço bruto) | NUMERIC(10,4) | nullable (alguns insumos "grátis", ex: água, têm preço vazio por decisão) |
| Fator de Correção | Fração aproveitável após limpeza/perda, 0 a 1 | NUMERIC(4,3) | nullable; **regra de aplicação:** se vazio OU igual a 0, tratar custo do insumo como R$0 (evita divisão por zero — decisão explícita) |
| Preço Corrigido | Campo derivado: Preco / Fator de Correção, com a regra de borda acima | NUMERIC(10,4), **coluna gerada (GENERATED ALWAYS AS ... STORED) ou calculada em runtime** — não decidido qual dos dois (ver Lacuna 6) | — |

**Relacionamentos:**
- 1:N com `Composição` (um Insumo pode ser usado em várias composições de preparos diferentes).

---

## 3. `Composição`

**Propósito core:** tabela de junção que define quanto de cada Insumo entra em cada Preparo.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Quantidade | Na mesma unidade comercial do Insumo referenciado (nunca convertida) | NUMERIC(10,4) | NOT NULL |
| Insumo | Referência ao insumo usado | INTEGER | FK → `Insumos.Id`, NOT NULL |
| Preparo | Referência ao preparo que usa este insumo | INTEGER | FK → `Preparos.Id`, NOT NULL |

**Relacionamentos:**
- N:1 com `Insumos` e N:1 com `Preparos` — juntas, formam a relação N:N clássica entre as duas tabelas.
- **Regra de deleção não formalizada:** ao excluir um Preparo (já elegível pra exclusão, ver regra acima), suas linhas de Composição deveriam ser removidas junto — candidato natural a `ON DELETE CASCADE` na FK de Preparo, mas isso nunca foi decidido explicitamente como constraint de banco (ver Lacuna 5).

---

## 4. `Macro_Categorias`

**Propósito core:** define o teto fisiológico de consumo por pessoa para cada grande grupo de cardápio — é o "orçamento" que o motor de dimensionamento distribui entre os pratos escolhidos.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Nome_Macro | Texto curto | TEXT | NOT NULL |
| Capacidade_Teto | Teto de consumo por pessoa | NUMERIC(8,2) | NOT NULL |
| Unidade | Enum fechado: g, ml | TEXT com CHECK, ou ENUM | NOT NULL |

**Valores atuais confirmados:** Proteínas Principais (400g), Carboidratos Densos (150g), Guarnições Leves (90g), Saladas Leves (30g), Saladas Pesadas (80g), Entradas e Petiscos (120g), Condimentos/Molhos (30ml), Bebidas S/Álcool (600ml), Sobremesas (100ml ou g conforme o preparo). Nota histórica: "Saladas Leves" reaproveita o registro Id 4, originalmente "Saladas" com teto único de 60g, renomeado — preservado para não quebrar vínculos existentes.

**Relacionamentos:**
- 1:N com `Headers_UI` (uma Macro_Categoria agrupa vários Headers_UI).

---

## 5. `Headers_UI`

**Propósito core:** controla o agrupamento visual exibido ao cliente/vendedor (ex: "Carnes Vermelhas", "Entradas Quentes"), sempre associado a uma Macro_Categoria que define seu teto fisiológico.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Nome_Exibicao | Texto curto, visível ao cliente final | TEXT | NOT NULL |
| Macro_Categoria | Referência à macro à qual este Header pertence | INTEGER | FK → `Macro_Categorias.Id`, NOT NULL |

**Relacionamentos:**
- N:1 com `Macro_Categorias`.
- N:N com `Preparos` — no NocoDB, essa relação é gerenciada por uma tabela de junção interna (prefixo `nc_`, estrutura não desenhada por nós). No schema nativo, precisa de uma tabela de junção própria (ex: `Header_Preparo` com `Header_UI_Id` + `Preparo_Id`, chave composta) — **ainda não desenhada** (ver Lacuna 7).

---

## 6. `Itens_Orcamento`

**Propósito core:** tabela de junção que define quais Preparos foram selecionados dentro de uma simulação/proposta de orçamento.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Orcamento | Referência ao orçamento | INTEGER | FK → `Orcamentos.Id`, NOT NULL |
| Preparo | Referência ao preparo selecionado | INTEGER | FK → `Preparos.Id`, NOT NULL |

**Decisão explícita e revisitada (mantida):** esta tabela **não armazena**
quantidade, porção nem Header_UI/categoria — tudo é resolvido
dinamicamente a cada cálculo (via `Preparo → Headers_UI → Macro_Categoria`
e via `Macro_Categorias.Capacidade_Teto` × `Peso_Atratividade`). Essa
decisão foi contestada uma vez (risco teórico de um Preparo pertencer a
múltiplos Headers) e reafirmada pelo Pedro, validando que, na prática do
negócio, os conjuntos de cardápio não se sobrepõem.

**Relacionamentos:**
- N:1 com `Orcamentos`, N:1 com `Preparos`.
- **Regra de deleção não formalizada:** ao excluir um Orçamento (hard
  delete, fluxo raro de manutenção), as linhas correspondentes aqui devem
  ser removidas — candidato a `ON DELETE CASCADE`. Hoje, sem essa
  constraint no banco, isso é feito por sequência controlada na aplicação
  (decisão registrada: o NocoDB não oferece cascade nativo para relações
  Link to Another Record). **No schema nativo em Postgres puro, isso deixa
  de ser uma limitação** — `ON DELETE CASCADE` real passa a ser possível e
  deveria ser adotado aqui, mas isso ainda não foi formalizado como
  decisão (ver Lacuna 5).

---

## 7. `Orcamentos`

**Propósito core:** representa uma simulação ou proposta comercial — pode
ou não estar vinculada a um Evento confirmado.

| Coluna | Tipo lógico decidido | Tipo físico (PROPOSTA) | Constraints |
|---|---|---|---|
| Id | Identificador único | INTEGER (SERIAL) | PK |
| Evento | Vínculo opcional — só preenchido quando o orçamento é aceito e vira evento real | INTEGER | FK → `Eventos.Id`, **nullable** |
| Empresa | Necessário mesmo sem Evento, define de qual cardápio puxar os Headers_UI | INTEGER | FK → `Empresas.Id`, NOT NULL |
| Cliente_Nome | Preenchido em simulações/leads antes de existir Evento formal | TEXT | nullable |
| Num_Convidados | Base de cálculo de porção × convidados | INTEGER | NOT NULL |
| Status | Enum fechado: Simulação, Enviado, Aceito, Recusado | TEXT com CHECK, ou ENUM | NOT NULL |
| Valor_Base_Por_Pessoa | Ver **Lacuna 1** — status deste campo é ambíguo frente a decisões posteriores | NUMERIC(10,2) | nullable |
| Desconto_Tipo | Enum: Percentual, Valor Fixo, Nenhum | TEXT com CHECK, ou ENUM | nullable |
| Desconto_Valor | Valor ou percentual do desconto, interpretado conforme Desconto_Tipo | NUMERIC(10,2) | nullable |
| Usar_Preco_Fixo_Modelo | Indica se a simulação mantém o preço fechado de um Cardápio Modelo | BOOLEAN | **sem DEFAULT true incondicional** — só true quando um Cardápio Modelo com preço fixo foi carregado (nunca true para template sem preço fixo) |
| Criado_Em | Timestamp automático | TIMESTAMP | NOT NULL, default now() |
| Atualizado_Em | Timestamp automático | TIMESTAMP | NOT NULL, atualizado a cada modificação |

**Relacionamentos:**
- N:1 com `Eventos` (opcional), N:1 com `Empresas`.
- 1:N com `Itens_Orcamento`.
- 1:N com `Orcamento_Itens_Adicionais` (fora do escopo pedido, mas parte do mesmo agregado financeiro).

---

## Lacunas e Incertezas — Explícitas, Não Preenchidas por Suposição

1. **`Orcamentos.Valor_Base_Por_Pessoa` tem status ambíguo.** Foi criado
   junto com a "Arquitetura Financeira do Orçamento" (receita = valor
   base manual × convidados). Depois disso, a decisão "Precificação por
   Cardápio Selecionado" mudou o modelo para o Valor Sugerido nascer
   **dinamicamente** do custo dos itens × 1,40 — não de um valor base
   inserido manualmente. As duas decisões nunca foram explicitamente
   reconciliadas nesta conversa: o campo continua existindo no schema, mas
   não está claro se ele ainda é usado (ex: como override manual do
   vendedor) ou se ficou órfão. **Precisa de decisão do Pedro antes da
   migração**, não vou presumir qual dos dois modelos prevalece.

2. **Tipo de chave primária não decidido formalmente.** Todo o histórico
   desta conversa referencia IDs como inteiros pequenos (ex: "Alcatra
   Grelhada, Id 12"). Proponho manter `INTEGER/SERIAL` no schema nativo
   (não migrar para UUID) para preservar os IDs existentes durante o ETL
   sem precisar de tabela de mapeamento — mas isso é proposta minha, não
   decisão formalizada com o Gemini ou o Pedro.

3. **Nenhuma coluna `UNIQUE` foi formalmente decidida** (ex: dois Insumos
   com o mesmo nome poderiam coexistir hoje, sem constraint que impeça).
   Não vou presumir onde `UNIQUE` deveria existir sem essa decisão.

4. **Obrigatoriedade de `Peso_Medio_Unidade_G` não está no nível do
   banco.** A decisão foi "o formulário deve EXIGIR o preenchimento" —
   isso é validação de **aplicação**, não uma constraint SQL (`CHECK`
   condicional cruzando com `Categoria`/`Unidade_Rendimento` de outra
   tabela via macro é possível em Postgres, mas complexo e nunca foi
   proposto). Fica registrado como texto, sem constraint de banco
   garantindo isso hoje.

5. **Nenhuma regra de `ON DELETE` foi formalizada como constraint de
   banco real.** Toda a lógica de "não pode excluir Preparo referenciado"
   e "excluir Orçamento deveria cascatear pros filhos" existe hoje como
   **regra de aplicação** (por causa da limitação do NocoDB, que não
   oferece FK real). A migração para Postgres nativo **abre a
   possibilidade real de usar `ON DELETE RESTRICT` e `ON DELETE CASCADE`
   de verdade** — mas isso é uma oportunidade identificada agora, não uma
   decisão já tomada com o Gemini.

6. **`Preço Corrigido` como coluna gerada vs. calculada em runtime** nunca
   foi discutido no nível de implementação física — hoje é uma fórmula do
   NocoDB (que tem seu próprio mecanismo de campo calculado). No Postgres
   nativo, a escolha entre `GENERATED ALWAYS AS ... STORED` e calcular na
   camada de aplicação/Drizzle é uma decisão de implementação em aberto.

7. **Tabela de junção nativa para `Headers_UI` ↔ `Preparos` não tem nome
   nem estrutura desenhada.** Hoje existe só como mecanismo interno do
   NocoDB. Precisa ser desenhada explicitamente durante o Passo 2 do
   plano de migração.

Nenhuma dessas 7 lacunas foi resolvida por suposição neste documento —
todas exigem uma decisão explícita (idealmente pelo mesmo processo de
consenso técnico já usado no projeto) antes do schema nativo ser
finalizado no Passo 2 da migração.
