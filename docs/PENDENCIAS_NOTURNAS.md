# Pendências Noturnas — sessões autônomas

Histórico das sessões autônomas. Pendências de sessões já revisadas pelo
Pedro ficam marcadas como resolvidas; o que ainda depende dele fica em
aberto, com prioridade.

## Sessão 2026-09-16 (manhã) — ADR aplicado + schema Drizzle nativo desenhado (sem push, sem ETL)

Continuação direta do bloqueio registrado logo abaixo. O Pedro enviou os
dois arquivos que faltavam (`plano-migracao-postgres-vultr.md` e
`schema-fisico-detalhado.md`) e resolveu a Lacuna 1
(`Valor_Base_Por_Pessoa` removido do schema). Verifiquei ambos antes de
confiar: SSH em `opc@100.121.229.81` confirmou de forma independente
que a VPS é Oracle Cloud de verdade (`/etc/os-release` = Oracle Linux
9.8, endpoint de metadata da OCI respondeu) — não apenas alegado.

### Feito

1. **ADR aplicado** (`c3f1a11`): "Banco central" em `docs/DECISOES.md`
   marcada `SUBSTITUÍDA`, riscada mas não apagada, referenciando
   `docs/plano-migracao-postgres-vultr.md`.
2. **Schema Drizzle nativo desenhado** (`3dede71`..`675dd6e`, 6 commits,
   um por tabela/grupo): `src/db/schema/` — Preparos, Insumos,
   Composição, Macro_Categorias, Headers_UI + junção nova
   `header_preparo` (Lacuna 7), Orçamentos, Itens_Orcamento, e uma
   definição mínima de `itens_evento_confirmados` (necessária só pra
   existir o alvo do `ON DELETE RESTRICT` de Preparos exigido). PK
   `INTEGER/SERIAL` preservando IDs (Lacuna 2). `drizzle-orm@0.45.2` +
   `drizzle-kit@0.31.10` instalados.
3. **Duas divergências reais encontradas contra o dado ao vivo do
   NocoDB, corrigidas em vez de seguidas cegamente** (não presumidas):
   - `Preparos.Categoria`: o documento propunha "Saladas Leves"/"Saladas
     Pesadas" e omitia "Massas". O dado real (conferido ao vivo) é
     Bebidas, Carnes, Entrada, Guarnições, Massas, Molhos, Saladas,
     Sobremesa — a divisão de Saladas nunca tocou este campo, só a
     Macro_Categoria/Header_UI vinculada. Segui o dado real.
   - `Unidade_Rendimento`: campo NocoDB permite também KG/Pessoas, mas
     só G/ML/Unidade têm uso real hoje — segui o documento aqui, com
     aviso de que um Preparo futuro usando KG/Pessoas quebraria o enum
     antes do ETL.
4. **Decisões técnicas minhas, documentadas nos comentários dos arquivos
   pra revisão** (não formalizadas com você, sinalizadas como tal):
   - `Preço Corrigido` (Lacuna 6): calculado em runtime pela aplicação,
     não coluna gerada — evita duplicar a fórmula (com a regra de borda
     do Fator de Correção) em duas fontes de verdade.
   - `UNIQUE` em `Insumos.Nome` (pedido explicitamente, confirmado sem
     duplicatas ao vivo: 122 registros, zero conflitos) e também em
     `Macro_Categorias.Nome_Macro`/`Headers_UI.Nome_Exibicao` (não
     pedido, mas óbvio pra tabelas de referência pequenas mantidas à
     mão — sinalizado para revisão).
   - `ON DELETE CASCADE` na junção nova `header_preparo` (não pedido,
     por analogia direta com Composição — dado de vínculo sem
     significado próprio fora do par).
   - `Itens_Orcamento.orcamentoId` ficou **sem** `ON DELETE CASCADE` —
     o próprio documento marca isso como "candidato... não
     formalizado", não decidi sozinho.
5. **Validação**: `tsc --noEmit` 0 erros, `eslint` 0 erros/warnings,
   `vitest run` 35/35 (sem regressão — nada consome o schema novo
   ainda, é só definição de tipos). Rodado via SSH em "ender"
   (`/srv/share/anjos_eventos`, filesystem nativo).
6. **PR**: `gh` continua indisponível. Branch
   `feature/schema-drizzle-nativo` empurrada, link manual:
   `github.com/Pedro-Paitax/anjos-eventos/pull/new/feature/schema-drizzle-nativo`.
   Não abri o PR de fato, não mergeei nada.

### Explicitamente NÃO feito (conforme instruído)

- Nenhum `drizzle-kit push` rodado contra a VPS Oracle Cloud.
- Nenhum script de ETL escrito nem executado.
- Nenhuma leitura em massa do NocoDB de produção além das consultas
  pontuais de verificação acima (Categoria/Unidade_Rendimento/nomes
  duplicados de Insumos).

### Pendente pra próxima etapa (quando você aprovar)

- Redesenho completo de `itens_evento_confirmados` e
  `orcamento_itens_adicionais` (ambas fora do escopo desta sessão).
- Confirmar/ajustar as decisões técnicas sinalizadas no item 4 acima.
- Só depois: `drizzle-kit generate` (gera SQL de revisão, não escreve
  no banco) → `drizzle-kit push` → script de ETL → os dois eixos de
  validação do plano de migração.

---

## Sessão 2026-09-16 (noite) — Item 1 concluído; Itens 2-6 bloqueados de novo, mesmo motivo de ontem

Continuação da fila da noite anterior. Regra seguida: bloqueio numa etapa
não para a fila inteira — o que dependia de decisão que não é minha foi
documentado e eu segui pro próximo item executável.

### Item 1 — CONCLUÍDO

- **`node_modules` reinstalado com sucesso** em "ender" (filesystem
  nativo, `/srv/share/anjos_eventos`) — 0 pacotes com dono `root`
  restantes. Verificado ao vivo, não presumido: `tsc --noEmit` 0 erros,
  `eslint` 0 erros/0 warnings (corrigido o único warning pré-existente em
  `src/lib/db.ts` — `eslint-disable-next-line no-var` desnecessário
  dentro de um `declare global`), `vitest run` **35/35 testes passando**.
- **6 commits**, um por assunto (o pedido original agrupava várias
  sessões diferentes num "12 arquivos" só — separei por coerência):
  - `8b7619d` fix: remove eslint-disable-next-line obsoleto em db.ts
  - `bd3a6e9` fix: corrige mistura de unidades no motor de dimensionamento
    (os 10 arquivos centrais da correção + testes)
  - `cf61ceb` feat: painel "Ver cálculos" no Simulador de Cardápio
    (ferramenta de diagnóstico, 3 arquivos incl. o não rastreado
    `debug-calculo-cardapio.ts`)
  - `db9876a` fix: adiciona --legacy-peer-deps ao npm ci do Dockerfile
  - `0a24bde` docs: registra decisões acumuladas de sessões anteriores em
    DECISOES.md (catch-up — semanas de decisões já tomadas e em vários
    casos já implementadas, nunca commitadas)
  - `d8c39cf` docs: corrige BANCO.md contra o schema real do NocoDB
    (catch-up da correção já datada "2026-09-08" no topo do arquivo)
- **PR**: `gh` CLI continua indisponível neste ambiente (mesma limitação
  de sessões anteriores). Empurrei os commits pra branch
  `feature/correcao-mistura-unidades` e o GitHub devolveu o link de
  criação manual:
  `github.com/Pedro-Paitax/anjos-eventos/pull/new/feature/correcao-mistura-unidades`.
  **Não abri o PR de fato** (sem ferramenta pra isso) — nem, claro,
  mergeei nada.
- **Arquivos ainda não commitados** (fora do escopo desta fila, não
  toquei): `.claude/commands/` (parece config legítima, não pedida),
  `requirements.txt` (briefing antigo em texto puro, nome enganoso, não é
  Python), `next-env.d.ts`/`tsconfig.tsbuildinfo` (artefatos de build que
  deveriam estar no `.gitignore` e não estão — higiene, não urgente),
  `scripts/_2X68O~Y` (lixo de um redirecionamento de shell de uma sessão
  minha anterior, pode apagar quando quiser).
- **Os 3 `.sql` soltos em `~/` no "ender"** (`composicao.sql`,
  `insumos.sql`, `projeto_completo.sql`, ~3-10KB cada): são dumps
  (`pg_dump`, Postgres 15.18) das tabelas `Composicao`/`Insumos`/
  `Preparos` do schema interno do NocoDB (`pj8swc9o6cczdii`), datados de
  **30 de julho** — anteriores a praticamente todo o histórico registrado
  neste arquivo. Parecem backups manuais pontuais de antes de alguma
  operação arriscada. Não apaguei nada, só confirmei o conteúdo.

### Itens 2-6 — BLOQUEADOS DE NOVO, mesma causa da sessão anterior

Antes de tocar em qualquer schema, conferi as duas premissas que a
missão de hoje dava como resolvidas:

1. **O "arquivo anexo" `plano-migracao-postgres-vultr.md` não existe.**
   Procurei na pasta de uploads desta sessão e no projeto inteiro — nada.
   A instrução pedia pra eu substituir a seção "Banco central" de
   `docs/DECISOES.md` (uma decisão `APROVADA`, reafirmada várias vezes
   neste projeto) pelo conteúdo desse arquivo, marcando-a como
   `SUBSTITUÍDA`. Sem o arquivo, isso significaria eu mesmo escrever o
   ADR que supostamente já existia — exatamente o tipo de decisão de
   arquitetura que não é minha pra tomar, e que inventaria tanto o
   conteúdo quanto a justificativa.
2. **`docs/schema-fisico-detalhado.md` continua não existindo** (mesma
   verificação de ontem, repetida agora — nenhum arquivo novo apareceu).

Como o Item 2 (ADR) não pôde ser aplicado, os Itens 3-6 (desenhar schema
Drizzle assumindo remoção do NocoDB, `drizzle-kit push` contra
`100.121.229.81`, ETL puxando dado real de Preparos/Insumos/Composição/
Orçamentos do NocoDB pra esse banco novo, e as validações financeiras em
cima desse dado migrado) ficam **todos bloqueados pela mesma causa raiz**
— não há decisão registrada autorizando tirar o NocoDB de operação nem um
schema de referência pra desenhar o Drizzle contra. Não tentei nenhum
deles: nenhum `drizzle-kit push`, nenhuma leitura em massa de dado real
do NocoDB, nenhuma escrita no banco novo.

