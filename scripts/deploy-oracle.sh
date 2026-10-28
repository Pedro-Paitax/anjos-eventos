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
# SEM_SMOKE=1 dispensa o SMOKE_TOKEN e troca o smoke completo por uma checagem
# mínima sem token (/login 200 por localhost e IP Tailscale + HOSTNAME=0.0.0.0);
# se ela falhar, o rollback automático é o mesmo. Autorizado pelo Pedro em
# 2026-10-28 (o arquivo ~/.anjos/smoke-token ainda não existe).
#
# Uso: scripts/deploy-oracle.sh   |   SEM_SMOKE=1 scripts/deploy-oracle.sh
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

if [ "${SEM_SMOKE:-0}" = "1" ]; then
log "SEM_SMOKE=1: sem SMOKE_TOKEN; ao final, só a checagem mínima de /login e HOSTNAME (com rollback)"
else
log "Carregando SMOKE_TOKEN (ambiente ou ~/.anjos/smoke-token; o valor nunca é impresso)"
# Falha ANTES do build se não houver token válido: sem ele o smoke não prova o acesso autenticado.
if [ -z "${SMOKE_TOKEN:-}" ]; then
  ARQ_SMOKE_TOKEN="$HOME/.anjos/smoke-token"
  [ -f "$ARQ_SMOKE_TOKEN" ] || { echo "ERRO: SMOKE_TOKEN ausente do ambiente e $ARQ_SMOKE_TOKEN não existe — deploy abortado."; exit 1; }
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # Git Bash (noacl): chmod/stat não refletem permissão real. Checa a ACL do NTFS:
      # falha se Todos (S-1-1-0), Usuários (S-1-5-32-545) ou Usuários Autenticados (S-1-5-11) têm acesso.
      # /findsid imprime o caminho do arquivo só quando a SID está na ACL (independe do idioma).
      ARQ_WIN=$(cygpath -w "$ARQ_SMOKE_TOKEN")
      for SID_ABERTA in '*S-1-1-0' '*S-1-5-32-545' '*S-1-5-11'; do
        ACHOU=$(MSYS_NO_PATHCONV=1 icacls "$ARQ_WIN" /findsid "$SID_ABERTA") || { echo "ERRO: não foi possível ler a ACL de $ARQ_SMOKE_TOKEN — deploy abortado."; exit 1; }
        if echo "$ACHOU" | grep -q -F "smoke-token"; then
          echo "ERRO: $ARQ_SMOKE_TOKEN legível por outros usuários (ACL). Rode: icacls \"$ARQ_WIN\" /inheritance:r /grant:r \"\$USERNAME:F\" — deploy abortado."; exit 1
        fi
      done ;;
    *)
      PERM_SMOKE_TOKEN=$(stat -c %a "$ARQ_SMOKE_TOKEN")
      # Aceita só 600 ou mais restrito (nenhum bit de grupo/outros, nenhum de execução).
      case "$PERM_SMOKE_TOKEN" in
        [0-6]00|[0-6]) ;;
        *) echo "ERRO: $ARQ_SMOKE_TOKEN com permissão $PERM_SMOKE_TOKEN (máximo 600). Rode: chmod 600 $ARQ_SMOKE_TOKEN — deploy abortado."; exit 1 ;;
      esac ;;
  esac
  SMOKE_TOKEN="$(tr -d '

' < "$ARQ_SMOKE_TOKEN")"
  export SMOKE_TOKEN
fi
[ "${#SMOKE_TOKEN}" -ge 32 ] || { echo "ERRO: SMOKE_TOKEN com menos de 32 caracteres — deploy abortado."; exit 1; }
echo "SMOKE_TOKEN carregado (${#SMOKE_TOKEN} caracteres)."
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
BACKUP_NOME="anjos-eventos-app-backup-$(date +%Y%m%d-%H%M%S).tgz"
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -euo pipefail
cd ~/$ORACLE_APP_DIR
BACKUP=~/$BACKUP_NOME
tar czf "\$BACKUP" .next node_modules public package.json server.js
echo "Backup salvo em: \$BACKUP"
rm -rf .next node_modules public server.js package.json
tar xzf ~/anjos-standalone-new.tgz -C ~/$ORACLE_APP_DIR
rm -f ~/anjos-standalone-new.tgz
EOF

log "4/5 — Reiniciando via PM2"
# NUNCA usar --update-env aqui: ele herda o ambiente da sessão SSH (HOSTNAME da
# máquina sobrescreveu o HOSTNAME=0.0.0.0 do ecosystem e derrubou o app, 2026-10-03).
# startOrRestart relê o env do ecosystem.config.js, sem herdar a sessão.
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "cd ~/$ORACLE_APP_DIR && pm2 startOrRestart ecosystem.config.js && pm2 save"
HOST_FINAL=$(ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "pm2 env 0 | grep -E '^HOSTNAME:' | tr -d ' '" || true)
echo "Processo PM2: $HOST_FINAL (esperado HOSTNAME:0.0.0.0)"
[ "$HOST_FINAL" = "HOSTNAME:0.0.0.0" ] || { echo "ERRO: HOSTNAME do processo não é 0.0.0.0 — app pode estar inacessível pelo IP Tailscale."; SMOKE_PRE_FALHA=1; }

