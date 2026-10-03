#!/usr/bin/env bash
# Deploy de comando único pro Oracle VPS (docs/CHECKLIST_CORTE_PRODUCAO.md,
# Fase B passo 8) — automatiza o que era feito manualmente na Lote 4:
#
#   1. build isolado no "ender" a partir de `git archive HEAD` (nunca do
#      working tree — mudanças não commitadas NÃO entram no deploy);
#   2. empacota .next/standalone (+ public/ + .next/static);
#   3. transfere ender -> esta máquina -> Oracle (ender não alcança o
#      Oracle direto via Tailscale nesta rede, só esta máquina alcança
#      os dois lados);
#   4. no Oracle: guarda backup do bundle atual (rollback), extrai o
#      novo por cima (preserva ecosystem.config.js, nunca sobrescrito
#      aqui — tem segredos), `pm2 restart` + `pm2 save`;
#   5. smoke test básico (endpoint de custo + página protegida).
#
# Proteção de dados (antes de QUALQUER mudança): pg_dump -Fc validado do banco
# do Oracle (segunda camada, além do backup diário via cron) + contagem
# SOMENTE LEITURA de eventos/orçamentos antes e depois, impressa no log. Se o
# dump falhar, o deploy aborta. A contagem nunca bloqueia, só deixa rastro.
# SOMENTE_PROTECAO=1 roda só essa etapa (dump + contagens) e sai, sem deploy.
#
# Uso: scripts/deploy-oracle.sh
#
# Não sobe segredos novos, não muda DATA_SOURCE/DATABASE_URL/NOCODB_API_TOKEN
# — isso já está fixado em ~/anjos-eventos-app/ecosystem.config.js no
# Oracle e este script nunca toca nesse arquivo.
set -euo pipefail

ENDER_HOST="ender"
ENDER_REPO="/srv/share/anjos_eventos"
ENDER_BUILD_DIR='$HOME/.deploy-anjos-eventos'
ORACLE_HOST="opc@100.121.229.81"
ORACLE_APP_DIR="anjos-eventos-app"
SSH_OPTS=(-o ConnectTimeout=10 -o BatchMode=yes)

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

IP_ORACLE_DB="100.121.229.81"
DIR_BACKUP_DEPLOY="${BACKUP_DIR_LOCAL:-$HOME/backups-anjos-eventos}/pre-deploy"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")"

# Contagem somente leitura (nenhum INSERT/UPDATE/DELETE). Uma linha por chamada.
contagem_banco() {
  psql "$DATABASE_URL" -Atq -c "SELECT 'eventos=' || (SELECT count(*) FROM eventos) || ' orcamentos=' || (SELECT count(*) FROM orcamentos) || ' itens_evento_confirmados=' || (SELECT count(*) FROM itens_evento_confirmados)"
}

log "Verificando estado do repositório (fonte do deploy é sempre HEAD, nunca working tree)"
COMMIT=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
echo "Commit que será deployado: $COMMIT_SHORT ($COMMIT)"
DIRTY=$(git status --porcelain -- src app lib 2>/dev/null || true)
if [ -n "$DIRTY" ]; then
  echo "AVISO: há mudanças não commitadas em src/ (não entram neste deploy):"
  echo "$DIRTY"
  echo "Se essas mudanças deveriam ir junto, faça o commit antes de rodar este script de novo."
fi

log "0/5 — Proteção de dados: pg_dump + contagem ANTES (somente leitura)"
[ -n "$DATABASE_URL" ] || { echo "ERRO: DATABASE_URL ausente em .env — deploy abortado."; exit 1; }
case "$DATABASE_URL" in
  *"$IP_ORACLE_DB"*) ;;
  *) echo "ERRO: DATABASE_URL não aponta para o Oracle ($IP_ORACLE_DB) — deploy abortado."; exit 1 ;;
esac
CONTAGEM_ANTES=$(contagem_banco) || { echo "ERRO: não foi possível contar eventos/orçamentos — deploy abortado."; exit 1; }
echo "ANTES : $CONTAGEM_ANTES   ($(date -Is))"
mkdir -p "$DIR_BACKUP_DEPLOY"
DUMP="$DIR_BACKUP_DEPLOY/pre-deploy-${COMMIT_SHORT}-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -Fc --dbname="$DATABASE_URL" --file="$DUMP.parcial" \
  || { rm -f "$DUMP.parcial"; echo "ERRO: pg_dump falhou — deploy abortado."; exit 1; }
