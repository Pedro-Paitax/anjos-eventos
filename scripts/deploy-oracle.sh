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
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<'EOF'
set -euo pipefail
sleep 2
echo "--- /api/preparos/2/custo (Vinagrete, referência conhecida) ---"
curl -sf http://localhost:3001/api/preparos/2/custo
echo
echo "--- /simulador-cardapio (deve redirecionar pra /login sem sessão) ---"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3001/simulador-cardapio
pm2 list
EOF

log "Deploy concluído: commit $COMMIT_SHORT rodando em http://oracle:3001"
echo "Rollback, se necessário: no Oracle, extrair o backup listado acima por cima de ~/$ORACLE_APP_DIR e rodar 'pm2 restart anjos-eventos-app'."