if [ "${SEM_SMOKE:-0}" = "1" ]; then
log "5/5 — Checagem mínima (SEM_SMOKE=1): /login 200 por localhost e IP Tailscale, HOSTNAME=0.0.0.0"
{
  printf 'IP=%q\n' "$IP_ORACLE_DB"
  cat <<'EOF'
set -uo pipefail
for alvo in http://localhost:3001/login "http://$IP:3001/login"; do
  T0=$(date +%s)
  until [ "$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' "$alvo")" = "200" ]; do
    if [ $(( $(date +%s) - T0 )) -ge 60 ]; then echo "FALHA: $alvo não respondeu 200 em 60 s"; exit 1; fi
    sleep 1
  done
  echo "$alvo = 200 ($(( $(date +%s) - T0 )) s)"
done
ESCUTA=$(/usr/sbin/ss -ltnH 'sport = :3001' | awk '{print $4}' | head -1)  # /usr/sbin fora do PATH do ssh não interativo
echo "socket em escuta: ${ESCUTA:-<nenhum>}"
case "$ESCUTA" in
  0.0.0.0:3001|\*:3001) ;;
  *) echo "FALHA: porta 3001 escutando em '${ESCUTA:-nenhum}' (esperado 0.0.0.0:3001)"; exit 1 ;;
esac
pm2 list
echo "CHECAGEM MÍNIMA: ok (smoke completo NÃO executado)"
EOF
} | ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s || SMOKE_RC=$?
else
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
# Readiness: espera /login responder 200 (até 60 s) antes de qualquer prova.
T0=$(date +%s)
until [ "$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' http://localhost:3001/login)" = "200" ]; do
  if [ $(( $(date +%s) - T0 )) -ge 60 ]; then
    echo "ERRO: app não respondeu 200 em http://localhost:3001/login em 60 s (falha de inicialização; ver pm2 logs)."
    exit 1
  fi
  sleep 1
done
echo "App pronto em $(( $(date +%s) - T0 )) s (localhost)"
# Orçamento existente usado nas provas das rotas de orçamento. Se ele deixar de
# existir, a prova autenticada aceita o 404 do app ("Orçamento não encontrado.")
# como sinal de que passou da autenticação, e o resultado diz isso.
ORC_ID=8
FALHAS=0
falha() { echo "FALHA: $1"; FALHAS=$((FALHAS+1)); }

for api in /api/preparos/2/custo /api/orcamentos/$ORC_ID/margem-projetada /api/orcamentos/$ORC_ID/dimensionamento; do
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
  CUSTO_TOTAL=$(echo "$CUSTO" | grep -oE '"custo_total_preparo":[0-9.]+' | head -1 | cut -d: -f2)
  echo "custo_total_preparo=${CUSTO_TOTAL:-<ausente>} (esperado 16.96)"
  [ "$CUSTO_TOTAL" = "16.96" ] || falha "custo_total_preparo do preparo 2 com token é '${CUSTO_TOTAL:-ausente}' (esperado 16.96)"

  for api in margem-projetada dimensionamento; do
    echo "--- /api/orcamentos/$ORC_ID/$api com token de serviço (esperado 200) ---"
    CORPO=$(curl -s --max-time 90 -H "x-smoke-token: $SMOKE_TOKEN" -w '\n%{http_code}' "http://localhost:3001/api/orcamentos/$ORC_ID/$api")
    CODE="${CORPO##*$'\n'}"
    if [ "$CODE" = "200" ]; then
      echo "HTTP 200"
    elif [ "$CODE" = "404" ] && echo "$CORPO" | grep -q 'Orçamento não encontrado'; then
      echo "HTTP 404 do app (orçamento $ORC_ID não existe): passou da autenticação (sem 401)"
    else
      falha "/api/orcamentos/$ORC_ID/$api com token devolveu $CODE (esperado 200)"
    fi
  done
fi

echo "--- /login (deve ser 200) ---"
CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/login)
echo "HTTP $CODE"
[ "$CODE" = "200" ] || falha "/login devolveu $CODE (esperado 200)"

