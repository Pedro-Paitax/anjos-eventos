#!/usr/bin/env bash
# PONTUAL — aplica drizzle/0012_preparo_variacoes.sql no Postgres do Oracle.
# (Versões de preparo: só CREATE TABLE preparo_variacoes + FKs + índice.)
# SQL ainda NÃO aprovado pelo Pedro: só rodar depois do ok dele. Segue docs/AUTONOMIA.md, "Procedimento padrão:
# migração aditiva": dump validado antes, transação única, conferência depois.
# Apagar este arquivo depois de aplicar (e registrar em docs/DECISOES.md).
#
# Uso (na raiz do projeto, Git Bash): bash scripts/aplicar-migracao-0012.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

IP_ORACLE_DB="100.121.229.81"
SQL="drizzle/0012_preparo_variacoes.sql"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")"

[ -n "$DATABASE_URL" ] || { echo "ERRO: DATABASE_URL ausente em .env"; exit 1; }
case "$DATABASE_URL" in
  *"$IP_ORACLE_DB"*) ;;
  *) echo "ERRO: DATABASE_URL não aponta para o Oracle ($IP_ORACLE_DB)"; exit 1 ;;
esac
[ -f "$SQL" ] || { echo "ERRO: $SQL não encontrado"; exit 1; }

q() { psql "$DATABASE_URL" -Atq -v ON_ERROR_STOP=1 -c "$1"; }

if [ "$(q "SELECT to_regclass('public.preparo_variacoes') IS NOT NULL")" = "t" ]; then
  echo "A 0012 já está aplicada (tabela preparo_variacoes existe). Nada a fazer."
  exit 0
fi

# Estado antes (somente leitura): preparos, composição e headers não podem mudar.
# Só ASCII dentro do SQL: no Git Bash do Windows o psql recebe o argumento em WIN1252 e o
# servidor (UTF8) recusa acento ("invalid byte sequence for encoding UTF8").
RETRATO="SELECT 'preparos=' || (SELECT count(*) FROM preparos) || ' composicao=' || (SELECT count(*) FROM composicao) || ' header_preparo=' || (SELECT count(*) FROM header_preparo)"
ANTES="$(q "$RETRATO")"
echo "Antes:  $ANTES"

# Backup validado. Sem dump válido, não aplica.
DIR="$HOME/backups-anjos-eventos"
mkdir -p "$DIR"
DUMP="$DIR/pre-0012-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -Fc --dbname="$DATABASE_URL" --file="$DUMP.parcial" || { rm -f "$DUMP.parcial"; echo "ERRO: pg_dump falhou"; exit 1; }
mv "$DUMP.parcial" "$DUMP"
TAM=$(stat -c %s "$DUMP")
[ "$TAM" -gt 1024 ] || { echo "ERRO: dump suspeito ($TAM bytes)"; exit 1; }
N_DADOS=$(pg_restore --list "$DUMP" | grep -c ' TABLE DATA ' || true)
[ "$N_DADOS" -gt 0 ] || { echo "ERRO: dump sem TABLE DATA"; exit 1; }
echo "Backup: $DUMP ($TAM bytes, $N_DADOS tabelas com dados)"

# Transação única: qualquer erro desfaz tudo.
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f "$SQL"

# Conferência.
TABELA=$(q "SELECT to_regclass('public.preparo_variacoes') IS NOT NULL")
DEPOIS="$(q "$RETRATO")"
echo "Depois: $DEPOIS"
[ "$TABELA" = "t" ] || { echo "ERRO: tabela preparo_variacoes não apareceu"; exit 1; }
[ "$ANTES" = "$DEPOIS" ] || { echo "ERRO: preparos mudaram! Restaurar de $DUMP"; exit 1; }

echo "OK: 0012 aplicada. Tabela preparo_variacoes criada; nenhum preparo alterado."
echo "Próximo passo: commit e deploy do app (scripts/deploy-oracle.sh)."
