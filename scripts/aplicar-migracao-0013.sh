#!/usr/bin/env bash
# PONTUAL — aplica drizzle/0013_precos_alteracoes.sql no Postgres do Oracle.
# (Resumo diário de preços: CREATE TABLE alteracoes_preco_insumo + FK + índice + função e gatilho
#  em insumos que só INSEREM na tabela nova quando o preço muda.)
# SQL ainda NÃO aprovado pelo Pedro: só rodar depois do ok dele. Segue docs/AUTONOMIA.md, "Procedimento padrão:
# migração aditiva": dump validado antes, transação única, conferência depois.
# Apagar este arquivo depois de aplicar (e registrar em docs/DECISOES.md).
#
# Uso (na raiz do projeto, Git Bash): bash scripts/aplicar-migracao-0013.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

IP_ORACLE_DB="100.121.229.81"
SQL="drizzle/0013_precos_alteracoes.sql"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")"

[ -n "$DATABASE_URL" ] || { echo "ERRO: DATABASE_URL ausente em .env"; exit 1; }
case "$DATABASE_URL" in
  *"$IP_ORACLE_DB"*) ;;
  *) echo "ERRO: DATABASE_URL não aponta para o Oracle ($IP_ORACLE_DB)"; exit 1 ;;
esac
[ -f "$SQL" ] || { echo "ERRO: $SQL não encontrado"; exit 1; }

q() { psql "$DATABASE_URL" -Atq -v ON_ERROR_STOP=1 -c "$1"; }

if [ "$(q "SELECT to_regclass('public.alteracoes_preco_insumo') IS NOT NULL")" = "t" ]; then
  echo "A 0013 já está aplicada (tabela alteracoes_preco_insumo existe). Nada a fazer."
  exit 0
fi

# Estado antes (somente leitura). Só ASCII no SQL (psql do Git Bash manda WIN1252).
RETRATO="SELECT 'insumos=' || (SELECT count(*) FROM insumos) || ' soma_precos=' || (SELECT coalesce(sum(preco),0) FROM insumos) || ' historico=' || (SELECT count(*) FROM historico_precos)"
ANTES="$(q "$RETRATO")"
echo "Antes:  $ANTES"

DIR="$HOME/backups-anjos-eventos"
mkdir -p "$DIR"
DUMP="$DIR/pre-0013-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -Fc --dbname="$DATABASE_URL" --file="$DUMP.parcial" || { rm -f "$DUMP.parcial"; echo "ERRO: pg_dump falhou"; exit 1; }
mv "$DUMP.parcial" "$DUMP"
TAM=$(stat -c %s "$DUMP")
[ "$TAM" -gt 1024 ] || { echo "ERRO: dump suspeito ($TAM bytes)"; exit 1; }
N_DADOS=$(pg_restore --list "$DUMP" | grep -c ' TABLE DATA ' || true)
[ "$N_DADOS" -gt 0 ] || { echo "ERRO: dump sem TABLE DATA"; exit 1; }
echo "Backup: $DUMP ($TAM bytes, $N_DADOS tabelas com dados)"

# Transação única: qualquer erro desfaz tudo.
psql "$DATABASE_URL" -q -v ON_ERROR_STOP=1 --single-transaction -f "$SQL"

# Conferência: tabela vazia, gatilho presente, insumos intactos.
TABELA=$(q "SELECT to_regclass('public.alteracoes_preco_insumo') IS NOT NULL")
GATILHO=$(q "SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_insumos_alteracao_preco' AND NOT tgisinternal")
LINHAS=$(q "SELECT count(*) FROM alteracoes_preco_insumo")
DEPOIS="$(q "$RETRATO")"
echo "Depois: $DEPOIS · gatilho=$GATILHO · linhas=$LINHAS"
[ "$TABELA" = "t" ] || { echo "ERRO: tabela não apareceu"; exit 1; }
[ "$GATILHO" = "1" ] || { echo "ERRO: gatilho não apareceu"; exit 1; }
[ "$LINHAS" = "0" ] || { echo "ERRO: tabela nova não está vazia"; exit 1; }
[ "$ANTES" = "$DEPOIS" ] || { echo "ERRO: insumos mudaram! Restaurar de $DUMP"; exit 1; }

echo "OK: 0013 aplicada. A partir de agora toda mudança de preço de insumo é registrada."
echo "Próximo passo: commit e deploy do app (scripts/deploy-oracle.sh); depois a linha do crontab."