echo "--- /login pelo IP Tailscale 100.121.229.81:3001 (deve ser 200; é por onde o Pedro acessa) ---"
CODE=$(curl -s -o /dev/null --max-time 10 -w '%{http_code}' http://100.121.229.81:3001/login)
echo "HTTP $CODE"
[ "$CODE" = "200" ] || falha "/login pelo IP Tailscale devolveu $CODE (esperado 200)"

for rota in /simulador-cardapio /agenda/novo /orcamentos/1 /agenda/1/lista-compras; do
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

echo "--- /agenda/1/lista-compras/pdf sem sessão (deve ser 401, sem PDF) ---"
CORPO=$(curl -s -D - -w '\n%{http_code}' http://localhost:3001/agenda/1/lista-compras/pdf)
CODE="${CORPO##*$'\n'}"
echo "HTTP $CODE"
[ "$CODE" = "401" ] || falha "/agenda/1/lista-compras/pdf sem sessão devolveu $CODE (esperado 401)"
echo "$CORPO" | grep -q -i -E 'application/pdf|^%PDF' && falha "/agenda/1/lista-compras/pdf sem sessão devolveu PDF"

echo "--- HOSTNAME=0.0.0.0 (env do processo PM2 e socket de escuta na 3001) ---"
HOST_PM2=$(pm2 env 0 | grep -E '^HOSTNAME:' | tr -d ' ')
echo "pm2 env: $HOST_PM2"
[ "$HOST_PM2" = "HOSTNAME:0.0.0.0" ] || falha "HOSTNAME do processo PM2 é '${HOST_PM2:-ausente}' (esperado HOSTNAME:0.0.0.0)"
ESCUTA=$(/usr/sbin/ss -ltnH 'sport = :3001' | awk '{print $4}' | head -1)  # /usr/sbin fora do PATH do ssh não interativo
echo "socket em escuta: ${ESCUTA:-<nenhum>}"
case "$ESCUTA" in
  0.0.0.0:3001|\*:3001) ;;
  *) falha "porta 3001 escutando em '${ESCUTA:-nenhum}' (esperado 0.0.0.0:3001)" ;;
esac

pm2 list
if [ "$FALHAS" -ne 0 ]; then echo "SMOKE TEST: $FALHAS falha(s)"; exit 1; fi
echo "SMOKE TEST: ok"
EOF
} | ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s || SMOKE_RC=$?
fi

log "Contagem DEPOIS (somente leitura)"
CONTAGEM_DEPOIS=$(contagem_banco) || CONTAGEM_DEPOIS="(falha ao contar)"
echo "ANTES : $CONTAGEM_ANTES"
echo "DEPOIS: $CONTAGEM_DEPOIS   ($(date -Is))"
if [ "$CONTAGEM_ANTES" != "$CONTAGEM_DEPOIS" ]; then
  echo "ATENÇÃO: a contagem mudou durante o deploy. O deploy não escreve no banco; verifique se foi uso normal do app. Dump pré-deploy: $DUMP"
fi

if [ "${SMOKE_RC:-0}" -ne 0 ] || [ "${SMOKE_PRE_FALHA:-0}" -ne 0 ]; then
  log "SMOKE TEST FALHOU (commit $COMMIT_SHORT) — rollback automático do bundle"
  echo "Dump do banco pré-deploy: $DUMP"
  echo "Restaurando ~/$BACKUP_NOME e reiniciando via pm2 startOrRestart (sem --update-env)..."
  # Restaura o bundle e confirma /login 200 por localhost e pelo IP Tailscale.
  # Migrações de banco NÃO são revertidas aqui (são aditivas; o app antigo as ignora).
  if ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" bash -s <<EOF
set -euo pipefail
cd ~/$ORACLE_APP_DIR
test -s ~/$BACKUP_NOME
rm -rf .next node_modules public server.js package.json
tar xzf ~/$BACKUP_NOME -C ~/$ORACLE_APP_DIR
pm2 startOrRestart ecosystem.config.js
pm2 save
for alvo in http://localhost:3001/login http://$IP_ORACLE_DB:3001/login; do
  T0=\$(date +%s)
  until [ "\$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' \$alvo)" = "200" ]; do
    if [ \$(( \$(date +%s) - T0 )) -ge 60 ]; then echo "ERRO: \$alvo não respondeu 200 após o rollback."; exit 1; fi
    sleep 1
  done
  echo "Rollback confirmado: \$alvo = 200"
done
EOF
  then
    echo "ROLLBACK CONCLUÍDO: versão anterior restaurada e respondendo (localhost e $IP_ORACLE_DB). O commit $COMMIT_SHORT NÃO está no ar."
  else
    echo "ERRO CRÍTICO: o rollback automático falhou. Intervenção manual: no Oracle, extrair ~/$BACKUP_NOME em ~/$ORACLE_APP_DIR e rodar 'pm2 startOrRestart ecosystem.config.js'."
  fi
  exit 1
fi

log "Deploy concluído: commit $COMMIT_SHORT rodando em http://oracle:3001"
echo "Dump do banco pré-deploy (restauração de dados): $DUMP"
echo "Rollback, se necessário: no Oracle, extrair o backup listado acima por cima de ~/$ORACLE_APP_DIR e rodar 'pm2 restart anjos-eventos-app'."
