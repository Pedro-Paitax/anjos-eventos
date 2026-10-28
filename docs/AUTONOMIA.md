# Autonomia do Claude Code (deploy e rotina)

Objetivo: o Pedro gasta o mínimo de esforço. O Claude Code faz sozinho o que é
**reversível**; o que não é reversível, ou atinge terceiros, **exige confirmação**.
Mudança de código segue o fluxo normal do `CLAUDE.md`.

## O que o Claude Code faz sozinho

- **Deploy do app** com `scripts/deploy-oracle.sh` (procedimento abaixo).
- **Rollback**: automático no script se o smoke falhar; manual, se preciso, com o
  backup do bundle que o script informa.
- **Migração aditiva** (nova tabela, nova coluna nula/com default, novo índice) com
  `pg_dump` validado antes — ver a **ressalva** abaixo.
- **Builds, lint, testes, typegen** (no `ender`, a partir de `git archive`).
- **Backups**: `pg_dump -Fc` validado (`pg_restore --list`) antes de qualquer
  mudança no banco; backup do bundle no deploy.
- **Limpeza do que ele mesmo criou** (scripts pontuais, dumps temporários, pastas
  de build em `/tmp`). Nunca apaga o que não criou.
- Commit e push **da branch de trabalho**.

> **Ressalva — migração e a skill `alterar-banco`.** A seção 2.6 de
> `.claude/skills/alterar-banco/SKILL.md` (adicionada após o incidente da
> migração 0002, ver `docs/DECISOES.md`) exige parar e mostrar o SQL ao Pedro
> antes de aplicar qualquer migração em produção, **sem exceção**. Isto conflita
> com a autonomia acima. Enquanto a seção 2.6 não for alterada pelo Pedro, ela
> prevalece: o Claude Code **mostra o SQL e espera** antes de aplicar.

## O que EXIGE confirmação do Pedro

- Apagar dado de produção (`DELETE`, `TRUNCATE`, `DROP`, `UPDATE` em massa) ou
  migração destrutiva/que reescreve dado.
- Enviar mensagem a terceiros (WhatsApp, e-mail etc.). Teste de envio só para o
  número do próprio Pedro.
- Trocar a senha do banco ou qualquer segredo de produção.
- Merge na `master`.
- Escanear o QR do WhatsApp (conectar o número).
- Mudar autenticação (login, sessão, `SMOKE_TOKEN`, `api-auth`).
- Ler `~/.anjos/**` (negado em `.claude/settings.json`; só o script lê).

## Segredo do smoke

`scripts/deploy-oracle.sh` usa `SMOKE_TOKEN` do ambiente ou, se ausente, de
`~/.anjos/smoke-token` (mínimo 32 caracteres; o script nunca imprime nem loga o
valor). Permissão: `chmod 600` em Linux/Mac; no Git Bash do Windows o `chmod`
não tem efeito, então o script confere a ACL do NTFS e recusa o arquivo se
"Todos", "Usuários" ou "Usuários Autenticados" tiverem acesso. O mesmo valor
precisa estar no `ecosystem.config.js` do Oracle (o script nunca o toca).

## Procedimento padrão: deploy

1. Tudo commitado (o deploy usa `HEAD`, nunca o working tree); verificador
   completo verde (typegen, tsc, eslint, vitest) e build no `ender`.
2. `scripts/deploy-oracle.sh`. Ele faz, nesta ordem: `pg_dump` validado e
   contagem antes (aborta se falhar) → carrega o `SMOKE_TOKEN` → build isolado no
   `ender` → transferência → backup do bundle no Oracle → extração →
   `pm2 startOrRestart ecosystem.config.js` (**nunca** `--update-env`) → smoke →
   contagem depois.
3. Smoke inclui: APIs 401 sem sessão e valor de referência com token, `/login`
   200 (localhost e IP Tailscale), páginas protegidas sem conteúdo, rotas da lista
   de compras (página protegida; `/pdf` 401 sem sessão) e `HOSTNAME=0.0.0.0`
   (`pm2 env` + socket em escuta na 3001).
4. Smoke falhou → o script restaura o backup, reinicia, confirma `/login` 200 por
   localhost e IP Tailscale e sai com erro. O Claude Code informa o que fez.
   Migrações aditivas não são revertidas (o app anterior as ignora).
5. `SOMENTE_PROTECAO=1 scripts/deploy-oracle.sh` roda só dump + contagens.
6. `SEM_SMOKE=1 scripts/deploy-oracle.sh` (autorizado pelo Pedro em 2026-10-28,
   enquanto `~/.anjos/smoke-token` não existe): não carrega o token e troca o
   smoke completo por `/login` 200 (localhost e IP Tailscale) + socket em
   `0.0.0.0:3001`, com o mesmo rollback automático. Não prova APIs nem páginas
   protegidas; usar só com autorização do Pedro.

## Procedimento padrão: migração aditiva

1. Alterar o schema em `src/db/schema/*.ts`; `drizzle-kit generate`; ler o SQL.
   Só vale como "aditiva" se for apenas `CREATE`/`ADD COLUMN` (nula ou com
   default) — qualquer outra coisa exige confirmação.
2. Ver ressalva acima: mostrar o SQL ao Pedro enquanto a skill exigir.
3. Estado antes (somente leitura): colunas esperadas da migração anterior e
   contagens das tabelas afetadas.
4. `pg_dump -Fc` em `~/backups-anjos-eventos/pre-NNNN-<data>.dump`; validar com
   `pg_restore --list` (tamanho > 1 KB e entradas `TABLE DATA`). Sem dump válido,
   não aplica.
5. Aplicar em **transação única** (script pontual com `pg`); `COMMIT` só sem erro.
6. Estado depois: coluna presente, contagens iguais, nenhum dado alterado.
7. Registrar em `docs/DECISOES.md` e `docs/PENDENCIAS_NOTURNAS.md`; apagar o
   script pontual.
8. A migração vai **antes** do deploy do app que a usa.