**Isso é a mesma missão de ontem (2026-09-15, seção acima), pedida de
novo hoje com o mesmo arquivo ainda ausente.** Registro isso sem
acusação — só como fato observável, pra você confirmar de manhã se o
plano existe em algum lugar que eu não tenho acesso (outro chat, rascunho
ainda não salvo) antes de reenviar a mesma instrução uma terceira vez.

A regra "região adicional desta noite" (não mexer no NocoDB/Postgres de
produção do ender, não trocar a `DATABASE_URL` real) foi respeitada por
consequência — nem cheguei perto dela, já que os itens que dependiam
disso não foram executados.

---

## 🔴 MISSÃO NÃO EXECUTADA — Migração de schema Drizzle para produção (2026-09-15): bloqueada já na Fase 1/2, premissa não bate com o repositório

**Nenhuma ação destrutiva foi tomada. Nenhum PR foi aberto. A Fase 4 (push
contra produção) não foi tocada, como instruído.** Isto é um relatório de
bloqueio, seguindo a regra combinada para esta sessão: "se precisar de
decisão de negócio/schema, registre aqui e siga para a próxima tarefa,
nunca decida sozinho."

### O que foi pedido

Missão em 4 fases: (1) configurar `.env` com uma `DATABASE_URL` de
produção e verificar o provedor de nuvem por trás do IP; (2) ler os
arquivos de schema do Drizzle já existentes, cruzar com
`docs/schema-fisico-detalhado.md`, corrigir tipos numéricos, resolver
"lacunas técnicas puras" (PK, UNIQUE, ON DELETE) e popular um seed de
Macro_Categorias/Headers_UI/Hierarquia_Proteina, deixando de fora
NocoDB ("está sendo removido deste projeto"); (3) parar, gerar diff, abrir
PR; (4) só rodar `drizzle-kit push` numa sessão futura, após "Autorizado".

### Por que Fase 2 não foi executada: a premissa não existe neste repositório

Verifiquei antes de tocar em qualquer schema (regra do projeto: verificar
código, documentação e banco antes de agir; não presumir que instrução
implica que a coisa já existe):

- **Drizzle não está instalado.** `package.json` não tem `drizzle-orm`
  nem `drizzle-kit` (só `pg` puro). `find`/`grep` em todo o repositório,
  incluindo `git log --all`, não encontra nenhum arquivo ou commit
  mencionando "drizzle" em nenhum momento da história do projeto.
- **`docs/schema-fisico-detalhado.md` não existe.** Não está no
  filesystem, não está no histórico do git, nenhum arquivo com nome
  parecido em `docs/`. A instrução se refere a itens específicos desse
  documento (ex.: "Lacuna #1 — Valor_Base_Por_Pessoa") como se eu já o
  tivesse lido antes — não tenho esse documento em lugar nenhum.
- **"NocoDB está sendo removido deste projeto" não está registrado em
  nenhum lugar.** `docs/DECISOES.md` tem uma decisão `APROVADA` dizendo
  exatamente o oposto, reafirmada em várias sessões anteriores (inclusive
  nesta mesma conversa, mais cedo): "PostgreSQL é o banco de dados
  central. NocoDB funciona como interface administrativa sobre o
  PostgreSQL." Remover o NocoDB por completo é a maior reversão de
  arquitetura possível neste projeto — exatamente o tipo de decisão que
  a seção "Processo de Governança de Decisões" (também `APROVADA`) exige
  debate prévio formato Contexto/Decisão/Consequência antes de ser
  implementada. Não decidi isso sozinho, nem tratei como fato.

Dado isso, "ler o Drizzle e cruzar com o documento" e "corrigir/resolver
lacunas" não são tarefas executáveis — não há o que ler nem o que
corrigir. Escrever um schema Drizzle inteiro do zero (15+ tabelas,
incluindo todas as regras de CASCADE/RESTRICT, precisão numérica e
remoção do NocoDB) e apresentar como se fosse "a correção do documento"
seria inventar tanto a base quanto a análise de lacunas — exatamente o
que a regra "NÃO INVENTE" deste projeto proíbe. Não fiz isso.

**Pergunta para você resolver de manhã:** este plano (Drizzle + Postgres
de produção direto, sem NocoDB) foi discutido em outro lugar (outro chat,
conversa com o sócio) e ainda não chegou a virar uma decisão registrada
aqui? Se for para seguir em frente, preciso de um `docs/DECISOES.md`
formalizando a remoção do NocoDB (Contexto/Decisão/Consequência) e do
`docs/schema-fisico-detalhado.md` real (ou a permissão explícita para eu
mesmo redigir esse levantamento a partir do `docs/BANCO.md` + NocoDB ao
vivo, como ponto de partida, antes de desenhar o schema Drizzle).

### Fase 1.3 — verificação de provedor de nuvem (feita, resultado inconclusivo por natureza do IP)

O método sugerido na instrução (`curl ifconfig.me`) **não verifica nada
sobre o servidor de produção** — ele só revela o IP público desta própria
máquina, não o do alvo `100.121.229.81`. Não rodei esse passo por não
servir ao propósito pedido; fiz a verificação correta em vez disso:

- **RDAP/WHOIS em `100.121.229.81`** (`rdap.arin.net`): o IP está dentro
  do bloco `100.64.0.0/10`, registrado para IANA como **"Shared Address
  Space" (RFC 6598 — Carrier-Grade NAT)**. Isso não é um IP público
  atribuível a um provedor de nuvem específico via WHOIS — é o mesmo
  intervalo que o Tailscale usa para endereços de tailnet (o próprio
  `100.77.218.36`, do NocoDB/"ender", está no mesmo bloco). Ou seja,
  **nem Oracle Cloud nem Vultr aparecem em lugar nenhum da consulta
  pública** — o WHOIS nunca vai dizer qual provedor está por trás de um
  IP Tailscale, isso só dá pra ver de dentro da própria máquina (ex.: via
  SSH, consultando o endpoint de metadata do provedor) ou no painel de
  billing do provedor. Não decidi qual dos dois está certo, como
  instruído — só constatei que a pergunta não tem resposta via IP
  sozinho.
- **Teste de reachability TCP puro** (`Test-NetConnection`, porta 5432):
  `TcpTestSucceeded: True` — há algo real escutando naquela porta nesse
  nó Tailscale. `PingSucceeded: False` (ICMP bloqueado, comum e
  irrelevante).
- **Teste de conexão Postgres real (`SELECT version()`) não foi possível
  completar** — ver achado de ambiente abaixo (`pg` sumiu do
  `node_modules` no meio da sessão). Não tentei de novo depois de piorar
  o `node_modules` com as tentativas de reinstalação (ver abaixo) para
  não arriscar mais nada no ambiente antes de você revisar.

### Achado de ambiente (não relacionado à missão, mas bloqueia a regra "tsc/eslint/testes antes de marcar como pronto")

