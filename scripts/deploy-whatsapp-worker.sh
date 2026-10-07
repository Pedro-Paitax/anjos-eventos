#!/usr/bin/env bash
# Deploy do WhatsApp Worker (processo separado do app Next.js) no Oracle.
# NÃO FOI EXECUTADO por quem o escreveu: revisar antes do primeiro uso.
#
#   1. build no "ender" (x86) a partir de `git archive HEAD` — só whatsapp-worker/;
#   2. empacota SÓ o necessário: dist/, package.json, package-lock.json e
#      ecosystem.config.cjs (nenhum node_modules, .env nem sessão no pacote);
#   3. transfere ender -> esta máquina -> Oracle;
#   4. no Oracle (ARM64): guarda o pacote atual para rollback, troca só dist/ e
#      os 3 arquivos acima, e roda `npm ci --omit=dev` AQUI (o Oracle é ARM64 e
#      o build é x86: dependência com binário nativo tem de ser instalada no
#      destino);
#   5. pm2 startOrRestart do ecosystem do worker (SEM --update-env, com
#      --max-memory-restart 300M) + pm2 save; confere /health em 127.0.0.1.
#
# Uso:  scripts/deploy-whatsapp-worker.sh            (deploy)
#       ROLLBACK=1 scripts/deploy-whatsapp-worker.sh (volta ao pacote anterior)
#
# SESSÃO DO BAILEYS: fica em ~/baileys_auth (home do opc), chmod 700, FORA da
# pasta do worker. Este script só faz `mkdir -p` + `chmod 700` nela; nunca a
# apaga, move ou sobrescreve (nada de rsync --delete nem tar por cima dela). O
# caminho chega ao processo por WORKER_AUTH_DIR no `env` de
# whatsapp-worker/ecosystem.config.cjs (versionado, sem segredos).
#
# REDE: o worker escuta só em 127.0.0.1:3100 (config.ts: WORKER_HOST/WORKER_PORT).
# O app Next.js usa 3001 — o script aborta se a porta do worker for igual à do
# app ou se outro processo já ocupar a 3100.
#
# VARIÁVEIS (só nomes; este script NÃO lê nem imprime valor algum):
#   no worker (arquivo ~/anjos-whatsapp-worker/.env, criado à mão no Oracle):
#     WORKER_TOKEN             (mínimo 16 caracteres; mesmo valor de WHATSAPP_WORKER_TOKEN)
#   no app (ecosystem.config.js do Oracle — este script NUNCA o edita):
#     WHATSAPP_WORKER_URL      (http://127.0.0.1:3100)
#     WHATSAPP_WORKER_TOKEN
#     LISTA_COMPRAS_WHATSAPP   (destino da lista de compras)
#     FAMILIA_WHATSAPP_NUMEROS
#     CRON_TOKEN
#
# ROLLBACK: ROLLBACK=1 scripts/deploy-whatsapp-worker.sh restaura o último
# ~/anjos-whatsapp-worker.rollback.tgz (dist + package*.json + ecosystem),
# reinstala as dependências e reinicia o worker. A sessão ~/baileys_auth e o
# .env não são tocados em nenhum dos dois caminhos. Para só parar o worker:
# `pm2 stop anjos-whatsapp-worker` (o app principal não é afetado).
set -euo pipefail

ENDER_HOST="ender"
ENDER_REPO="/srv/share/anjos_eventos"
ENDER_BUILD_DIR='$HOME/.deploy-anjos-whatsapp-worker'
ORACLE_HOST="opc@100.121.229.81"
SSH_OPTS=(-o ConnectTimeout=10 -o BatchMode=yes)

ORACLE_WORKER_DIR="anjos-whatsapp-worker"   # relativo ao home do opc
ORACLE_AUTH_DIR="baileys_auth"              # relativo ao home do opc; FORA de ORACLE_WORKER_DIR
PM2_NOME="anjos-whatsapp-worker"
PORTA_WORKER=3100
PORTA_APP=3001
ROLLBACK_TGZ="anjos-whatsapp-worker.rollback.tgz"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

[ "$PORTA_WORKER" != "$PORTA_APP" ] || { echo "ERRO: porta do worker igual à do app ($PORTA_APP)."; exit 1; }

# Confere que o ecosystem versionado continua apontando para a mesma porta.
grep -q "WORKER_PORT: \"$PORTA_WORKER\"" whatsapp-worker/ecosystem.config.cjs \
  || { echo "ERRO: whatsapp-worker/ecosystem.config.cjs não define WORKER_PORT=$PORTA_WORKER."; exit 1; }

# ---------------------------------------------------------------- rollback
if [ "${ROLLBACK:-0}" = "1" ]; then
  log "ROLLBACK — restaurando ~/$ROLLBACK_TGZ"
  ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -euo pipefail
