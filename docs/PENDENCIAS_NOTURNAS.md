# Pendências Noturnas — sessão autônoma

Este documento registrou dúvidas de regra de negócio/schema e divergências
encontradas durante a sessão autônoma noturna. A maioria já foi resolvida
pelo Pedro na sessão seguinte — ver histórico abaixo.

## Resolvido pelo Pedro

1. **Origem_Dado de Ovino/Peixe em Hierarquia_Proteina**: confirmado que
   "Dado Operacional" está correto (validado com o sócio) — não era
   divergência, era o dado certo. `docs/DECISOES.md` atualizado para
   refletir isso. Pendência removida.
2. **Status desatualizado de "Motor de custo"/"Motor de dimensionamento"**:
   `docs/DECISOES.md` foi reescrito pelo Pedro já com os status
   `IMPLEMENTADA / VALIDADA`. Resolvido.
3. **Schema financeiro para o Motor de Margem**: `docs/DECISOES.md` ganhou
   a seção "Arquitetura Financeira do Orçamento" com as colunas/tabela
   exatas a criar em `Orcamentos`. Sendo criado agora.
4. **Contrato do Simulador de Orçamento**: `docs/DECISOES.md` ganhou a
   seção "Contrato do Simulador de Orçamento" com o payload JSON exato.
   Resolvido — endpoint fica pra próxima entrega.
5. **Campo `veiculo` não removido**: autorizado a remover de fato agora
   (Postgres + código). Em execução.

## Ainda em aberto

- **Cache de Hierarquia_Proteina/Macro_Categorias** (`docs/DECISOES.md`,
  seção "Cache de..."): direção definida (revalidateTag + webhook do
  NocoDB com segredo compartilhado em `/api/revalidate`), mas não
  implementado — segue como melhoria de performance futura, não
  bloqueante.
- **Exclusão de Orçamentos (hard delete com CASCADE)**: PENDENTE desde
  antes desta sessão, sem mudança.
- **Garçom (receita x custo)**: PENDENTE desde antes desta sessão, sem
  mudança — não alterar nada aqui ainda, por instrução explícita do doc.

## Item 6 (auditoria de segurança/código) — sem achados, sem pendência

Nenhum segredo hardcoded, nenhuma chamada ao NocoDB do lado do cliente,
nenhum TODO/FIXME encontrado em `src/`. Nada a fazer.