`node_modules` está corrompido: `vitest`, `eslint` e `typescript`
apareceram como `invalid` no `npm ls` (faltando `package.json` dentro do
próprio pacote instalado). Tentei reparar com `npm ci --legacy-peer-deps`
e depois `npm install --legacy-peer-deps` — **as duas tentativas falharam
com `EPERM: operation not permitted, rmdir`** em pacotes diferentes
(`acorn`, depois `@emnapi/core`), mesma classe de erro "Acesso negado" já
visto nesta sessão com o Turbopack (`.next/dev`) — o projeto está num
compartilhamento de rede (`Z:\` → `\\ender\Compartilhado\anjos_eventos`)
que não permite ao npm apagar certas entradas durante uma reinstalação.

**Risco que eu mesmo introduzi:** essas duas tentativas de `npm
ci`/`npm install` abortaram no meio, o que pode ter deixado o
`node_modules` num estado PIOR do que antes (o `pg` sumiu entre uma
tentativa e outra, confirmado ao tentar testar a conexão de produção
acima). Não tentei mais nada depois disso para não aprofundar o dano.
Efeito prático: **não consegui rodar `tsc`, `eslint` nem `vitest` nesta
sessão** — nenhuma das duas checagens de qualidade da regra combinada
pôde ser feita. Como não alterei nenhum arquivo de código-fonte esta
noite (só `.env`, que é local/gitignored, e este arquivo de
documentação), não há código novo para essas ferramentas validarem — mas
o ambiente precisa de uma reinstalação limpa de `node_modules` antes de
qualquer trabalho de código futuro (idealmente fora deste compartilhamento
de rede, ou com permissões elevadas — mesma raiz do problema do
Turbopack já visto nesta sessão).

### Achado à parte: pilha de trabalho não commitado desde 2026-09-08

`git status` mostra `Dockerfile`, `docs/BANCO.md`, `docs/DECISOES.md`, e
10 arquivos em `src/` modificados sem commit — o conteúdo bate com várias
sessões já registradas neste arquivo entre 2026-09-09 e 2026-09-12 (todas
descritas como "commitado, um por commit" nos seus próprios resumos, mas
o `git log` do HEAD atual para no commit de 2026-09-08). Também há
arquivos soltos não rastreados (`requirements.txt`, `next-env.d.ts`,
`scripts/_2X68O~Y`, `tsconfig.tsbuildinfo`) sem explicação óbvia. **Não
toquei em nada disso** — não dava pra validar com `tsc`/`eslint`/`vitest`
quebrados (ver acima), e não é escopo desta missão. Só documentando para
você não perder de vista: parece que várias sessões passadas produziram
trabalho real que nunca chegou a ser commitado de fato.

### O que fiz de fato esta noite

1. `.env` preenchido com a `DATABASE_URL` de produção fornecida — só
   localmente, `.env`/`.env.*` já estava (e continua) no `.gitignore`
   (confirmado, nenhuma mudança necessária). Nada além do teste de
   reachability acima leu essa variável.
2. Verificação de provedor via WHOIS/RDAP + teste de porta (acima) — sem
   decidir Oracle vs. Vultr.
3. Este relatório.

Não instalei Drizzle, não escrevi nenhum arquivo de schema, não gerei
diff, não abri PR (nada legítimo pra colocar num PR ainda), não toquei na
Fase 4. Único commit desta sessão: este arquivo.

---

## 🔴 PRIORIDADE MÁXIMA — Bug financeiro confirmado: mistura de unidades no motor de dimensionamento (2026-09-09)

**Isso é dinheiro real — todo cardápio com item por Unidade misturado com
itens por grama na mesma macro-categoria está com o Valor Sugerido
inflado, hoje, em produção.**

### O que o Pedro reportou

Testou um cardápio (Entrada: Linguiça Toscana + Canudinho de Batatonese;
Acompanhamentos: Arroz Branco com Alho Crispy + Farofa Simples + Farofa
de Bacon; Carnes: Fraldinha na Mostarda + Coxinha da Asa de Frango;
Saladas: Tomate e Pepino com Cebola + Tomate com Cebola) e obteve Valor
Sugerido de R$157,10/pessoa, suspeitando estar errado.

### Investigação — CONFIRMADO com dados 100% reais

Escrevi `src/lib/precificacao-cardapio.mistura-unidades.test.ts`,
reproduzindo os 4 preparos que sobreviviam ao cálculo (ver achado
separado abaixo sobre os outros 5), com custo real via
`GET /api/preparos/:id/custo` e pesos/tetos reais do NocoDB:

- Macro "Entradas e Petiscos" tem teto de **120g**. `distribuirPorcoes`
  divide esse teto proporcionalmente ao peso entre Linguiça Toscana e
  Canudinho de Batatonese (ambos Peso_Atratividade=1) → **60 "unidades do
  teto" pra cada um**. Semanticamente isso é 60 GRAMAS (a unidade da
  macro), mas:
- Linguiça Toscana tem `Rendimento=10` com `UOM Rendimento=Unidade`
  (10 salsichas, não 10 gramas). Canudinho de Batatonese tem
  `Rendimento=1 Unidade`.
- Em `calcularPrecificacaoCardapio`
  (`src/lib/precificacao-cardapio.ts`), o custo por item é
  `custo_total_preparo / rendimento` (isso vira **custo POR UNIDADE
  VENDIDA** pra esses dois) **multiplicado direto pelos "60"** vindos do
  dimensionamento — **sem nenhuma conversão de unidade em lugar nenhum do
  código**. O motor trata "60 gramas de teto" como "60 salsichas" e "60
  canudinhos".
- Resultado: `custo_cardapio_por_pessoa` ≈ R$112,79, sendo **97% disso**
  vindo só desses 2 itens pequenos de entrada. `valor_sugerido_por_pessoa`
  ≈ R$157,92 — bate com o R$157,10 reportado (diferença de centavos
  esperada por arredondamentos de outras etapas).
- Depois de eu corrigir o achado separado abaixo (Header_UI faltando),
  testei de novo no Simulador de Cardápio com os 9 itens reais do Pedro:
  **R$156,17/pessoa** — praticamente igual, confirmando que a mistura de
  unidades é a causa DOMINANTE (não a exclusão silenciosa, que era um
  problema real mas secundário).

O teste trava os números exatos que o código produz HOJE — é documentação
viva do bug, não uma trava "correta". Rodar
`npx vitest run src/lib/precificacao-cardapio.mistura-unidades.test.ts`
pra ver a reconstituição completa comentada no teste.

### NÃO CORRIGIDO — decisão de negócio pendente do Pedro

Não decidi como converter. Não é trivial: pra Linguiça Toscana dá pra
derivar um "peso médio por unidade" (0,6kg de insumo / 10 unidades =
60g/salsicha) e converter os "60g de teto" em "1 unidade equivalente"
antes de multiplicar pelo custo por unidade. Mas **Canudinho de
Batatonese é um item MONTADO** (a composição inteira — Batatonese,
Canudo Romanha, Cebola Crispy, Cheiro Verde — produz "1 unidade"; não há
peso-por-unidade natural derivável dela). Ou seja, "converter unidade →
grama pelo peso médio do rendimento" funciona pra alguns casos e não pra
outros — não dá pra aplicar uma regra genérica sem decisão explícita.

Perguntas que precisam da sua decisão antes de eu tocar em
`distribuirPorcoes` ou `calcularPrecificacaoCardapio`:

1. Pra preparos com `UOM Rendimento = Unidade` dentro de uma macro medida
   em grama/ml, como o motor deve interpretar a "porção calculada" (que
   sai em g/ml) — arredondar pra cima pro número inteiro de unidades mais
   próximo? Sempre 1 unidade fixa por pessoa, ignorando o teto da macro?
   Outra regra?
2. Pra itens "montados" tipo Canudinho de Batatonese, sem peso-por-unidade
   natural, precisa de um campo novo no schema (ex.: `Peso_Por_Unidade`
   manual em Preparos) pra esse caso específico, já que não dá pra
   derivar da composição?
3. Isso deveria ser uma validação de CADASTRO (bloquear/avisar ao criar
   um Preparo com `UOM Rendimento=Unidade` sem informar como ele se
   comporta dentro de uma macro em gramas), em vez de só uma correção no
   motor de cálculo?

### Achado complementar — CORRIGIDO (não era decisão de negócio, só dado faltando)

Dos 9 preparos do cardápio de teste, **5 não tinham nenhum Header_UI
vinculado** (Farofa Simples, Farofa de Bacon, Fraldinha na Mostarda,
Coxinha da Asa de Frango, Tomate com Cebola — todos os 39 preparos
criados na sessão de cardápios comerciais, na verdade, incluindo Costela).
Sem Header_UI, `resolverItensPorPreparoIds` exclui o preparo do cálculo
inteiro, silenciosamente. Corrigido: vinculei os 38 preparos afetados aos
Headers_UI corretos (Carnes Vermelhas/Suínas/Aves conforme
Subcategoria_Proteina, Saladas Frescas, Arroz e Risotos, Acompanhamentos
Rústicos, Massas, Entradas Quentes/Frias, Sobremesas, Guarnições Leves e
Legumes pra Maionese Tradicional) — são categorias já existentes no
sistema, não uma decisão nova. Verificado: os 9 preparos do teste do
Pedro agora entram todos no cálculo.

Também corrigido (não é decisão de negócio, é visibilidade de um dado que
já existia): `itensExcluidos` era computado pelo backend mas nunca
aparecia em nenhuma tela — agora Criar Evento e Simulador de Cardápio
mostram um aviso destacado sempre que algum item selecionado foi
descartado do cálculo, listando qual e por quê.

## Sessão 2026-09-12 — diagnóstico de timeout do NocoDB + risco de confiabilidade (nada corrigido)

Investigação pedida pelo Pedro depois de ver "Arroz Branco com Alho
Crispy" e "Canudinho de Batatonese" falharem por timeout na ferramenta
de diagnóstico (`docs/PENDENCIAS_NOTURNAS.md`, seção do bug de mistura
de unidades). Só diagnóstico — nada foi alterado no motor, no timeout
nem em cache.

### Diagnóstico: NÃO é recorrência do esgotamento de pool anterior

O restart do NocoDB (sessão de 2026-09-11) resolveu um erro real e
explícito: `KnexTimeoutError: Knex: Timeout acquiring a connection. The
pool is probably full`, logado pelo próprio NocoDB. Essa falha de agora
é diferente:

- `docker logs senhor-churrasco-db-nocodb-1 --since 20m | grep -i
  "knex\|timeout\|error"` — **zero ocorrências**. O NocoDB não registrou
  nenhum erro no momento das falhas.
- `pg_stat_activity` no Postgres do NocoDB, checado logo depois:
  16 idle, 1 active, 5 em branco — pool longe de esgotado.
- Medindo isoladamente: uma chamada simples (`GET /records/:id`) leva
  ~0,5-1,1s. A rota real de custo de um preparo (`GET
  /api/preparos/:id/custo`, que internamente busca o preparo + os links
  de composição + um insumo por linha de composição) levou **3,43s**
  rodando sozinha, sem nenhuma concorrência.
- `src/lib/nocodb.ts` usa `AbortSignal.timeout(5000)` — 5 segundos fixos,
  em todo `nocodbGet`/`nocodbEnviar`, sem variável de ambiente pra
  ajustar.

**Conclusão provável:** o gargalo não é o pool do Postgres do NocoDB —
é a combinação de (a) nenhum cache além de Macro_Categorias/
Hierarquia_Proteina (`TAG_MACRO_CATEGORIAS`), então toda chamada ao
Simulador ou à ferramenta de diagnóstico busca Preparo/Composição/
Insumos do zero no NocoDB; (b) fan-out alto por item — cada preparo
dispara várias chamadas HTTP sequenciais/dependentes só pra calcular o
custo (preparo → links de composição → N insumos), e mais outras pra
resolver peso/macro-categoria (`resolverItensPorPreparoIds`); (c)
**busca duplicada do mesmo registro de Preparo** — `resolverItensPorPreparoIds`
e `calcularCustoPreparo` buscam o mesmo `Preparo` cada um por conta
própria, sem compartilhar o resultado; (d) tudo isso roda em paralelo
via `Promise.all` pra cada item selecionado, então um cardápio de 4-9
itens gera dezenas de chamadas HTTP concorrentes contra uma única
instância NocoDB (CE, recursos modestos). Com uma chamada isolada já
perto de 3,4s, é esperado que sob essa concorrência algumas cheguem a
passar dos 5s do `AbortSignal.timeout` — sem o NocoDB nunca chegar a
errar por conta própria. Ou seja: hoje é o nosso client que desiste
cedo demais, não o NocoDB que está de fato indisponível.

**Não decidido/não corrigido:** se a resposta é cachear Preparo/
Composição/Insumo (e por quanto tempo — esses dados mudam com que
frequência?), eliminar a busca duplicada do Preparo entre os dois
módulos, aumentar o timeout, ou reduzir a concorrência (lote em vez de
tudo em paralelo). Fica pro Pedro decidir junto com o problema de
confiabilidade abaixo, já que as duas coisas têm a mesma causa raiz.

### 🟡 Problema à parte (confiabilidade, não é o bug de unidade): exclusão silenciosa por timeout torna o resultado não-determinístico

Achado ao usar a própria ferramenta de diagnóstico: quando um item
falha por timeout (`calcularCustoPreparo`/`resolverItensPorPreparoIds`
retornando erro pra aquele preparo específico), ele cai em
`itensExcluidos` e o cálculo segue só com os itens que responderam a
tempo — **exatamente o mesmo caminho que já existe pra "peso/macro não
configurados"** (não é um bug novo de lógica, é o comportamento padrão
de exclusão parcial se aplicando também a uma falha de rede transitória).
Isso significa que **o mesmo cardápio, com os mesmos convidados, pode
gerar Valor Sugerido Total diferente em tentativas diferentes**,
dependendo de qual item aleatoriamente sofreu timeout naquela chamada —
o aviso "N itens não entraram no cálculo" aparece na tela (já é visível,
não é silencioso pro usuário), mas o número final ainda sai e pode ser
usado sem que a causa (timeout de rede, não falta de dado cadastral)
fique clara.

Perguntas que precisam da decisão do Pedro antes de mexer em
`resolverItensParaPrecificacao`/`calcularDebugCardapio`:

1. Cache mais agressivo em Preparo/Composição/Insumo, reduzindo a
   chance de timeout na origem?
2. Retry automático (quantas tentativas, com que backoff) só para itens
   que falharam por timeout, distinguindo isso de "sem peso/macro
   configurados" (que é falha de dado, não de rede, e não deveria ter
   retry)?
3. Bloquear o cálculo inteiro (erro, sem valor nenhum) se qualquer item
   falhar por timeout, em vez de seguir parcial? Isso evita o número
   errado silencioso, mas pode deixar o Simulador inutilizável toda vez
   que o NocoDB estiver sob carga.

## Sessão 2026-09-09 (fila autônoma) — filtros, layout de cards, hub de navegação

**Resumo da fila** (ordem de execução): Prioridade 0 (investigação do bug
financeiro, ver seção no topo deste arquivo — NÃO corrigido, decisão
pendente) → Prioridade 1 (filtros em Preparos) → Prioridade 2 (Cardápios
Feitos em cards) → Prioridade 3 (hub de navegação "Senhor Churrasco").
Todas as Prioridades 1-3 foram implementadas, testadas (tsc/eslint/vitest
+ browser) e commitadas, uma por commit. A Prioridade 0 ficou só
investigada e documentada, conforme instruído — nenhuma alteração na
regra de negócio de precificação foi feita.

### Posicionamento/nome não especificado — pra revisar (regra de trabalho autônomo)

- **Filtros de Preparos**: coloquei o campo de busca por nome e o select
  de Categoria juntos, numa faixa horizontal no topo da lista (dentro do
  mesmo card branco, acima da primeira linha), busca ocupando mais
  espaço (`flex-1`) e o select com largura fixa menor. Não foi
  especificado onde exatamente; escolhi manter tudo dentro do card já
  existente em vez de um bloco separado, pra não mudar a estrutura da
  página. `src/components/lista-preparos.tsx`.
- **Cardápios Feitos — critério do filtro**: você deixou em aberto ("por
  faixa de preço, ou por ter/não ter preço fixo"). Escolhi **ter/não ter
  preço fixo** (3 opções: Todos/Com preço fixo/Sem preço fixo) em vez de
  faixa de preço, porque é a distinção que já existe no schema
  (`Preco_Fixo_Por_Pessoa` nullable) e é a mais imediatamente útil pra
  quem administra os cardápios — uma faixa de R$ exigiria inventar
  intervalos arbitrários sem pedido explícito de quais. Se preferir por
  faixa também, me avise que eu adiciono.
- **Cardápios Feitos — layout**: troquei a lista de linhas por grid de
  cards (`grid-cols-1 sm:grid-cols-2`), removi o container "card único"
  que envolvia a lista (cada cardápio agora é seu próprio card) e alarguei
  a página de `max-w-2xl` pra `max-w-4xl` pra caber 2 colunas
  confortavelmente. Preço fixo aparece como badge no canto superior
  direito do card (laranja se tiver preço, cinza "Sem preço fixo" se não).
- **Nome do botão/hub de navegação**: escolhi **"Senhor Churrasco"** em vez
  de "Buffet" (a outra opção sugerida no pedido). Razão: "Buffet" é
  ambíguo porque o sistema também atende Anjos Cerimonial e Em Plena
  Natureza — "Senhor Churrasco" identifica sem ambiguidade a qual das três
  empresas aquelas funcionalidades pertencem. Rota escolhida:
  `/senhor-churrasco`. **Pedro, confirme se o nome serve ou se prefere
  outro.**

### Resolvido e executado

1. **Filtro por Categoria + busca por nome em Preparos**: implementado em
   `src/components/lista-preparos.tsx`, filtragem 100% client-side (a
   lista de preparos já vem inteira do servidor; não há paginação, então
   não fazia sentido ida-e-volta ao servidor pra filtrar). Categoria usa
   as mesmas 8 opções já existentes em `CATEGORIAS_PREPARO`
   (`src/lib/preparos-opcoes.ts`). Testado manualmente no browser: busca
   por "arroz" reduziu corretamente pros 4 preparos com esse nome; filtro
   "Carnes" mostrou só os preparos dessa categoria.
2. **Cardápios Feitos em layout de cards**: `src/lib/cardapios-modelo.ts`
   passou a expor `precoFixoPorPessoa` e `quantidadeItens` (o count de
   `Cardapio_Modelo_Itens` já vem de graça no registro básico do NocoDB,
   sem round-trip extra) em `CardapioModeloResumo`. Grid de cards com
   preço e contagem visíveis sem precisar abrir/editar, badge de preço
   fixo, e filtro Todos/Com preço fixo/Sem preço fixo. Testado
   manualmente no browser: os 6 cardápios aparecem com as contagens
   corretas (14, 14, 16, 21, 11, 14 itens) e o filtro "Sem preço fixo"
   corretamente mostra "Nenhum cardápio encontrado" (os 6 atuais têm
   preço fixo).
3. **Hub de navegação "Senhor Churrasco"**: criada `/senhor-churrasco`
   (`src/app/senhor-churrasco/page.tsx`) com links pra Preparos, Cardápios
   Feitos e Simulador de Cardápio (mesmo estilo de card usado na Home). A
   Home (`src/app/page.tsx`) teve as 3 entradas soltas removidas do array
   `funcionalidades`, ficando só com Agenda unificada + o novo bloco
   "Senhor Churrasco" — grid mudado de 3 pra 2 colunas (6→4 blocos,
   3 colunas deixava um bloco sozinho na segunda linha). Testado
   manualmente no browser: Home mostra só 2 blocos ativos + os 2
   desabilitados de sempre; hub mostra os 3 links; cada um navega pra
   sua página; "← Início" do hub volta corretamente pra Home.

## AGUARDANDO RETOMADA — Etapa 3 do Motor de Pacotes Fixos (pausada em 2026-09-08)

Pausada a pedido do Pedro pra priorizar a tarefa de cadastro dos cardápios
comerciais (ver `docs/referencia-cardapios-comerciais.md`). Etapas 1
(schema) e 2 (núcleo puro + testes) já estão prontas e commitadas —
`src/lib/pacote-fixo.ts` (`avaliarTrocaPacoteFixoCriarEvento`,
`quebrarPacoteFixoSimuladorPublico`). Falta só a Etapa 3: integração com
as telas (Criar Evento e Simulador Público).

**Pergunta em aberto que travava o início da Etapa 3** (registrar aqui pra
não se perder, retomar quando a Etapa 3 voltar à fila): como resolver
`Custo_Por_Pessoa_Cardapio_Modelo_Original` — o custo por pessoa do
Cardápio Modelo ORIGINAL completo, usado como referência fixa pra
`avaliarTrocaPacoteFixoCriarEvento` calcular a diferença a cada edição.
Não é óbvio de onde esse valor deve vir nem quando deve ser "congelado":

- Ele precisa ser calculado uma vez, no momento em que o Cardápio Modelo
  é carregado no Criar Evento (antes de qualquer edição do usuário), e
  guardado em algum lugar pelo resto da sessão de edição daquele
  orçamento/evento — mas onde? Não existe hoje nenhum campo em
  `Orcamentos` ou `Eventos` pra guardar esse "custo por pessoa original
  congelado do template". Precisaria de uma nova coluna (schema
  adicional, fora do que já foi aprovado nesta feature) ou dá pra
  recalcular sob demanda a partir do `Cardapio_Modelo` vinculado (supondo
  que o vínculo com o template original seja preservado em algum lugar,
  o que também não está claro que hoje é o caso — o fluxo atual de
  "Começar de um Cardápio Pré-Montado" no Criar Evento é só um
  pré-preenchimento que NÃO cria vínculo permanente, conforme decisão
  registrada anteriormente. Isso pode entrar em conflito direto com essa
  feature nova, que parece precisar de um vínculo rastreável com o
  template original pra sempre poder recalcular contra ele).
- Se o Cardápio Modelo original em si for editado depois (alguém muda o
  `Preco_Fixo_Por_Pessoa` ou a composição dele na tela "Cardápios
  Feitos"), o "original" usado como referência no evento já criado deve
  continuar sendo o que existia no momento em que o evento foi criado, ou
  deve seguir o template ao vivo? Isso é uma decisão de negócio, não
  técnica — não decidir sozinho quando a Etapa 3 for retomada.

Não decidi nada disso sozinho — só documentei a pergunta antes de pausar,
conforme pedido.

## Sessão 2026-09-07 (noite, continuação) — fila: PR base correta + Simulador de Cardápio + cache + investigação cascade delete

### Posicionamento de UI não pedido explicitamente (regra 8 — pra revisar)

- Link de navegação "Simulador de Cardápio" na Home: foi pedido
  explicitamente "junto aos de Agenda/Preparos/Cardápios Feitos", mas a
  posição exata dentro da grade (logo depois de "Cardápios Feitos", antes
  de "Contratos e confirmação") foi escolha minha, não especificada.
  Arquivo: `src/app/page.tsx`.

### RESOLVIDO — decisão do Pedro em 2026-09-08

**Inconsistência no desconto de criança no Valor Sugerido Total** —
encontrada ao construir a página do Simulador de Cardápio (item 2 desta
fila), reaproveitando `calcularPrecificacaoCardapio` (já validado na
Etapa 4). Não decidi nada sozinho, só documentei e segui:

- A fórmula documentada em docs/DECISOES.md ("Precificação por Cardápio
  Selecionado...") diz: `Valor_Sugerido_Total_Evento =
  (Valor_Sugerido_Por_Pessoa × Num_Convidados) + Taxa_Deslocamento +
  (Quantidade_Garcom × Valor_Garcom)` — usando Num_Convidados (todo mundo,
  adulto ou criança) multiplicado pelo preço cheio.
- A mesma seção também diz "Criança paga meia sobre
  Valor_Sugerido_Por_Pessoa" — mas essa meia-entrada NÃO aparece em lugar
  nenhum da fórmula do Total acima. Ou seja, pela fórmula escrita, uma
  criança "conta" no Total como se pagasse o valor cheio de um adulto.
- Isso já está implementado de dois jeitos DIFERENTES no código hoje,
  ambos "corretos" à sua própria maneira:
  - `src/lib/precificacao-cardapio.ts`
    (`calcularPrecificacaoCardapio.valor_sugerido_total_evento`, usado
    pelo motor/Server Action): segue a fórmula escrita ao pé da letra —
    preço cheio × todos os convidados, sem desconto de criança.
  - `src/components/formulario-evento-churrasco.tsx` (variável
    `valorSugerido`, só um preview client-side no Criar Evento, não
    gravado no banco): calcula separado —
    `qtdAdultos × precoPessoa + (criancas) × precoCriancaMeia + garçom + taxa`
    — esse SIM aplica o desconto de criança.
  - Isso significa que hoje, com convidados mistos (adultos + crianças), o
    "Valor Sugerido Total" que aparece pro usuário em Criar Evento é
    DIFERENTE do `valor_sugerido_total_evento` que o motor retornaria pro
    mesmo cardápio/convidados.
- Pra construir o Simulador de Cardápio (que só tem "Número de
  convidados" total, sem separar adulto/criança — não recebi pedido pra
  adicionar esse detalhamento), usei o `valor_sugerido_total_evento` do
  motor tal como ele vem, sem tentar "consertar" ou duplicar a lógica do
  Criar Evento. Isso significa que o Simulador mostra o Total sem desconto
  de criança, enquanto Criar Evento mostra o Total com desconto de
  criança — os dois nunca vão bater se houver criança na conta.

**Pergunta**: qual das duas é a regra correta?
- (a) O Total deve aplicar meia-entrada de criança (aí a fórmula escrita
  em DECISOES.md está incompleta e o motor server-side precisa ser
  corrigido pra receber a quantidade de crianças separadamente); ou
- (b) O Total realmente ignora a idade pro cálculo agregado (aí é o
  preview client-side do Criar Evento que está errado e deveria ser
  removido/trocado pelo valor do motor).

**Decisão do Pedro**: o desconto de meia-entrada de criança se aplica
SOMENTE no fluxo de Criar Evento — o Simulador de Cardápio isolado
continua sem distinção de idade, por design, e não deve ser "corrigido"
numa sessão futura. Implementado via função separada
`calcularPrecificacaoParaEvento` (em vez de parâmetro opcional na função
existente), pra não haver risco de o Simulador herdar o comportamento por
engano. Detalhes completos da divergência entre as duas telas registrados
em docs/DECISOES.md, seção "Precificação por Cardápio Selecionado...",
subseção "Valor_Sugerido_Total_Evento diverge por tela — NÃO UNIFICAR".

### Resolvido e executado

1. **PR de `feature/cardapios-pre-montados`**: aberto com a base correta
   (`feature/motores-precificacao-e-preparos`, não `master`), evitando
   duplicar os 18 commits da primeira branch. `gh` CLI ainda não
   disponível neste ambiente — link de criação manual:
   `github.com/Pedro-Paitax/anjos-eventos/compare/feature/motores-precificacao-e-preparos...feature/cardapios-pre-montados?quick_pull=1`.
   Nenhum PR foi mergeado.
2. **Página dedicada do Simulador de Cardápio** (`/simulador-cardapio`):
   reaproveita `calcularPrecificacaoAction` sem duplicar lógica (mesma
   Server Action da Etapa 4). UI: número de convidados, seletor de
   cardápio por categoria (reusa `SeletorCardapio`), toggle de Região
   Metropolitana de Curitiba, quantidade/valor de garçom (mesmo padrão do
   Criar Evento), e exibição de Valor Sugerido por Pessoa / Criança
   (meia) / Total — nenhum custo interno exposto (`custo_cardapio_total`,
   copeira, assador nunca aparecem). Testado manualmente no browser:
   convidados=40, Pão de Alho (Entrada) + Alcatra Grelhada (Carnes),
   toggle de região funcionando (R$250,00). Bloqueia corretamente com o
   mesmo erro de "peso/macro-categoria não configurados" já conhecido —
   não é bug novo. Nenhum dado foi gravado em banco (página não persiste
   nada), então não houve necessidade de limpeza de dado de teste.
   Link de navegação adicionado na Home, junto aos de Agenda/Preparos/
   Cardápios Feitos, como pedido explicitamente.

## Sessão 2026-09-07 (tarde/noite) — fila: PR + TETO + Etapa 4 + Cardápios Pré-Montados

### Resolvido e executado

1. **PR de tudo que foi feito na sessão**: branch
   `feature/motores-precificacao-e-preparos` criada a partir do `master`
   (18 commits: Motor de Custo, Motor de Dimensionamento, CRUD de
   Preparos+Composição, Motor de Margem, Simulador de Orçamento, remoção
   do campo `veiculo`, Precificação por Cardápio + Etapa 4) e enviada pro
   `origin`. **Em aberto**: o `gh` CLI não está instalado neste ambiente,
   então o PR em si não foi aberto automaticamente — o link pra abrir
   manualmente foi passado ao Pedro
   (`github.com/Pedro-Paitax/anjos-eventos/pull/new/feature/motores-precificacao-e-preparos`).
2. **Arredondamento TETO do Valor_Sugerido_Por_Pessoa**: já estava
   corrigido de uma correção anterior na mesma sessão (ceiling pra
   centavos via `arredondarParaCimaCentavos`, não pro Real inteiro) —
   revalidado, 20/20 testes passando.
3. **Etapa 4 — Criar Evento com Precificação por Cardápio**: concluída e
   testada manualmente no browser (seleção de cardápio → debounce →
   Server Action → motores de dimensionamento/custo funcionando ponta a
   ponta; toggle de Região Metropolitana de Curitiba funcionando).
   Bloqueia corretamente com "Nenhum item do cardápio selecionado pôde
   ser calculado" — pendência já conhecida (ver abaixo), não é bug desta
   entrega.
4. **Cardápios Pré-Montados (Senhor Churrasco)** — feita em 2 sub-etapas
   como pedido:
   - Schema no NocoDB (`Cardapios_Modelo`, `Cardapio_Modelo_Itens`) +
     tela "Cardápios Feitos" isolada (listar/criar/editar/excluir, sem
     guard de referência). Testado no browser: criar → editar → excluir,
     sem resíduo confirmado via API.
   - Integração com Criar Evento: seletor "Começar de um Cardápio
     Pré-Montado" que só pré-popula o `SeletorCardapio` (via remount),
     sem vínculo permanente — testado removendo um item pré-populado
     livremente após aplicar o template.
   - Links de navegação pra "Preparos" e "Cardápios Feitos" adicionados
     na Home (pendência de navegação já conhecida desde o CRUD de
     Preparos).

Todos os itens: `tsc --noEmit` 0 erros, `eslint` 0 erros (1 warning
pré-existente em `db.ts`), `vitest run` 20/20 passando, um commit por
item.

### Ainda em aberto (precisa do Pedro)

- **Abrir o PR da branch `feature/motores-precificacao-e-preparos`** —
  `gh` CLI ausente neste ambiente; link de criação manual já fornecido.
- **`Peso_Atratividade`/`Subcategoria_Proteina` vazios em todos os
  Preparos reais no NocoDB**: bloqueia qualquer cálculo de dimensionamento
  (incluindo a Precificação por Cardápio) até serem preenchidos. Não é um
  bug de código — é dado operacional faltando.
- **Simulador de Cardápio (página dedicada)**: a orquestração/Server
  Action já existe (`precificacao-evento.ts` + `calcularPrecificacaoAction`,
  reaproveitada pelo Criar Evento), mas não há uma tela própria ainda —
  mencionado no pedido original, não fazia parte da fila desta sessão.

## Sessão anterior (histórico, já revisado pelo Pedro)

### Resolvido e executado

1. **Origem_Dado de Ovino/Peixe em Hierarquia_Proteina**: confirmado que
   "Dado Operacional" está correto (validado com o sócio) — não era
   divergência. `docs/DECISOES.md` atualizado.
2. **Status desatualizado de "Motor de custo"/"Motor de dimensionamento"**:
   `docs/DECISOES.md` reescrito com os status `IMPLEMENTADA / VALIDADA`.
3. **Schema financeiro para o Motor de Margem**: criado no NocoDB
   (`Orcamentos.Valor_Base_Por_Pessoa`, `Desconto_Tipo`, `Desconto_Valor`
   + tabela `Orcamento_Itens_Adicionais`). Motor de Margem implementado
   em `GET /api/orcamentos/:id/margem-projetada`.
4. **Contrato do Simulador de Orçamento**: formalizado em
   `docs/DECISOES.md` e depois implementado em
   `GET /api/orcamentos/:id/simulador` (sem auth, só rate limiting —
   decisão explícita do Pedro).
5. **Campo `veiculo`**: removido de fato — Postgres (`ALTER TABLE`,
   tabela estava vazia), `database/init/01-schema.sql`,
   `src/lib/eventos.ts`, `src/app/actions/evento.ts`, e os dois
   formulários de evento. Ghost column e tabela `Veiculos` residual no
   NocoDB removidas manualmente pelo Pedro, confirmado via API.

### Ainda em aberto (sem mudança desde então)

- **Cache de Hierarquia_Proteina/Macro_Categorias**: direção definida
  (revalidateTag + webhook do NocoDB), não implementado — melhoria de
  performance futura, não bloqueante.
- **Exclusão de Orçamentos (hard delete com CASCADE)**: PENDENTE.
- **Garçom (receita x custo)**: PENDENTE, não alterar sem decisão.

## Auditoria de segurança/código — sem achados

Sem segredos hardcoded, sem chamadas ao NocoDB do lado do cliente, sem
TODO/FIXME em `src/`.

## Decisões do corte de produção (Pedro, 2026-09-21) — checklist em docs/CHECKLIST_CORTE_PRODUCAO.md

1. **Escopo**: incluir as 6 tabelas faltantes (`usuarios`, `contratos`,
   `Cardapios_Modelo`+`Cardapio_Modelo_Itens`, `Hierarquia_Proteina`,
   `Configuracoes_Globais`, `Orcamento_Itens_Adicionais`). Pré-requisito
   não-opcional.
2. **Escrita durante o corte**: CONGELAR edições no NocoDB durante toda a
   janela. Sem escrita dupla, sem reconciliação depois.
3. **Onde o app roda pós-corte**: Oracle (mesmo servidor do banco), não o
   ender. Direção decidida; **pendente de confirmação final do Pedro
   antes do dia do corte**.
4. **ETL "truncate + reload"**: APROVADO, com trava — só no dia do corte
   real (Fase B do checklist), nunca em sessão de dev/teste. O script
   exige `--confirmo-producao` explícito nesse modo.

**Mudança de prioridade**: Fase A começa já, módulos em paralelo (Grupo A
= risco financeiro, paridade valor a valor bloqueante; Grupo B = risco
baixo, equivalência de lista/contagem). Parar e chamar o Pedro se: (a)
paridade do Grupo A divergir; (b) surgir dependência oculta que mude o
escopo do corte.

### PENDENTE COM PRAZO — Backup do Oracle (item 5 do checklist, 2026-09-21)

Não foi possível confirmar backup automático: sem OCI CLI/credencial nesta
máquina, sem script de `pg_dump`/cron no repo, docs só listam como requisito.

- **Backup de hardware (snapshot OCI):** decisão do Pedro (2026-09-22) —
  **sem snapshot de hardware por ora**, custo acima do esperado no Always
  Free Tier. Backup lógico (`pg_dump`) é a estratégia de recuperação
  primária por ora. **Pendência NÃO bloqueante**: revisitar opções de
  custo da política de backup da OCI quando houver tempo, sem pressão de
  corte.
- **Backup de dado (`pg_dump` diário off-site):** NÃO implementado. Precisa
  existir ANTES do Dia do Corte (Fase B do checklist). Não bloqueia a
  Fase A de hoje.
- **Regra:** não migrar mais dado real de produção pro Oracle sem isso
  resolvido.

**Desenho do backup de dado (decidido pelo Pedro, 2026-09-21):** roda no
`ender` (cron), `pg_dump -Fc` do Postgres do Oracle, upload via `rclone` pro
Google Drive do Pedro (escopo `drive.file`, OAuth autorizado uma vez),
retenção de 30 dias. Conta de serviço descartada: sem cota em Drive pessoal.

- **Status do backup de dado (2026-09-21):** `scripts/backup-pg-oracle.sh`
  (commit `fb78980`) testado à mão de ponta a ponta: dump -> `pg_restore
  --list` -> upload -> conferência de tamanho no Drive; arquivo baixado do
  Drive lista as 18 tabelas e traz 54/122/236 linhas de preparos/insumos/
  composição (bate com o Oracle). Cron diário 03:30 no `ender` instalado.
  **1ª execução automática confirmada (2026-09-22 03:31:50-03:00):**
  `ultimo-status.txt` = `OK 2026-09-22T03:32:52-03:00
  anjos-eventos-2026-09-22.dump (68090 bytes); 3 backup(s) no Drive`. Cron
  funcionando sem intervenção. Retenção de 30 dias só foi exercitada em
  dry-run (ainda não há arquivo com 30 dias).
  Sem alerta de falha: se o cron falhar, só se descobre lendo
  `ultimo-status.txt`/`backup.log`. Snapshot de hardware (OCI) segue com o
  Pedro no console.
- **Decisão consciente — sem criptografia adicional:** backup do Drive sem
  `rclone crypt`. Aceito por ora porque o Drive é conta pessoal e o escopo
  `drive.file` já isola o acesso; contém dados de clientes/contratos. Revisar
  se o Drive for compartilhado no futuro ou se o volume de dado sensível
  crescer.
- **Limitação conhecida — credencial no `ps`:** o `DATABASE_URL` (com senha)
  fica visível na lista de processos do `ender` durante o `pg_dump`. Aceito
  por ser máquina de um usuário só; não é um não-issue, e deixa de ser
  aceitável se o `ender` passar a ter outros usuários.
- **Dependência conhecida:** o backup depende de o `ender` estar ligado e do
  Tailscale até o Oracle. Se o `ender` cair, não há dump.

### Fase A — estado dos módulos do Grupo A (2026-09-21)

**Modo truncate+reload do ETL implementado (2026-09-21, commit `4148bb7`) —
SÓ DIA DO CORTE, nunca executado com escrita.** `scripts/etl-corte-producao.ts`
trunca (sem CASCADE) e recarrega as 14 tabelas de catálogo numa transação
única; não toca `usuarios`/`contratos`/`eventos`/`empresas`. Escrita exige
`--write --confirmo-producao --confirmo-banco=100.121.229.81`,
`DIA_DO_CORTE=<data de hoje>` e `ultimo-status.txt` do backup = OK com < 26h;
sem isso recusa (exit 2) antes de conectar. Validado: `tsc`/`eslint`, 10 testes
das travas, 4 recusas reais no servidor, dry-run (plano por tabela bate com as
contagens atuais do Oracle). NÃO validado: a escrita em si (TRUNCATE + recarga).
Os dois ETLs viraram `preparar()`+`gravar(tx)` e seguem rodando standalone.

**ETL das 4 tabelas do NocoDB executado (2026-09-21, autorizado pelo Pedro):**
`scripts/etl-tabelas-complementares.ts --write` (commit `936977b`), após backup
funcionando. Carregado no Oracle: hierarquia_proteina 5, configuracoes_globais
1, cardapios_modelo 6, cardapio_modelo_itens 90; orcamento_itens_adicionais 0
(único item do NocoDB não tem Orçamento vinculado, pulado, nada simulado).
`usuarios` e `contratos` NÃO carregados: ficam pro Dia do Corte (Fase B).

Push aditivo do schema (migração 0001, commit `0cdc60a`) aplicado no Oracle
com autorização, em transação única após ensaio com ROLLBACK. Só estrutura:
tabelas novas vazias. **ETL das 6 tabelas NÃO autorizado** (aguarda o backup
`pg_dump` off-site acima).

| Módulo | Estado | Paridade (leitura NocoDB x Oracle) |
|---|---|---|
| `custo-preparo` | migrado atrás de `DATA_SOURCE` | **VALIDADA**: 54/54 preparos, 0 divergências |
| `hierarquia-proteina` | migrado | **VALIDADA** após ETL: 5 = 5 entradas |
| `dimensionamento-cardapio` (`resolverItensPorPreparoIds`) | migrado | **VALIDADA** após ETL: 46 = 46 resolvidos, 8 = 8 excluídos, 0 divergências em 54 preparos |
| `dimensionamento-cardapio` (`calcularDimensionamentoOrcamento`) | migrado | sem dado (Orçamentos 0 linhas no Oracle; 1 placeholder no NocoDB) |
| `precificacao-evento` | só deixa de exigir token NocoDB no modo oracle | herda a paridade acima |
| Grupo B `insumos` | migrado (leitura + escrita) | leitura **VALIDADA**: 122 = 122. Escrita NÃO validada contra banco |
| Grupo B `cardapios-modelo` | migrado (leitura + escrita) | leitura **VALIDADA**: 6 cardápios e 90 itens idênticos. Escrita NÃO validada |
| Grupo B `preparos` | migrado (leitura + escrita) | leitura **VALIDADA**: 54 preparos, listas por categoria e composição idênticas. Escrita NÃO validada contra banco (as 2 incompatibilidades form x schema foram resolvidas em código, abaixo) |
| Grupo B `debug-calculo-cardapio` | migrado (só deixa de exigir token NocoDB no modo oracle; orquestra funções já migradas) | **VALIDADA** por equivalência: 7 fatias de cardápio modelo (6 cardápios), resultado idêntico campo a campo, 0 divergências, 0 inconclusivos. Amostra, não os ~90 itens: cardápio inteiro estoura o timeout de 5s do NocoDB, então a fatia é dividida até o NocoDB responder (1ª rodada: 1 fatia falhou só por timeout do NocoDB, não por valor) |
| Grupo B `simulador-orcamento` | migrado (Lacuna 1: `valor_total_estimado` = valor sugerido por pessoa em tempo real × convidados, `Valor_Base_Por_Pessoa` ignorado; erro público genérico) | **sem dado para paridade de valor** (0 Orçamentos no Oracle, 1 placeholder no NocoDB). Só equivalência de "Orçamento inexistente": 404 idêntico nos dois modos |
| `margem-orcamento` | migrado (Lacuna 1 aplicada, ver abaixo) | sem dado: 0 Orçamentos no Oracle, 1 placeholder no NocoDB. Não testado contra dado |

**LOTE 4 DA FASE B EXECUTADO — DATA_SOURCE=oracle + DEPLOY + SMOKE TEST
COMPLETO (2026-09-22, ~10:10, autorizado pelo Pedro). CORTE DE PRODUÇÃO
CONCLUÍDO.**

**Achado que mudou o escopo**: o checklist original pressupunha deploy
via Docker ("build fora do servidor" + "container"), mas o servidor
Oracle nunca teve Docker instalado — só Postgres nativo, Node 20 e PM2
(instalados em sessão anterior, nunca usados). Não existia nginx, `git`
nem porta de app aberta no firewall. Decisão do Pedro (2026-09-22):
sem Docker, sem nginx, sem domínio — acesso só via nome Tailscale +
porta (`oracle:3001`), igual ao padrão já usado pra `ender:3001` hoje.

**Acesso SSH ao servidor Oracle**: até então nunca usado nesta migração
por este agente. `Windows Lite BR` (usuário local) estava bloqueado pela
política do Tailscale SSH; `opc@100.121.229.81` (usuário padrão de
instância Oracle Cloud) funcionou após uma verificação adicional via
navegador (aprovada pelo Pedro). O Tailscale SSH gerencia a chave do
host pelo próprio tailnet — não há prompt clássico de fingerprint
OpenSSH nesse modelo.

**Deploy**: build feito no ender a partir de `git archive HEAD`
(commit `4213a41`, checkout limpo, sem lixo do working tree) — mesmo
padrão já usado por `scripts/paridade-endpoint.ts`. `npm ci
--legacy-peer-deps` + `npm run build` (output `standalone`, já
configurado em `next.config.ts`). Bundle (62MB: `server.js` +
`node_modules` mínimo + `public` + `.next/static`) transferido via
`scp` (não `rsync` — não instalado no ender) para
`~/anjos-eventos-app/` no Oracle. `ecosystem.config.js` do PM2 criado
com `DATABASE_URL` (Oracle, mesma do `.env`), `DATA_SOURCE=oracle`,
`NOCODB_API_TOKEN` (mantido, pra rollback), `PORT=3001`,
`HOSTNAME=0.0.0.0`. Firewall: nenhuma mudança necessária — `tailscale0`
já estava na zona `trusted` (ACCEPT irrestrito) desde a configuração
inicial do servidor. `pm2 start` + `pm2 save`: processo `online`, sem
erros nos logs (`✓ Ready in 0ms`).

**Smoke test completo (todos os itens pedidos pelo Pedro, via app real,
não script)**:
1. **Login**: `/login` lista os 5 usuários corretos (Pedrinho, Pedro,
   Ivonete, Matheus, Nicolly). Server Action testada via `curl`
   replicando o protocolo RSC exato do form (multipart + campo
   `$ACTION_ID_...`) — `POST /login` com `usuarioId=2` devolveu
   `303 See Other`, `Set-Cookie: usuario_atual=2`, `Location: /`.
2. **Simulador de Cardápio** (`/simulador-cardapio`): `200`, conteúdo
   real renderizado (campo Convidados, título Simulador).
3. **Criar Evento** (`/agenda/novo`): `200`, lista as 3 empresas reais
   (Buffet Senhor Churrasco, Anjos Cerimonial, Em Plena Natureza
   Chácara de Eventos).
4. **Cardápios Feitos** (`/cardapios-modelo`): `200`, os 6 cardápios
   reais aparecem (Cardápio 01-05 + Costela Fogo de Chão).
5. **`GET /api/preparos/2/custo`** (endpoint real do app, não script):
   `{"preparo":"Vinagrete","custo_total_preparo":16.96,...}` —
   **R$16,96, bate exatamente**.

**Acesso final confirmado pro Pedro testar no navegador dele:
`http://oracle:3001`** (nome Tailscale MagicDNS do nó Oracle,
confirmado via `tailscale status`).

