---
name: alterar-banco
description: Procedimento seguro para analisar e alterar estruturas ou operações de banco de dados no Anjos Eventos.
---

# Skill — Alterar Banco

Use esta skill quando uma tarefa envolver PostgreSQL, NocoDB, tabelas, colunas, relacionamentos, queries ou estrutura de dados.

---

# Regra principal

Banco de dados contém dados reais.

Nunca alterar estrutura ou dados sem primeiro entender o impacto.

---

# 1. Consultar documentação

Leia:

- `docs/BANCO.md`
- `docs/schema-fisico-detalhado.md`
- `docs/REGRAS_NEGOCIO.md`
- `docs/DECISOES.md`

Quando necessário:

- `docs/BRIEFING.MD`
- `docs/ARQUITETURA.MD`

---

# 2. Verificar implementação

Procure no código:

- queries;
- tipos;
- repositories;
- services;
- APIs;
- componentes que utilizam os dados.

Determine quais partes dependem da estrutura que será alterada.

---

## 2.5. Camada de acesso correta

**Atualizado 2026-09-22** — o corte de produção NocoDB → PostgreSQL/Oracle
Cloud foi concluído (`docs/CHECKLIST_CORTE_PRODUCAO.md`,
`docs/DECISOES.md`). O fluxo abaixo descreve a regra pré-corte por
histórico; a regra vigente é a seguinte.

Toda alteração de ESTRUTURA (nova tabela, nova coluna, novo relacionamento)
deve ser feita via **Drizzle**: editar o schema em `src/db/schema/*.ts` e
gerar/aplicar a migration correspondente com `drizzle-kit` — nunca DDL
manual direto no Postgres sem migration versionada correspondente.

Alterações de DADOS (inserir, atualizar, consultar registros) usam o
Drizzle ORM através dos módulos em `src/lib/` (atrás da flag
`DATA_SOURCE=nocodb|oracle`, `src/lib/data-source.ts`).

O NocoDB é fonte legada, em janela de observação/rollback (Fase C, ver
`docs/CHECKLIST_CORTE_PRODUCAO.md`) — não escrever código novo que
assuma o NocoDB como fonte de verdade ou como caminho de alteração
estrutural.

Acesso SQL direto ao Postgres é reservado para: leitura de diagnóstico
(SELECT), ou correções pontuais em ÚLTIMO caso, com confirmação explícita
do usuário antes de executar.

**Regra histórica (pré-corte, mantida por contexto):** toda alteração de
estrutura era feita através da interface/API do NocoDB, nunca via SQL
direto no Postgres por trás dele — o NocoDB gerenciava suas próprias
tabelas de junção para relacionamentos, e mudanças estruturais feitas
fora dele ficavam invisíveis até sincronização manual.

# 3. Verificar banco real

Quando houver acesso ao banco:

- consultar schema;
- confirmar tabela;
- confirmar coluna;
- confirmar tipo;
- confirmar relacionamentos;
- verificar constraints.

Não confiar cegamente na documentação.

---

# 4. Classificar alteração

Classifique a mudança como:

### Não destrutiva

Exemplos:

- adicionar tabela;
- adicionar coluna nullable;
- adicionar índice.

### Potencialmente destrutiva

Exemplos:

- remover coluna;
- alterar tipo;
- remover tabela;
- apagar dados;
- modificar valores históricos.

Alterações potencialmente destrutivas exigem explicação explícita antes da execução.

---

# 5. Histórico

Nunca modificar dados históricos de eventos confirmados sem autorização explícita.

Snapshots devem continuar representando o estado existente no momento da confirmação.

---

# 6. Implementação

Preferir alterações:

- pequenas;
- reversíveis quando possível;
- fáceis de entender;
- documentadas.

Não criar abstrações de migração complexas sem necessidade.

---

# 7. Validação

Após a alteração:

- verificar schema;
- executar queries de validação;
- verificar aplicação;
- executar lint/build/testes quando aplicável.

---

# 8. Relatório

Informar:

- alteração realizada;
- tabelas/colunas afetadas;
- impacto;
- validações;
- possíveis pendências.