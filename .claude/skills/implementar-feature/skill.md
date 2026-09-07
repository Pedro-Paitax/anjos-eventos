---
name: implementar-feature
description: Procedimento padrão para implementar novas funcionalidades no Anjos Eventos com análise prévia, respeito às regras de negócio e validação final.
---

# Skill — Implementar Feature

Use este procedimento quando uma tarefa envolver a criação ou alteração significativa de uma funcionalidade do Anjos Eventos.

---

# Objetivo

Implementar funcionalidades de forma previsível, simples e compatível com a arquitetura existente.

---

# ETAPA 1 — Entender

Antes de escrever código:

1. Leia o pedido completo.
2. Identifique qual módulo será afetado.
3. Identifique quais regras de negócio estão envolvidas.
4. Identifique possíveis impactos em banco, backend e frontend.

Não começar codificando imediatamente em tarefas médias ou grandes.

---

# ETAPA 2 — Pesquisar

Inspecione o projeto.

Procure:

- componentes existentes;
- funções existentes;
- APIs existentes;
- tipos existentes;
- queries existentes;
- tabelas relacionadas;
- validações existentes;
- testes existentes.

Prefira reutilizar código existente quando apropriado.

Não criar uma segunda implementação de algo que já existe.

---

# ETAPA 3 — Documentação

Consulte:

- `CLAUDE.md`
- `docs/BRIEFING.MD`
- `docs/ARQUITETURA.MD`
- `docs/BANCO.md`
- `docs/REGRAS_NEGOCIO.md`
- `docs/DECISOES.md`

Leia apenas os documentos relevantes para a tarefa quando o escopo for pequeno.

---

# ETAPA 4 — Verificar estado atual

Determine:

- o que já existe;
- o que está parcialmente implementado;
- o que não existe;
- quais partes podem ser reutilizadas.

Não confundir documentação com implementação.

---

# ETAPA 5 — Plano

Para tarefas médias ou grandes, antes de implementar apresente um plano curto contendo:

1. arquivos que serão alterados;
2. arquivos que serão criados;
3. lógica que será implementada;
4. impactos no banco;
5. validações que serão executadas.

Não fazer alterações destrutivas sem explicar o impacto.

---

# ETAPA 6 — Implementação

Durante a implementação:

- seguir a arquitetura existente;
- seguir as regras de negócio;
- evitar engenharia excessiva;
- reutilizar abstrações existentes;
- manter TypeScript tipado;
- evitar duplicação;
- não introduzir dependências sem necessidade.

---

# ETAPA 7 — Banco

Se a feature envolver banco:

1. consultar `docs/BANCO.md`;
2. verificar o schema existente;
3. verificar relacionamentos;
4. verificar se a alteração é realmente necessária;
5. preservar dados históricos.

Nunca assumir que uma tabela existe apenas porque aparece na documentação.

---

# ETAPA 8 — Validação

Depois de implementar, executar as validações apropriadas.

Quando disponíveis:

- TypeScript;
- ESLint;
- testes;
- build;
- validação manual.

Não afirmar que algo foi testado sem executar o teste.

---

# ETAPA 9 — Revisão

Antes de concluir:

- revisar os arquivos alterados;
- procurar erros óbvios;
- verificar se a implementação respeita as regras de negócio;
- verificar se não foram introduzidas alterações desnecessárias.

---

# ETAPA 10 — Relatório

Ao finalizar, informar:

### Implementado

O que foi feito.

### Arquivos

Arquivos criados ou modificados.

### Validação

Comandos executados e respectivos resultados.

### Pendências

Problemas ou decisões que ainda dependem de confirmação.

---

# Regra fundamental

Se durante a implementação surgir uma decisão de negócio que não está documentada:

NÃO INVENTAR.

Registrar a dúvida e solicitar confirmação quando ela for necessária para continuar corretamente.