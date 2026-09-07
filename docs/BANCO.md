# Banco de Dados — Anjos Eventos

## Banco principal

O banco de dados central do sistema é PostgreSQL.

O NocoDB funciona como interface administrativa sobre o PostgreSQL.

Antes de alterar estruturas ou operações relacionadas ao banco, o agente deve verificar o schema existente.

---

# Tabelas principais

## Empresas

| Campo | Tipo |
|---|---|
| Nome | Single line text |

---

## Eventos

| Campo | Tipo |
|---|---|
| Empresa | Link → Empresas |
| Cliente | Single line text |
| Data_Evento | Date |
| Tipo_Evento | Single line text |
| Num_Convidados | Number |
| Status | Single select |
| Veiculo | Single select |
| Observacoes | Long text |
| Caminho_Contrato | Single line text |
| Valor_Base_Por_Pessoa_Fechado | Decimal |
| Desconto_Tipo | Single select |
| Desconto_Valor | Decimal |
| Valor_Total_Fechado | Decimal |

Status:

- Orçado
- Confirmado
- Realizado
- Cancelado

Veículos:

- Master
- Kombi Nova
- Kombi Velha
- Não se aplica

---

## Preparos

| Campo | Tipo |
|---|---|
| Nome Do Preparo | Single line text |
| Categoria | Single select |
| Rendimento | Number |
| Unidade_Rendimento | Single select |
| Apresentação/Utensílio | Single line text |
| Tags | Multi select |
| Modo de Preparo | Long text |
| Tempo_Preparo | Number |
| Peso_Atratividade | Number |
| Subcategoria_Proteina | Single select |
| Porcao_Maxima_Individual | Decimal |
| Peso_Medio_Unidade_G | Decimal |

Categorias:

- Entrada
- Guarnições
- Molhos
- Carnes
- Saladas
- Bebidas
- Sobremesa

Unidades de rendimento:

- ML
- Unidade
- G

---

## Insumos

| Campo | Tipo |
|---|---|
| Nome | Single line text |
| Unidade | Single select |
| Preco | Decimal |
| Fator de Correção | Decimal |
| Preço Corrigido | Formula |

Fórmula:

```text
Preco / Fator de Correção
Regra de borda:

Se o fator de correção for 0 ou o preço estiver vazio, o custo deve ser tratado como R$0 para evitar divisão por zero.

Composição
Campo	Tipo
Quantidade	Decimal
Insumo	Link → Insumos
Preparo	Link → Preparos
Hierarquia_Proteina

Tabela de referência fixa.

Subcategoria	Peso_Padrao
Carne Vermelha	1,5
Ovino	1,3
Suíno	1,1
Peixe	0,9
Aves	0,7
Macro_Categorias
Campo	Tipo
Nome_Macro	Single line text
Capacidade_Teto	Number
Unidade	Single select

Unidade:

g
ml
Headers_UI
Campo	Tipo
Nome_Exibicao	Single line text
Macro_Categoria	Link → Macro_Categorias

Existe relação muitos-para-muitos com Preparos.

Regra de segurança

Antes de:

criar tabela;
remover tabela;
alterar coluna;
alterar relacionamento;
alterar tipo de campo;
alterar fórmula;

o agente deve verificar o schema atual e a documentação.

Nunca assumir que a documentação está mais atualizada que o banco sem verificar.

Histórico

Quando um orçamento é confirmado como evento, determinadas informações devem ser congeladas para preservar o histórico.

Itens_Evento_Confirmados possui:

Quantidade_Confirmada
Custo_Unitario_Snapshot

Esses valores representam o estado confirmado do evento e não devem ser recalculados retroativamente por alterações futuras nos preços.