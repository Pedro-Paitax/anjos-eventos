# Checklist de Corte de Produção — NocoDB/Postgres local → Oracle Cloud

Status: PROPOSTO, revisado pelo Pedro em 2026-09-21. **Nada deste
checklist foi executado contra produção.** Decisões que o fecharam estão
em `docs/PENDENCIAS_NOTURNAS.md` (seção "Decisões do corte").

Base: `docs/plano-migracao-postgres-vultr.md` (ADR, provedor efetivo:
Oracle Cloud).

## Achado que define a forma do corte

Trocar `DATABASE_URL` sozinho NÃO move o app pro Oracle. O catálogo
(Preparos, Insumos, Composição, Macro_Categorias, Headers_UI, Orçamentos,
Cardápios Modelo, Hierarquia_Proteina, Configuracoes_Globais) é lido hoje
via API REST do NocoDB por 11 módulos de `src/lib/`. `DATABASE_URL` só
alimenta `usuarios`, `eventos`, `empresas`, `contratos`. Portanto o corte
tem duas fases: **(A)** migrar os módulos pra Drizzle atrás de uma flag,
**(B)** virar a chave.

## Decisões que fecharam o escopo (2026-09-21)

1. Incluir as 6 tabelas faltantes (`usuarios`, `contratos`,
   `Cardapios_Modelo`+`Cardapio_Modelo_Itens`, `Hierarquia_Proteina`,
   `Configuracoes_Globais`, `Orcamento_Itens_Adicionais`) — pré-requisito
   não-opcional.
2. **Congelar edições no NocoDB durante toda a janela do corte.** Sem
   escrita dupla, sem reconciliação posterior.
3. App roda no **Oracle** (mesmo servidor do banco) pós-corte, não no
   ender. Pendente de confirmação final do Pedro antes do dia do corte.
4. ETL "truncate + reload" APROVADO, mas só no dia do corte real (Fase B),
   protegido por confirmação explícita no script (`--confirmo-producao`).

## Fase A — Pré-requisitos (código, cada item em commit próprio)

- [ ] Schema Drizzle das 6 tabelas faltantes + push no Oracle (aditivo).
- [ ] ETL das tabelas novas (só carga em tabela vazia — não destrutivo).
- [ ] Flag `DATA_SOURCE=nocodb|oracle`, **default `nocodb`**.
- [ ] Migrar os 11 módulos de `src/lib/` pra Drizzle atrás da flag.
  - Grupo A (risco financeiro — paridade valor a valor obrigatória):
    `custo-preparo`, `dimensionamento-cardapio`, `precificacao-evento`,
    `margem-orcamento`, `hierarquia-proteina`.
  - Grupo B (risco baixo — equivalência de lista/contagem):
    `cardapios-modelo`, `debug-calculo-cardapio`, `simulador-orcamento`,
    `preparos`, `insumos`, `nocodb.ts` (só remover depois que ninguém
    mais importar).
- [x] Modo "truncate + reload" do ETL com trava `--confirmo-producao`
      (`scripts/etl-corte-producao.ts`, commit `4148bb7`). Só o dry-run e
      as recusas das travas foram exercitados; **nunca executado com escrita**.
- [ ] Confirmar backup do Oracle (snapshot da instância + `pg_dump`
      diário off-site) — item do ADR ainda **pendente de confirmação**.
- [ ] Substituir o placeholder do Modo de Preparo da Costela (Id 32) em
      NocoDB e Oracle.
- [ ] Teste dos cálculos de referência pelo endpoint real do app.
- [ ] Confirmar onde o app roda pós-corte (Oracle) e preparar a imagem
      (build fora do servidor, conforme ADR).

## Fase B — Dia do corte

1. [ ] Avisar a equipe; janela fora de horário de evento.
2. [ ] Snapshot do Oracle + `pg_dump` do Postgres local + dump do NocoDB
       (ponto de retorno).
3. [ ] **Congelar edições no NocoDB** (durante toda a janela).
4. [ ] ETL completo (`scripts/etl-corte-producao.ts`; travas: `--write
       --confirmo-producao --confirmo-banco=100.121.229.81`,
       `DIA_DO_CORTE=<hoje>` e backup OK < 26h), modo truncate+reload, com `--confirmo-producao`
       (dry-run antes → conferir contagens → escrita).
5. [ ] Copiar `usuarios`/`contratos` pro Oracle preservando IDs.
6. [ ] `scripts/verificar-eixo1-oracle.ts` — os 3 valores precisam bater.
7. [ ] Mudanças de configuração (as únicas):
   - `DATABASE_URL=postgresql://app_user:…@100.121.229.81:5432/app_db`
     (`.env` do servidor / `docker-compose.yml`)
   - `DATA_SOURCE=oracle`
   - `NOCODB_API_TOKEN` **mantido** (rollback precisa dele)
   - `.env.local` (dev) não muda
8. [ ] Deploy da imagem já construída; container precisa alcançar o
       Postgres do Oracle.
9. [ ] Smoke test: login, Simulador, Criar Evento, Cardápios Feitos,
       `/api/preparos/2/custo` = R$16,96.
10. [ ] NocoDB e Postgres do ender **continuam ligados** (congelado, não
        desligado).

## Fase C — Observação (48–72h)

- [ ] Monitorar erros/latência; comparar 2–3 cálculos/dia contra NocoDB.
- [ ] Só com o Pedro aprovando: o ender deixa de ser banco (passo 5 do
      ADR).

## Rollback (voltar pro NocoDB)

Gatilhos: cálculo divergente, login falhando, timeout recorrente, Oracle
inacessível.

1. [ ] `DATA_SOURCE=nocodb` e `DATABASE_URL` de volta pro Postgres local.
2. [ ] Reiniciar o container (sem rebuild — a flag existe pra isso).
3. [ ] Repetir o smoke test da Fase B.9.
4. [ ] Descongelar edições no NocoDB.
5. [ ] Escritas feitas só no Oracle durante a janela **não voltam
       sozinhas** — exportar e reaplicar manualmente (por isso a janela
       é curta e o NocoDB fica congelado-mas-ligado).
6. [ ] Registrar a causa em `docs/PENDENCIAS_NOTURNAS.md` antes de tentar
       de novo.

## Eixo 2

Continua ADIADO (sem orçamentos reais suficientes) — ver
`docs/plano-migracao-postgres-vultr.md`.
