# Pendências Noturnas — sessões autônomas

Histórico das sessões autônomas. Pendências de sessões já revisadas pelo
Pedro ficam marcadas como resolvidas; o que ainda depende dele fica em
aberto, com prioridade.

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