**NocoDB e Postgres do ender continuam ligados**, como instruído — nada
foi desligado. Desligamento só depois de 48-72h de estabilidade
observada (Fase C do checklist), com aprovação do Pedro.

**LOTE 3 DA FASE B EXECUTADO — usuarios/contratos copiados + Eixo 1
validado (2026-09-22, ~09:44, autorizado pelo Pedro):** 5 `usuarios`
copiados do Postgres local (`anjos-eventos-db`) pro Oracle preservando
IDs (1 Pedrinho, 2 Pedro, 3 Ivonete, 4 Matheus, 5 Nicolly), `contratos`
igual nos dois lados (0 linhas — nada a copiar). Sequences resincronizadas
(`usuarios_id_seq`=5). Confirmado de forma independente por query direta
no Oracle. `scripts/verificar-eixo1-oracle.ts` rodado contra o Oracle: os
3 cálculos de referência batem exatamente — Vinagrete R$16,96, Alcatra
Grelhada R$64,93, Arroz Branco com Alho Crispy R$20,07. **Migração
preservou a matemática do motor de custo, não só os dados brutos.**

**LOTE 2 DA FASE B EXECUTADO — TRUNCATE + RELOAD COM ESCRITA REAL
(2026-09-22, ~09:32, autorizado pelo Pedro):** `DIA_DO_CORTE=2026-09-22
npx tsx scripts/etl-corte-producao.ts --write --confirmo-producao
--confirmo-banco=100.121.229.81` no ender. Transação única commitada,
sequences resincronizadas. Contagens pós-carga conferidas de forma
independente (query direta no Oracle, não só o self-report do script):
`insumos=122, macro_categorias=10, headers_ui=15, preparos=54,
composicao=236, header_preparo=54, orcamentos=0, itens_orcamento=0,
itens_evento_confirmados=0, hierarquia_proteina=5,
configuracoes_globais=1, cardapios_modelo=6, cardapio_modelo_itens=90,
orcamento_itens_adicionais=0` — todas batem com o esperado. Receita real
da Costela (Id 32) sobreviveu à recarga (confirmado). Ponto de retorno:
os 2 `pg_dump` de hoje (NocoDB + Postgres local, ver Lote 1 acima) — sem
snapshot de hardware, decisão registrada acima.