mv "$DUMP.parcial" "$DUMP"
TAM_DUMP=$(stat -c %s "$DUMP")
[ "$TAM_DUMP" -gt 1024 ] || { echo "ERRO: dump suspeito ($TAM_DUMP bytes) — deploy abortado."; exit 1; }
N_TABELAS=$(pg_restore --list "$DUMP" | grep -c ' TABLE DATA ' || true)
[ "$N_TABELAS" -gt 0 ] || { echo "ERRO: dump sem nenhuma entrada TABLE DATA — deploy abortado."; exit 1; }
echo "Dump pré-deploy válido: $DUMP ($TAM_DUMP bytes, $N_TABELAS tabelas com dados)"

if [ "${SOMENTE_PROTECAO:-0}" = "1" ]; then
  echo "DEPOIS: $(contagem_banco)   ($(date -Is))"
  echo "SOMENTE_PROTECAO=1: etapa de proteção concluída, deploy NÃO executado."
  exit 0
fi

log "1/5 — Build isolado no $ENDER_HOST (git archive HEAD, npm ci, npm run build)"
ssh "${SSH_OPTS[@]}" "$ENDER_HOST" bash -s <<EOF
set -euo pipefail
rm -rf $ENDER_BUILD_DIR
mkdir -p $ENDER_BUILD_DIR
cd $ENDER_REPO
git archive $COMMIT | tar -x -C $ENDER_BUILD_DIR
cd $ENDER_BUILD_DIR
npm ci --legacy-peer-deps
npm run build
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
rm -f /tmp/anjos-standalone.tgz
cd .next/standalone
tar czf /tmp/anjos-standalone.tgz .
EOF

log "2/5 — Transferindo artefato ($ENDER_HOST -> esta máquina -> Oracle)"
LOCAL_TMP=$(mktemp -d)
trap 'rm -rf "$LOCAL_TMP"' EXIT
scp "${SSH_OPTS[@]}" "$ENDER_HOST:/tmp/anjos-standalone.tgz" "$LOCAL_TMP/anjos-standalone.tgz"
scp "${SSH_OPTS[@]}" "$LOCAL_TMP/anjos-standalone.tgz" "$ORACLE_HOST:~/anjos-standalone-new.tgz"
ssh "${SSH_OPTS[@]}" "$ENDER_HOST" "rm -f /tmp/anjos-standalone.tgz"

log "3/5 — Backup do bundle atual no Oracle (rollback) + extração do novo"
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -euo pipefail
cd ~/$ORACLE_APP_DIR
BACKUP=~/anjos-eventos-app-backup-\$(date +%Y%m%d-%H%M%S).tgz
tar czf "\$BACKUP" .next node_modules public package.json server.js
echo "Backup salvo em: \$BACKUP"
rm -rf .next node_modules public server.js package.json
tar xzf ~/anjos-standalone-new.tgz -C ~/$ORACLE_APP_DIR
rm -f ~/anjos-standalone-new.tgz
EOF

log "4/5 — Reiniciando via PM2"
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "pm2 restart anjos-eventos-app --update-env && pm2 save"

