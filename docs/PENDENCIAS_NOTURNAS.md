# Pendências Noturnas — sessões autônomas

Histórico das sessões autônomas. Pendências de sessões já revisadas pelo
Pedro ficam marcadas como resolvidas; o que ainda depende dele fica em
aberto, com prioridade.

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
