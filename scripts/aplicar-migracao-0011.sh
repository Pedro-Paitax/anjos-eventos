#!/usr/bin/env bash
# PONTUAL — aplica drizzle/0011_precos_fornecedores.sql no Postgres do Oracle.
# SQL aprovado pelo Pedro em 2026-11-02. Segue docs/AUTONOMIA.md, "Procedimento padrão:
# migração aditiva": dump validado antes, transação única, conferência depois.
# Apagar este arquivo depois de aplicar (e registrar em docs/DECISOES.md).
#
# Uso (na raiz do projeto, Git Bash): bash scripts/aplicar-migracao-0011.sh
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

IP_ORACLE_DB="100.121.229.81"
SQL="drizzle/0011_precos_fornecedores.sql"
DATABASE_URL="$(grep -E '^DATABASE_URL=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"'\r")"

[ -n "$DATABASE_URL" ] || { echo "ERRO: DATABASE_URL ausente em .env"; exit 1; }
case "$DATABASE_URL" in
  *"$IP_ORACLE_DB"*) ;;
  *) echo "ERRO: DATABASE_URL não aponta para o Oracle ($IP_ORACLE_DB)"; exit 1 ;;
esac
[ -f "$SQL" ] || { echo "ERRO: $SQL não encontrado"; exit 1; }

q() { psql "$DATABASE_URL" -Atq -v ON_ERROR_STOP=1 -c "$1"; }

if [ "$(q "SELECT to_regclass('public.fornecedores') IS NOT NULL")" = "t" ]; then
  echo "A 0011 já está aplicada (tabela fornecedores existe). Nada a fazer."
  exit 0
fi

# Estado antes (somente leitura): insumos não podem mudar.
RETRATO="SELECT count(*) || ' insumos, soma preco=' || coalesce(sum(preco), 0) || ', soma fator=' || coalesce(sum(fator_correcao), 0) FROM insumos"
ANTES="$(q "$RETRATO")"
echo "Antes:  $ANTES"

# Backup validado. Sem dump válido, não aplica.
DIR="$HOME/backups-anjos-eventos"
mkdir -p "$DIR"
DUMP="$DIR/pre-0011-$(date +%Y%m%d-%H%M%S).dump"
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
TABELAS=$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('fornecedores', 'cotacoes', 'historico_precos')")
COLUNAS=$(q "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insumos' AND column_name IN ('fornecedor_principal_id', 'canal', 'fonte_preco', 'preco_atualizado_em')")
DEPOIS="$(q "$RETRATO")"
echo "Depois: $DEPOIS"
[ "$TABELAS" = "3" ] || { echo "ERRO: esperava 3 tabelas novas, achei $TABELAS"; exit 1; }
[ "$COLUNAS" = "4" ] || { echo "ERRO: esperava 4 colunas novas em insumos, achei $COLUNAS"; exit 1; }
[ "$ANTES" = "$DEPOIS" ] || { echo "ERRO: insumos mudaram! Restaurar de $DUMP"; exit 1; }

echo "OK: 0011 aplicada. 3 tabelas e 4 colunas novas; nenhum dado de insumos alterado."
echo "Próximo passo: commit e deploy do app (scripts/deploy-oracle.sh)."