[ -f ~/$ROLLBACK_TGZ ] || { echo "ERRO: ~/$ROLLBACK_TGZ não existe."; exit 1; }
cd ~/$ORACLE_WORKER_DIR
rm -rf dist
tar xzf ~/$ROLLBACK_TGZ -C ~/$ORACLE_WORKER_DIR
npm ci --omit=dev
pm2 startOrRestart ecosystem.config.cjs --max-memory-restart 300M && pm2 save
EOF
  echo "Rollback concluído. Confira: pm2 status (o app principal não foi tocado)."
  exit 0
fi

log "Verificando estado do repositório (fonte do deploy é sempre HEAD, nunca working tree)"
COMMIT=$(git rev-parse HEAD)
echo "Commit que será deployado: $(git rev-parse --short HEAD)"
DIRTY=$(git status --porcelain -- whatsapp-worker 2>/dev/null || true)
if [ -n "$DIRTY" ]; then
  echo "AVISO: há mudanças não commitadas em whatsapp-worker/ (não entram neste deploy):"
  echo "$DIRTY"
fi

log "1/4 — Build no $ENDER_HOST (git archive HEAD -> whatsapp-worker, npm ci, npm run build)"
ssh "${SSH_OPTS[@]}" "$ENDER_HOST" bash -s <<EOF
set -euo pipefail
rm -rf $ENDER_BUILD_DIR
mkdir -p $ENDER_BUILD_DIR
cd $ENDER_REPO
git archive $COMMIT whatsapp-worker | tar -x -C $ENDER_BUILD_DIR
cd $ENDER_BUILD_DIR/whatsapp-worker
npm ci
npm run build
# Só o necessário: sem node_modules, sem .env, sem auth/.
tar czf $ENDER_BUILD_DIR/pacote.tgz dist package.json package-lock.json ecosystem.config.cjs
EOF

log "2/4 — Transferindo pacote ($ENDER_HOST -> esta máquina -> Oracle)"
LOCAL_TMP=$(mktemp -d)
trap 'rm -rf "$LOCAL_TMP"' EXIT
scp "${SSH_OPTS[@]}" "$ENDER_HOST:.deploy-anjos-whatsapp-worker/pacote.tgz" "$LOCAL_TMP/pacote.tgz"
scp "${SSH_OPTS[@]}" "$LOCAL_TMP/pacote.tgz" "$ORACLE_HOST:~/anjos-whatsapp-worker-novo.tgz"
ssh "${SSH_OPTS[@]}" "$ENDER_HOST" "rm -rf $ENDER_BUILD_DIR"

log "3/4 — Oracle: pré-checagens, rollback, troca de dist/, npm ci --omit=dev"
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -euo pipefail
# Sessão do Baileys: fora do pacote; só garante que existe e é privada. Nunca apaga.
mkdir -p ~/$ORACLE_AUTH_DIR
chmod 700 ~/$ORACLE_AUTH_DIR
mkdir -p ~/$ORACLE_WORKER_DIR
cd ~/$ORACLE_WORKER_DIR

# Só confere que o .env existe (não lê o conteúdo).
[ -f .env ] || { echo "ERRO: ~/$ORACLE_WORKER_DIR/.env não existe. Crie-o à mão com WORKER_TOKEN (>= 16 caracteres)."; exit 1; }

# A porta do worker não pode estar ocupada por OUTRO processo.
if ! pm2 pid $PM2_NOME | grep -q '[0-9]'; then
  if ss -ltn "sport = :$PORTA_WORKER" | grep -q LISTEN; then
    echo "ERRO: a porta $PORTA_WORKER já está em uso por outro processo."; exit 1
  fi
fi

# Rollback: só o que este deploy troca (nunca .env, node_modules ou a sessão).
if [ -d dist ]; then
  tar czf ~/$ROLLBACK_TGZ dist package.json package-lock.json ecosystem.config.cjs
  echo "Pacote anterior guardado em ~/$ROLLBACK_TGZ"
fi
rm -rf dist
tar xzf ~/anjos-whatsapp-worker-novo.tgz -C ~/$ORACLE_WORKER_DIR
rm -f ~/anjos-whatsapp-worker-novo.tgz
npm ci --omit=dev
EOF

log "4/4 — PM2 (sem --update-env) e verificação"
# NUNCA --update-env: herdaria o ambiente da sessão SSH (já derrubou o app
# principal uma vez, 2026-10-03). Nunca `pm2 delete` do app principal.
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "cd ~/$ORACLE_WORKER_DIR && pm2 startOrRestart ecosystem.config.cjs --max-memory-restart 300M && pm2 save"
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -uo pipefail
for i in 1 2 3 4 5 6 7 8 9 10; do
  CODE=\$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' http://127.0.0.1:$PORTA_WORKER/health || true)
  [ "\$CODE" = "200" ] && { echo "Worker respondeu /health 200 em 127.0.0.1:$PORTA_WORKER"; break; }
  sleep 2
done
[ "\$CODE" = "200" ] || { echo "ERRO: /health não respondeu 200 (último: \$CODE). Veja: pm2 logs $PM2_NOME --lines 30 --nostream"; exit 1; }
pm2 status
EOF

echo
echo "Worker no ar. Próximos passos manuais: abrir o ERP, 'Conectar WhatsApp' e escanear o QR com o número do Pedro."
