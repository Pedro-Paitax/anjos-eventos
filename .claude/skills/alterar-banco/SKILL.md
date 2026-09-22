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
- `docs/REGRAS_NEGOCIO.md`
- `docs/DECISOES.md`

Quando necessário:

- `docs/BRIEFING.MD`

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

Toda alteração de ESTRUTURA (nova tabela, nova coluna, novo relacionamento)
deve ser feita através da interface/API do NocoDB, nunca via SQL direto
(ALTER TABLE, CREATE TABLE) no Postgres por trás dele — o NocoDB gerencia
suas próprias tabelas de junção para relacionamentos, e mudanças estruturais
feitas fora dele ficam invisíveis para a interface até uma sincronização manual,
podendo até colidir com o que o NocoDB já criou internamente.

Alterações de DADOS (inserir, atualizar, consultar registros) podem usar a
API REST do NocoDB (xc-token) diretamente — é assim que o backend do
Anjos Eventos já opera.

Acesso SQL direto ao Postgres é reservado para: leitura de diagnóstico
(SELECT), ou correções pontuais em ÚLTIMO caso, com confirmação explícita
do usuário antes de executar, e aviso claro de que a mudança pode não
refletir na interface do NocoDB até revisão manual.

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