# Pendências Noturnas — sessão autônoma

Histórico da sessão autônoma noturna. Todas as pendências levantadas
naquela sessão já foram resolvidas pelo Pedro e executadas.

## Resolvido e executado

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
   `docs/DECISOES.md`. Endpoint em si ainda não implementado — fica pra
   próxima entrega (o motor de dimensionamento já retorna `preparo_id`
   necessário pro contrato).
5. **Campo `veiculo`**: removido de fato — Postgres (`ALTER TABLE`,
   tabela estava vazia), `database/init/01-schema.sql`,
   `src/lib/eventos.ts`, `src/app/actions/evento.ts`, e os dois
   formulários de evento.

## Ainda em aberto (sem mudança desde a sessão noturna)

- **Cache de Hierarquia_Proteina/Macro_Categorias**: direção definida
  (revalidateTag + webhook do NocoDB), não implementado — melhoria de
  performance futura, não bloqueante.
- **Exclusão de Orçamentos (hard delete com CASCADE)**: PENDENTE.
- **Garçom (receita x custo)**: PENDENTE, não alterar sem decisão.

## Auditoria de segurança/código — sem achados

Sem segredos hardcoded, sem chamadas ao NocoDB do lado do cliente, sem
TODO/FIXME em `src/`.
