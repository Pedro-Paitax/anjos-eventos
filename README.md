# Anjos Eventos

Sistema interno de gestão de eventos, cardápios e orçamentos para três empresas do grupo:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

Stack: Next.js (App Router) + TypeScript + Drizzle ORM + PostgreSQL.

## Documentação

A documentação do projeto vive em `docs/`. Comece por `docs/INDEX.md` — ele indica quais documentos são canônicos (fonte de verdade de arquitetura, banco e regras de negócio) e quais são material histórico.

Regras de operação do agente (Claude Code) estão em `CLAUDE.md`.

## Rodando localmente

```bash
npm install
npm run dev
```

Variáveis de ambiente: ver `.env.example`.

Testes:

```bash
npx vitest run
```
