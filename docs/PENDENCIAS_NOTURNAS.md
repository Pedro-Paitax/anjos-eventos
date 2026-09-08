# Pendências Noturnas — sessões autônomas

Histórico das sessões autônomas. Pendências de sessões já revisadas pelo
Pedro ficam marcadas como resolvidas; o que ainda depende dele fica em
aberto, com prioridade.

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