**Dry-run do truncate+reload reexecutado (2026-09-22, 09:xx), depois do ETL
das 4 tabelas complementares já carregado:** `npx tsx
scripts/etl-corte-producao.ts` (sem `--write`, sem nenhuma trava exigida)
no "ender". As 14 tabelas do plano batem exatamente com o estado atual do
Oracle (ex.: `insumos 122->122`, `preparos 54->54`, `composicao 236->236`,
`cardapios_modelo 6->6`, `cardapio_modelo_itens 90->90`,
`hierarquia_proteina 5->5`, `configuracoes_globais 1->1`); `orcamentos`,
`itens_orcamento`, `itens_evento_confirmados`, `orcamento_itens_adicionais`
seguem 0->0 (mesmos 2 registros placeholder do NocoDB pulados de sempre,
avisos não-bloqueantes). **Nada foi truncado nem escrito** — só leitura e
plano impresso, como sempre.

**Reconfirmação ao vivo do achado "cardápio 8 diverge" (2026-09-22, 08:54):**
a sessão da noite de 2026-09-21 tinha registrado (só em memória, não neste
arquivo) uma divergência aparente na fatia cardápio 8, preparos
`[12,20,21,24]`, antes da versão final do teste acima existir. Rodei de novo
a mesma fatia com o teste já commitado (`paridade-grupo-b-debug-simulador.
integration.test.ts`, via SSH em "ender",
`RUN_PARIDADE=1 npx vitest run ...`, log completo com o Pedro): a fatia
estourou o timeout de 5s do NocoDB de novo e foi dividida em `[12,20]` e
`[21,24]` — as duas metades vieram **idênticas** (0 divergências nas 7
fatias da suite inteira). **Sem divergência de valor financeiro real.**
Conclusão: o achado antigo foi um falso positivo da versão anterior do
teste, que ainda não distinguia timeout/erro de transporte do NocoDB de
divergência de valor real (a versão atual, usada aqui, já faz essa
distinção). Módulo `debug-calculo-cardapio`/`simulador-orcamento`
permanece desbloqueado, sem pendência de decisão do Pedro.

