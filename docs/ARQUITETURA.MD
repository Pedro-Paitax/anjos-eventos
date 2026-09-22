# Arquitetura — Anjos Eventos

## Visão geral

O Anjos Eventos é um sistema interno para centralizar a operação de três empresas do grupo:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

O sistema deve priorizar simplicidade, confiabilidade e baixa manutenção.

O responsável técnico possui experiência profissional em engenharia de dados, mas disponibilidade limitada para manutenção contínua. Portanto, soluções excessivamente sofisticadas devem ser evitadas quando uma solução simples atende ao problema.

---

## Stack principal

### Aplicação

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Drizzle ORM (acesso ao PostgreSQL)
- Vitest (testes)

### Banco de dados

- **PostgreSQL é o banco central.** Acesso via Drizzle ORM, direto — não passa mais por NocoDB no caminho de produção.
- **NocoDB**: fonte legada, em processo de descomissionamento. Ver "Migração NocoDB → PostgreSQL" abaixo.

### Infraestrutura

> **Atualização 2026-09-22 — corte de produção concluído.** A infraestrutura abaixo é a real, não mais a doméstica/Docker descrita em versões anteriores deste documento.

- **Produção**: VPS Oracle Cloud (Oracle Linux 9, ARM Ampere — identidade do provedor verificada via SSH/metadata OCI, decisão em `docs/plano-migracao-postgres-vultr.md`). Aplicação roda via **PM2** (`ecosystem.config.js`, não versionado — contém segredos), **sem Docker em produção** (servidor não tinha Docker instalado no momento do corte).
- **Acesso remoto**: Tailscale (rede privada entre app, banco e operador). O app roda HTTP puro sobre essa rede — não há TLS/HTTPS de borda; é uma decisão consciente dado o perímetro de rede privada.
- **Desenvolvimento local**: `docker-compose.yml` + `Dockerfile` continuam válidos, mas hoje servem só para subir um PostgreSQL local de desenvolvimento (porta 5433, ver `.env.example`) — não são o caminho de deploy real.
- **Backup**: `pg_dump` diário do Oracle → Google Drive via `rclone` (`scripts/backup-pg-oracle.sh`), cron no host "ender". Sem criptografia e com credencial em processo — decisões conscientes, registradas em `docs/DECISOES.md`/`docs/PENDENCIAS_NOTURNAS.md`.
- **Deploy**: `scripts/deploy-oracle.sh` — build local isolado, empacota standalone, transfere e reinicia via PM2, com smoke test.

---

## Migração NocoDB → PostgreSQL (contexto)

O sistema começou com **NocoDB como interface administrativa sobre um PostgreSQL local**, com o backend consumindo a API REST do NocoDB para o domínio de catálogo (Preparos, Insumos, Composição, Cardápios Modelo, Hierarquia de Proteínas, Configurações Globais).

Essa arquitetura foi **substituída** (`docs/DECISOES.md`, "Banco central") pelo ADR em `docs/plano-migracao-postgres-vultr.md`: acesso direto via Drizzle ORM contra PostgreSQL puro, sem NocoDB. A migração usou uma flag de aplicação, `DATA_SOURCE=nocodb|oracle` (`src/lib/data-source.ts`), permitindo os dois caminhos coexistirem durante a transição.

**Estado em 2026-09-22** (`docs/CHECKLIST_CORTE_PRODUCAO.md`): corte de produção concluído — produção roda com `DATA_SOURCE=oracle`. NocoDB e o Postgres local ("ender") continuam ligados como janela de observação/rollback (Fase C, em andamento) — não é uma dependência de produção, é rede de segurança temporária. Em desenvolvimento local, o default da flag continua `"nocodb"` até o Postgres de dev ter os mesmos dados carregados.

Nenhum código novo deve ser escrito assumindo coexistência com o NocoDB a partir de agora (`docs/DECISOES.md`).

---

## Estrutura conceitual

```text
Cliente
   |
   v
Next.js (App Router)
   |
   +-------------------------+
   |                         |
   v                         v
Server Actions / API Routes   |
   |                         |
   v                         v
Regras de negócio (src/lib)  |
   |                         |
   v                         v
Drizzle ORM  <-- DATA_SOURCE flag --> cliente NocoDB (legado, em desativação)
   |
   v
PostgreSQL (Oracle Cloud, produção)
```

---

## Autenticação

Sem senha. `/login` lista usuários cadastrados; o usuário se identifica clicando no próprio nome. Cookie `usuario_atual` httpOnly, `secure: false` (deliberado — HTTP puro sobre Tailscale). Sem middleware global de proteção de rota — cada Server Action/página decide via `obterUsuarioAtual()` (`src/lib/usuario-atual.ts`). O endpoint público do simulador de orçamento é intencionalmente sem autenticação, protegido só por rate limit (`src/lib/rate-limit.ts`).

---

## Rotas e APIs (visão geral)

- **Páginas** (`src/app/`): agenda (`/agenda`), preparos (`/preparos`), cardápios modelo (`/cardapios-modelo`), simulador público (`/simulador-cardapio`), login.
- **Server Actions** (`src/app/actions/`): `evento.ts`, `preparo.ts`, `cardapio-modelo.ts`, `precificacao.ts`, `usuario.ts`.
- **API Routes** (`src/app/api/`): custo de preparo, dimensionamento/margem/simulador de orçamento, revalidação de cache (`/api/revalidate`, protegida por `REVALIDATE_SECRET`), proxy de leitura NocoDB (`/api/nocodb/preparos`).

Ver `docs/REGRAS_NEGOCIO.md` para os contratos e regras de cada motor exposto por essas rotas.
