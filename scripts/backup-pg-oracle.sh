#!/usr/bin/env bash
# Backup diário do Postgres do Oracle Cloud -> Google Drive (rclone, escopo
# drive.file). Roda no "ender" (cron). Ver docs/PENDENCIAS_NOTURNAS.md,
# "PENDENTE COM PRAZO — Backup do Oracle".
#
# Fluxo: pg_dump -Fc -> valida com pg_restore --list -> envia -> confere
# tamanho no Drive -> só então aplica retenção e apaga o dump local.
# Qualquer falha aborta (set -e) SEM apagar nada no Drive.
#
# Variáveis opcionais: BACKUP_DIR_LOCAL, BACKUP_REMOTO, BACKUP_RETENCAO_DIAS,
# BACKUP_RETENCAO_DRY=1 (só mostra o que apagaria).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_LOCAL="${BACKUP_DIR_LOCAL:-$HOME/backups-anjos-eventos}"
REMOTO="${BACKUP_REMOTO:-gdrive:anjos-eventos-backup}"
RETENCAO_DIAS="${BACKUP_RETENCAO_DIAS:-30}"
IP_ORACLE="100.121.229.81"

mkdir -p "$DIR_LOCAL"
LOG="$DIR_LOCAL/backup.log"
log() { echo "$(date -Is) $*" | tee -a "$LOG"; }
falha() { log "FALHA: $*"; echo "FALHA $(date -Is): $*" > "$DIR_LOCAL/ultimo-status.txt"; exit 1; }
trap 'falha "erro inesperado na linha $LINENO"' ERR

# Só uma execução por vez.
exec 9>"$DIR_LOCAL/.lock"
flock -n 9 || { log "outra execução em andamento, saindo"; exit 0; }

# Credencial: lida do .env (onde está a URL do Oracle; o .env.local aponta pro
# banco de dev) na hora de rodar (nenhum arquivo de senha novo).
# LIMITAÇÃO CONHECIDA: a URL (com senha) fica visível no `ps` durante o dump.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$RAIZ/.env" | head -1 | cut -d= -f2- | tr -d "\"'\r")"
[ -n "$DATABASE_URL" ] || falha "DATABASE_URL ausente em .env"
case "$DATABASE_URL" in
  *"$IP_ORACLE"*) ;;
  *) falha "DATABASE_URL não aponta para o Oracle ($IP_ORACLE); backup abortado" ;;
esac

# Nome com data; nunca sobrescreve (se já existir, acrescenta a hora).
NOME="anjos-eventos-$(date +%Y-%m-%d).dump"
if [ -e "$DIR_LOCAL/$NOME" ] || [ -n "$(rclone lsf "$REMOTO/$NOME" 2>/dev/null)" ]; then
  NOME="anjos-eventos-$(date +%Y-%m-%d_%H%M%S).dump"
fi
ARQUIVO="$DIR_LOCAL/$NOME"

log "iniciando pg_dump -> $NOME"
pg_dump -Fc --dbname="$DATABASE_URL" --file="$ARQUIVO.parcial" \
  || { rm -f "$ARQUIVO.parcial"; falha "pg_dump falhou"; }
mv "$ARQUIVO.parcial" "$ARQUIVO"

# Validação do dump (sem restaurar): tamanho, TOC legível e dados de tabela.
TAM_LOCAL=$(stat -c %s "$ARQUIVO")
[ "$TAM_LOCAL" -gt 1024 ] || falha "dump suspeito: só $TAM_LOCAL bytes"
TOC="$(pg_restore --list "$ARQUIVO")" || falha "pg_restore --list não leu o dump"
N_DADOS=$(printf '%s\n' "$TOC" | grep -c ' TABLE DATA ' || true)
[ "$N_DADOS" -gt 0 ] || falha "dump sem nenhuma entrada TABLE DATA"
log "dump válido: $TAM_LOCAL bytes, $N_DADOS tabelas com dados"

# Upload (rclone confere hash) + conferência de tamanho no Drive.
rclone copyto "$ARQUIVO" "$REMOTO/$NOME" || falha "upload falhou"
TAM_REMOTO=$(rclone lsf --format s "$REMOTO/$NOME" | head -1)
[ "$TAM_REMOTO" = "$TAM_LOCAL" ] || falha "tamanho no Drive ($TAM_REMOTO) difere do local ($TAM_LOCAL)"
log "upload conferido no Drive: $REMOTO/$NOME"

# Retenção: só depois de upload conferido. Apaga apenas anjos-eventos-*.dump
# mais antigos que RETENCAO_DIAS, nesta pasta.
FLAGS=(--min-age "${RETENCAO_DIAS}d" --include 'anjos-eventos-*.dump')
[ "${BACKUP_RETENCAO_DRY:-0}" = "1" ] && FLAGS+=(--dry-run)
rclone delete "$REMOTO" "${FLAGS[@]}" -v 2>&1 | tee -a "$LOG" || falha "retenção falhou"

rm -f "$ARQUIVO"
N_REMOTO=$(rclone lsf "$REMOTO" --include 'anjos-eventos-*.dump' | wc -l)
echo "OK $(date -Is) $NOME ($TAM_LOCAL bytes); $N_REMOTO backup(s) no Drive" > "$DIR_LOCAL/ultimo-status.txt"
log "concluído: $N_REMOTO backup(s) no Drive"