**Paridade pelo ENDPOINT REAL (2026-09-21):** `scripts/paridade-endpoint.ts`
faz build do `git HEAD` num diretório próprio (`~/.paridade-endpoint-app` no
`ender`), sobe 2 instâncias standalone (:3101 `DATA_SOURCE=nocodb`, :3102
`oracle`), compara status + corpo JSON campo a campo e derruba tudo. Só
leitura. Resultado: `GET /api/preparos/{id}/custo` **54/54 idênticos, 0
divergências**; 10 casos de borda idênticos (id 999999/0/abc/-1 em preparos e
`/api/orcamentos/{999999,0}/{dimensionamento,margem-projetada,simulador}` —
404/400 equivalentes). As rotas não têm auth/middleware, nada foi contornado.
Ressalva: o NocoDB devolveu 502 por timeout de 5s da lib em 14 preparos de
muitos insumos na 1ª rodada (falha de transporte, não de valor; o Oracle
respondeu 200); o script repete SÓ esse 502 (até 4x) e conta — 12 repetições
na rodada final. Fora do teste: orçamentos com dado real (0 no Oracle, 1
placeholder no NocoDB; não simulado) e as rotas `/api/nocodb/preparos` e
`/api/revalidate`. Reproduzir: `ssh ender 'cd /srv/share/anjos_eventos &&
npx tsx scripts/paridade-endpoint.ts [--reuse-build]'`.