log "5/5 — Smoke test"
# Smoke test. curl SEM -L (não seguir redirect: o status real é o que importa).
# Páginas protegidas sem sessão aceitam 307 OU 200 com o marcador
# NEXT_REDIRECT;replace;/login no corpo e sem conteúdo real (nenhum <h1>).
# Motivo do 200: src/app/loading.tsx cria um limite de Suspense, então o Next
# já enviou o status 200 (tela "Carregando…") antes de o redirect() da página
# rodar; o redirecionamento chega no corpo e o navegador troca para /login.
# 200 SEM o marcador, ou com <h1> (página renderizada), é falha.
#
# APIs internas (custo, margem, dimensionamento) exigem sessão: sem sessão o
# smoke test prova o 401 e SEM dado. O custo de referência (16.96) é provado
# por um caminho autenticado: token de serviço SMOKE_TOKEN enviado em
# `x-smoke-token` (src/lib/api-auth.ts). Escolha: um segredo de serviço
# comparado em tempo constante é o mecanismo mais simples que não exige
# cookie/login no smoke test e não abre o endpoint a ninguém.
# SMOKE_TOKEN precisa existir (mesmo valor) em DOIS lugares, fora do Git:
#   1. ambiente de quem roda este script (variável SMOKE_TOKEN);
#   2. env do app no Oracle (ecosystem.config.js; este script nunca o toca).
# Sem SMOKE_TOKEN local o smoke FALHA (não dá para provar o acesso autenticado).
SMOKE_TOKEN="${SMOKE_TOKEN:-}"
{
  printf 'SMOKE_TOKEN=%q\n' "$SMOKE_TOKEN"   # vai pelo stdin do ssh (não aparece em ps)
  cat <<'EOF'
set -uo pipefail
sleep 2
FALHAS=0
falha() { echo "FALHA: $1"; FALHAS=$((FALHAS+1)); }

for api in /api/preparos/2/custo /api/orcamentos/1/margem-projetada /api/orcamentos/1/dimensionamento; do
  echo "--- $api sem sessão (deve ser 401, sem dado) ---"
  CORPO=$(curl -s -w '\n%{http_code}' "http://localhost:3001$api")
  CODE="${CORPO##*$'\n'}"
  echo "HTTP $CODE"
  [ "$CODE" = "401" ] || falha "$api sem sessão devolveu $CODE (esperado 401)"
  echo "$CORPO" | grep -q -E 'custo|margem|receita|macro_categorias' && falha "$api sem sessão devolveu dado"
done

echo "--- /api/preparos/2/custo com token de serviço (Vinagrete, referência: 16.96) ---"
if [ -z "$SMOKE_TOKEN" ]; then
  falha "SMOKE_TOKEN não definido: acesso autenticado não provado"
else
  CUSTO=$(curl -s -H "x-smoke-token: $SMOKE_TOKEN" http://localhost:3001/api/preparos/2/custo)
  echo "$CUSTO" | sed -E 's/"custo_[a-z_]+":[0-9.]+/"custo_*":…/g' | cut -c1-80
  echo "$CUSTO" | grep -q '"custo_total_preparo":16.96' || falha "custo do preparo 2 com token diferente de 16.96"
fi

echo "--- /login (deve ser 200) ---"
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/login)
echo "HTTP $CODE"
[ "$CODE" = "200" ] || falha "/login devolveu $CODE (esperado 200)"

for rota in /simulador-cardapio /agenda/novo /orcamentos/1; do
  echo "--- $rota (sem sessão: 307, ou 200 com NEXT_REDIRECT para /login e sem conteúdo) ---"
  CORPO=$(curl -s -w '\n%{http_code}' "http://localhost:3001$rota")
  CODE="${CORPO##*$'\n'}"
  echo "HTTP $CODE"
  if [ "$CODE" = "307" ]; then
    :
  elif [ "$CODE" = "200" ]; then
    echo "$CORPO" | grep -q 'NEXT_REDIRECT;replace;/login' || falha "$rota: 200 sem marcador NEXT_REDIRECT (página protegida acessível sem sessão?)"
    echo "$CORPO" | grep -q '<h1' && falha "$rota: 200 com <h1> (conteúdo renderizado sem sessão)"
  else
    falha "$rota devolveu $CODE (esperado 307, ou 200 com marcador)"
  fi
done

pm2 list
if [ "$FALHAS" -ne 0 ]; then echo "SMOKE TEST: $FALHAS falha(s)"; exit 1; fi
echo "SMOKE TEST: ok"
EOF
} | ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s || SMOKE_RC=$?

log "Contagem DEPOIS (somente leitura)"
CONTAGEM_DEPOIS=$(contagem_banco) || CONTAGEM_DEPOIS="(falha ao contar)"
echo "ANTES : $CONTAGEM_ANTES"
echo "DEPOIS: $CONTAGEM_DEPOIS   ($(date -Is))"
if [ "$CONTAGEM_ANTES" != "$CONTAGEM_DEPOIS" ]; then
  echo "ATENÇÃO: a contagem mudou durante o deploy. O deploy não escreve no banco; verifique se foi uso normal do app. Dump pré-deploy: $DUMP"
fi

if [ "${SMOKE_RC:-0}" -ne 0 ]; then
  log "DEPLOY APLICADO, MAS O SMOKE TEST FALHOU (commit $COMMIT_SHORT) — ver FALHAs acima"
  echo "Dump do banco pré-deploy: $DUMP"
  echo "Rollback: extrair o backup do bundle (acima) por cima de ~/$ORACLE_APP_DIR e rodar pm2 restart anjos-eventos-app."
  exit 1
fi

log "Deploy concluído: commit $COMMIT_SHORT rodando em http://oracle:3001"
echo "Dump do banco pré-deploy (restauração de dados): $DUMP"
echo "Rollback, se necessário: no Oracle, extrair o backup listado acima por cima de ~/$ORACLE_APP_DIR e rodar 'pm2 restart anjos-eventos-app'."
