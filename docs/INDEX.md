# Índice da documentação — Anjos Eventos

Este documento é a fonte única para saber qual documentação em `docs/` é válida como referência de regra/arquitetura/schema, e qual é material histórico que não deve ser tratado como fonte de verdade.

---

## Documentação canônica

### `docs/BRIEFING.MD`
- **Finalidade:** contexto integral do projeto — negócio, arquitetura, schema de dados e regras de cálculo já fechadas (v2, pós-consenso técnico).
- **Quando consultar:** para entender o panorama geral do sistema antes de qualquer alteração significativa, ou quando precisar do racional por trás de uma decisão (o "porquê").
- **Status:** CANÔNICO.

### `docs/ARQUITETURA.MD`
- **Finalidade:** visão geral de arquitetura — stack da aplicação, banco de dados, infraestrutura (Debian/Docker/Tailscale) e estrutura conceitual do sistema.
- **Quando consultar:** ao tomar decisões de arquitetura, infraestrutura ou stack técnica.
- **Status:** CANÔNICO.

### `docs/BANCO.md`
- **Finalidade:** referência do schema de dados (tabelas, campos, tipos, relacionamentos, fórmulas, regras de histórico/snapshot).
- **Quando consultar:** antes de qualquer alteração de banco ou código que dependa da estrutura de dados. O estado documentado aqui deve ser confirmado contra o PostgreSQL real (via MCP, quando houver acesso) antes de afirmações definitivas sobre schema.
- **Status:** CANÔNICO.

### `docs/REGRAS_NEGOCIO.md`
- **Finalidade:** regras de negócio já validadas (motor de custo, motor de dimensionamento, hierarquia de proteínas, Hard Cap, logística, financeiro).
- **Quando consultar:** antes de implementar ou alterar qualquer lógica de negócio. É a referência oficial para regras já aprovadas.
- **Status:** CANÔNICO.

### `docs/DECISOES.md`
- **Finalidade:** registro de decisões técnicas e de negócio, com status individual (`APROVADA`, `PENDENTE`, `IMPLEMENTADA`, `VALIDADA`, `DESCARTADA`), incluindo pendências conhecidas (ex.: capacidade das Kombis) e divergências identificadas entre documentação e código/schema (ex.: nomenclatura de veículos).
- **Quando consultar:** para verificar se uma decisão específica já foi tomada, está pendente, ou foi descartada — e para checar se uma divergência já é conhecida antes de reportá-la como nova.
- **Status:** CANÔNICO.

---

## Documentação histórica/rascunhos

### `docs/documentacao-tecnica-sistema-eventos.md`
- **Motivo:** é uma versão anterior da especificação do sistema. Descreve um schema (`empresas`, `eventos`, `contratos`, `usuarios`, login sem senha, upload/extração de PDF de contrato) que diverge do schema atual documentado em `docs/BANCO.md` (que não possui tabelas `contratos`/`usuarios`, nem prevê login, e já inclui motor de custo, dimensionamento e fichas técnicas ausentes deste documento). O próprio `docs/BRIEFING.MD` se identifica como "v2, pós-consenso técnico", ou seja, uma revisão posterior a este documento.
- **Status:** HISTÓRICO — não usar como fonte de regra, schema ou arquitetura.

### `docs/doc-tecnica.md`
- **Motivo:** não é documentação de regras — é um prompt de instrução avulso ("Leia o arquivo `documentacao-tecnica-sistema-eventos.md` e use como especificação... Nesta primeira etapa, quero APENAS..."), usado para gerar o scaffolding inicial do projeto. Referencia o documento histórico acima, não o conjunto canônico atual.
- **Status:** HISTÓRICO — não usar como fonte de regra, schema ou arquitetura.

---

## Hierarquia das fontes

1. Regras de negócio aprovadas devem ser obtidas de `docs/REGRAS_NEGOCIO.md`.
2. Decisões de negócio devem ser verificadas em `docs/DECISOES.md`.
3. Estrutura/documentação técnica deve ser consultada em `docs/ARQUITETURA.MD`.
4. Estrutura do banco deve ser consultada em `docs/BANCO.md`, mas o estado real do PostgreSQL deve ser confirmado pelo MCP quando houver acesso.
5. `docs/BRIEFING.MD` fornece o contexto geral do sistema.

Em caso de divergência entre um documento histórico e um documento canônico, prevalece o documento canônico. Divergências entre documentos canônicos, ou entre documentação canônica e o código/banco reais, não devem ser resolvidas silenciosamente — devem ser reportadas (ver `docs/DECISOES.md` para divergências já conhecidas).
