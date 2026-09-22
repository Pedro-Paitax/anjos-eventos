# Índice da documentação — Anjos Eventos

Este documento é a fonte única para saber qual documentação em `docs/` é válida como referência de regra/arquitetura/schema, e qual é material histórico que não deve ser tratado como fonte de verdade.

---

## Documentação canônica

### `docs/BRIEFING.MD`
- **Finalidade:** contexto integral do projeto — negócio, arquitetura, schema de dados e regras de cálculo já fechadas (v2, pós-consenso técnico).
- **Quando consultar:** para entender o panorama geral do sistema antes de qualquer alteração significativa, ou quando precisar do racional por trás de uma decisão (o "porquê").
- **Status:** CANÔNICO. **Ressalva (2026-09-22):** este documento antecede o corte de produção NocoDB → Postgres/Oracle Cloud — para arquitetura/infra atual, `docs/ARQUITETURA.MD` prevalece; para schema atual, `docs/BANCO.md` prevalece.

### `docs/ARQUITETURA.MD`
- **Finalidade:** visão geral de arquitetura — stack da aplicação, banco de dados, infraestrutura (Oracle Cloud/PM2, produção; Docker, dev local) e estrutura conceitual do sistema.
- **Quando consultar:** ao tomar decisões de arquitetura, infraestrutura ou stack técnica.
- **Status:** CANÔNICO.

### `docs/BANCO.md`
- **Finalidade:** referência do schema de dados real (Drizzle/PostgreSQL) — tabelas, colunas, tipos, relacionamentos, regras de ON DELETE.
- **Quando consultar:** antes de qualquer alteração de banco ou código que dependa da estrutura de dados. O estado documentado aqui deve ser confirmado contra o PostgreSQL real (via MCP, quando houver acesso) antes de afirmações definitivas sobre schema.
- **Status:** CANÔNICO.

### `docs/schema-fisico-detalhado.md`
- **Finalidade:** racional de design de cada tabela do catálogo/orçamento — por que cada tipo/constraint foi escolhido, lacunas identificadas durante o desenho (algumas ainda em aberto, outras já resolvidas no schema Drizzle final). Complementar a `docs/BANCO.md`: BANCO.md documenta o schema como ele é hoje, este documento explica por que ele ficou assim.
- **Quando consultar:** ao propor uma alteração de schema, para entender decisões de tipo físico e constraints já tomadas (e as que ainda não foram).
- **Status:** CANÔNICO.

### `docs/REGRAS_NEGOCIO.md`
- **Finalidade:** regras de negócio já validadas (motor de custo, motor de dimensionamento, hierarquia de proteínas, Hard Cap, precificação por cardápio, pacotes fixos, financeiro).
- **Quando consultar:** antes de implementar ou alterar qualquer lógica de negócio. É a referência oficial para regras já aprovadas.
- **Status:** CANÔNICO.

### `docs/DECISOES.md`
- **Finalidade:** registro de decisões técnicas e de negócio, com status individual (`APROVADA`, `PENDENTE`, `IMPLEMENTADA`, `VALIDADA`, `DESCARTADA`), incluindo pendências conhecidas e divergências identificadas entre documentação e código/schema.
- **Quando consultar:** para verificar se uma decisão específica já foi tomada, está pendente, ou foi descartada — e para checar se uma divergência já é conhecida antes de reportá-la como nova.
- **Status:** CANÔNICO.

---

## Documentação de contexto/histórico do corte de produção

### `docs/plano-migracao-postgres-vultr.md`
- **Finalidade:** ADR da migração de infraestrutura (NocoDB → Postgres direto, avaliação Vultr vs. Oracle Cloud, decisão final Oracle). Nome do arquivo ficou desatualizado (decisão final foi Oracle, não Vultr) mas o conteúdo já deixa isso claro.
- **Ressalva:** a linha de status no topo do documento ("execução em andamento... schema e migração de dado ainda pendentes") está **desatualizada** — o corte já foi concluído em 2026-09-22. Para status de execução, ver `docs/CHECKLIST_CORTE_PRODUCAO.md` e a seção "Corte de Produção NocoDB → Oracle Cloud" em `docs/DECISOES.md`.
- **Status:** CANÔNICO como registro do racional da decisão de infraestrutura; não canônico como fonte de status de execução.

### `docs/CHECKLIST_CORTE_PRODUCAO.md` e `docs/PENDENCIAS_NOTURNAS.md`
- **Finalidade:** logs históricos, cronológicos, de sessões de trabalho passadas — incluindo a execução do corte de produção.
- **Status:** LOG HISTÓRICO. Não reescrever, reorganizar nem tratar como documentação de referência viva — mas são a melhor fonte de evidência para reconstruir o que de fato aconteceu e o que ainda está pendente na migração (ex.: Fase C de observação, ainda em andamento).

### `docs/referencia-cardapios-comerciais.md`
- **Finalidade:** dado-fonte extraído manualmente de planilha comercial real (`Cardápio_2025_2.xlsx`), usado para embasar a decisão "Motor de Pacotes Fixos e Tolerância de Substituição" (`docs/DECISOES.md`).
- **Status:** REFERÊNCIA — dado de apoio, não regra de negócio em si (a regra está em `docs/REGRAS_NEGOCIO.md`/`docs/DECISOES.md`).

---

## Documentação histórica/rascunhos

### `docs/documentacao-tecnica-sistema-eventos.md`
- **Motivo:** é uma versão anterior da especificação do sistema. Descreve um schema (`empresas`, `eventos`, `contratos`, `usuarios`, login sem senha, upload/extração de PDF de contrato) que diverge do schema atual documentado em `docs/BANCO.md`. O próprio `docs/BRIEFING.MD` se identifica como "v2, pós-consenso técnico", ou seja, uma revisão posterior a este documento.
- **Status:** HISTÓRICO — não usar como fonte de regra, schema ou arquitetura.

### `docs/doc-tecnica.md`
- **Motivo:** não é documentação de regras — é um prompt de instrução avulso usado para gerar o scaffolding inicial do projeto. Referencia o documento histórico acima, não o conjunto canônico atual.
- **Status:** HISTÓRICO — não usar como fonte de regra, schema ou arquitetura.

---

## Hierarquia das fontes

1. Regras de negócio aprovadas devem ser obtidas de `docs/REGRAS_NEGOCIO.md`.
2. Decisões de negócio devem ser verificadas em `docs/DECISOES.md`.
3. Estrutura/documentação técnica deve ser consultada em `docs/ARQUITETURA.MD`.
4. Estrutura do banco deve ser consultada em `docs/BANCO.md` (racional de design em `docs/schema-fisico-detalhado.md`), mas o estado real do PostgreSQL deve ser confirmado via MCP quando houver acesso.
5. `docs/BRIEFING.MD` fornece o contexto geral do sistema.
6. Para status de execução da migração NocoDB → Postgres/Oracle Cloud, `docs/CHECKLIST_CORTE_PRODUCAO.md` prevalece sobre `docs/plano-migracao-postgres-vultr.md`.

Em caso de divergência entre um documento histórico e um documento canônico, prevalece o documento canônico. Divergências entre documentos canônicos, ou entre documentação canônica e o código/banco reais, não devem ser resolvidas silenciosamente — devem ser reportadas (ver `docs/DECISOES.md` para divergências já conhecidas).