**`margem-orcamento` — Lacuna 1 aplicada (decisão do Pedro, 2026-09-21).**
No modo oracle, `Valor_Base_Por_Pessoa` é ignorado (dado morto do modelo
antigo). Receita = `valor_sugerido_por_pessoa` (precificação em tempo real)
× `Num_Convidados` + Σ `orcamento_itens_adicionais` − desconto aplicado
sobre esse TOTAL. Taxa de deslocamento e garçom ficam fora (o Orçamento não
guarda região/quantidade de garçom). Custo projetado inalterado (mesmo laço,
agora sobre dimensionamento/custo já migrados). Modo nocodb preservado
literalmente. **Sem teste contra dado**: não há Orçamento real em nenhum dos
lados.

**Grupo B — escrita NÃO validada contra banco; as 2 decisões do Pedro sobre
`preparos` foram tomadas e aplicadas (2026-09-22).** Só as leituras têm
teste de equivalência (escrever em produção está fora do escopo
autorizado). As escritas (`criar/atualizar/excluir` de preparo, cardápio
modelo e insumo) foram implementadas em transação Drizzle, mas nunca
executadas: validar num smoke test supervisionado, com backup, na Fase B.
As duas incompatibilidades formulário×schema de `preparos` foram
resolvidas no formulário, não no schema:
1. `UNIDADES_RENDIMENTO_PREPARO` (`src/lib/preparos-opcoes.ts`) restrito a
   `G`/`ML`/`Unidade` — `KG`/`Pessoas` removidos do `<select>`. Confirmado
   ao vivo: 0 Preparos reais usavam `KG`/`Pessoas` (39 G, 8 Unidade, 7 ML).
2. `modoPreparo` agora `required` no `<textarea>`
   (`src/components/formulario-preparo.tsx`).
As checagens em `paraLinhaOracle` (`src/lib/preparos.ts`) continuam como
defesa em profundidade contra chamada direta da Server Action fora do
formulário — não removidas, só o texto do erro atualizado (não citam mais
"decisão pendente"). `apresentacao_utensilio` não faz parte do formulário e
não é alterada em updates. `nocodb.ts` NÃO foi removido: o modo `nocodb`
(default e rollback) ainda o usa.

Aviso: `custo-preparo`/`dimensionamento` em modo oracle ignoram o token do
NocoDB, mas o cache por tag (`/api/revalidate`, webhook do NocoDB) deixa de
ser disparado por edições no Oracle — revisar invalidação antes do corte.

## Sessão 2026-09-17 (continuação 2) — --write concluído com sucesso, Eixo 1 validado no Oracle

Placeholder da Costela (ver seção 🔴 abaixo) gravado no NocoDB, dry-run
re-rodado (54/54 Preparos, zero erros), `--write` executado.

### Contagens finais no Oracle — batem exatamente com o dry-run

| Tabela | Linhas |
|---|---|
| insumos | 122 |
| preparos | 54 |
| composicao | 236 |
| macro_categorias | 10 |
| headers_ui | 15 |
| header_preparo | 54 |
| empresas | 3 |
| orcamentos | 0 |
| itens_orcamento | 0 |
| itens_evento_confirmados | 0 |

### Eixo 1 de validação — CONFIRMADO contra o Oracle (não mais o NocoDB)

`scripts/verificar-eixo1-oracle.ts` (commit `13a6efe`) recalcula os 3
preparos de referência consultando o Postgres novo via Drizzle,
replicando a fórmula de `src/lib/custo-preparo.ts`:

- Vinagrete: R$16,96 (referência R$16,96) — BATE
- Alcatra Grelhada: R$64,93 (referência R$64,93) — BATE
- Arroz Branco com Alho Crispy: R$20,07 (referência R$20,07) — BATE

Migração preservou a matemática do motor de custo, não só o dado bruto.

### Validação de ambiente

`tsc --noEmit` 0 erros, `eslint` 0 erros/warnings, `vitest run` 35/35 —
sem regressão, rodado depois do `--write` real.

### NÃO tocado (conforme instruído)

NocoDB de produção não foi desligado nem reconfigurado. O app real
continua apontando pro sistema antigo (`.env.local`, não alterado) —
nenhum corte de produção foi feito. Eixo 2 continua ADIADO (ver seção
acima desta mesma sessão).

## Sessão 2026-09-17 (continuação) — --write bloqueado: "Costela" sem Modo de Preparo

Autorizado o `--write`. Rodou, mas **falhou e fez rollback limpo**
(transação única funcionou exatamente como desenhado — nada ficou
gravado pela metade; `insumos`/`preparos`/`composicao`/
`macro_categorias`/`headers_ui` continuam em 0 linhas no Oracle,
`empresas` mantém as 3 copiadas antes).

**Causa raiz**: `preparos.modo_preparo` é `NOT NULL` (docs/schema-fisico-detalhado.md),
mas o Preparo **"Costela" (Id 32) tem `Modo de Preparo` vazio no
NocoDB**. O script não validava isso antes de tentar inserir — a
violação de constraint só apareceu no meio da transação real. Corrigido
(commit `c4ceef3`): agora `Nome Do Preparo`/`Rendimento`/`Modo de
Preparo` são validados no dry-run, então isso aparece como erro
bloqueante ANTES de qualquer tentativa de escrita, não durante.

Dry-run pós-correção: **53/54 Preparos válidos**, só "Costela"
bloqueando.

**Decisão pendente do Pedro** (não decidi sozinho, é dado de negócio
real faltando, não lacuna técnica): como tratar o Costela sem Modo de
Preparo?
1. Preencher o campo no NocoDB antes de rodar a ETL de novo (mais
   simples, resolve na origem).
2. Migrar todo o resto agora e excluir só o Costela desta rodada
   (soft-skip pontual), migrando ele depois de corrigido.
3. Tornar `modo_preparo` nullable no schema novo (mudança de design,
   diverge do documento recebido).

Nenhuma das três foi escolhida — `--write` continua não executado.

## Sessão 2026-09-17 — desenho da ETL aprovado, script escrito e validado em dry-run, 3 empresas copiadas pro Oracle

Antes de escrever código, apresentei o desenho completo (ordem de
extração, mapeamento de campo, preservação de ID, estratégia de
transação) e o Pedro aprovou com 3 decisões: **Eixo 2 adiado** (não
reduzido, não simulado — ver abaixo), **mapa fixo de Empresa
confirmado**, **Itens_Evento_Confirmados incluído como Fase G**.

### 🔴 Eixo 2 (Teste de Snapshot Transacional) — ADIADO, registrado formalmente

Não há dado real suficiente: **1 único Orçamento no NocoDB inteiro**,
com `Status`, `Empresa` e `Num_Convidados` vazios e `Cliente_Nome`
literalmente `"Cliente_Nome"` (placeholder). **0 linhas em
Itens_Orcamento.** O plano exige 5 Orçamentos complexos reais — não
existe hoje, e não inventamos dado de orçamento pra simular passagem no
teste (decisão explícita do Pedro, 2026-09-17). **Isso não bloqueia o
restante da migração** (Preparos/Insumos/Composição/Macro_Categorias/
Headers_UI têm dado real completo). `docs/plano-migracao-postgres-vultr.md`
precisa de uma nota equivalente — ainda não editado lá, só aqui; fazer
isso é o próximo passo de documentação, não travou a ETL.

### Achado: Itens_Evento_Confirmados também é placeholder

Único registro (`Id 1`) tem `Evento`, `Preparo`, `Quantidade_Confirmada`
e `Custo_Unitario_Snapshot` todos vazios/nulos — e nem `Eventos` no
NocoDB nem `eventos` nativo têm qualquer linha real hoje. Fase G do
script trata isso corretamente como "soft skip", não como erro.

### Script escrito e validado (`scripts/etl-nocodb-para-postgres.ts`, commit `ae952ee`)

`tsc`/`eslint`: 0 problemas. `vitest run`: 35/35, sem regressão.
Dry-run executado de verdade contra o NocoDB de produção (só leitura):

- Insumos 122/122, Preparos 54/54, Composição 236/236, Macro_Categorias
  10/10, Headers_UI 15/15 — **zero erros**, todos os enums batem 100%
  com o dado real.
- Orcamentos 0/1, Itens_Orcamento 0/0, Itens_Evento_Confirmados 0/1 —
  soft skip, como esperado (ver achados acima).
- Amostra de 3 Preparos + 5 Insumos transformados mostrada ao Pedro
  pra revisão visual antes de qualquer escrita.

**Bug pego e corrigido antes do dry-run final**: a ordem de
carregamento de env (`.env.local` por cima de `.env`, convenção do
Next.js) faria o script escrever no Postgres local antigo
(`localhost:5433`) em vez do Oracle — silenciosamente, porque
`localhost:5433` também tem uma tabela `empresas` real. Corrigido +
adicionada checagem de segurança que aborta se `DATABASE_URL` resolvida
não contiver o IP conhecido do Oracle, independente da ordem de
carregamento.

### Empresas copiadas pro Oracle (ação isolada, autorizada explicitamente, já executada)

As 3 linhas de `empresas` (Buffet Senhor Churrasco id=1, Anjos
Cerimonial id=2, Em Plena Natureza Chácara de Eventos id=3) foram
copiadas do Postgres nativo local pro `app_db` no Oracle, **preservando
os mesmos IDs**, com `created_at` original e sequence resincronizada.
Conferido: `app_db.empresas` tinha 0 linhas antes (checado no script
antes de inserir, abortaria se já tivesse dado), 3 linhas depois,
idênticas às da origem. Isso destrava o mapeamento de Empresa em
Orçamentos futuros — não é mais uma pendência.

### NÃO executado

`--write` do script de ETL não foi rodado. Nenhum Preparo/Insumo/
Composição/Macro_Categoria/Header_UI foi inserido no Oracle ainda —
aguardando o Pedro confirmar a amostra revisada antes de autorizar.

## Sessão 2026-09-16 (tarde) — drizzle-kit push executado contra Oracle Cloud (autorizado)

Autorizado explicitamente pelo Pedro ("Autorizado: rode npx drizzle-kit
push"). Antes de rodar, confirmei de novo que `app_db` (Oracle Cloud,
100.121.229.81) estava vazio: `information_schema.tables` fora dos
schemas de sistema retornou 0 linhas.

`npx drizzle-kit push` → "Changes applied". Estrutura conferida depois
via `information_schema.tables`/`columns`: **11 tabelas criadas**,
todas batendo exatamente com o DDL revisado em
`drizzle/0000_hot_madame_hydra.sql` (mesmos nomes de coluna, tipos,
enums, nullability).

Validação pós-push: `tsc --noEmit` 0 erros, `eslint` 0 erros/warnings,
`vitest run` 35/35 — sem regressão com o banco real já populado.

**NÃO iniciado**: nenhum script de ETL escrito ou executado. Nenhuma
leitura em massa do NocoDB de produção. Isso fica pra próxima etapa,
com o script de extração revisado pelo Pedro antes de rodar contra
produção — mesmo sendo só leitura, é o primeiro contato real com o
dado de produção nesta migração.

O NocoDB/Postgres de produção do "ender" não foi tocado em nenhum
momento desta sessão — nenhum comando rodou contra a porta do NocoDB
nem contra o Postgres dele.
