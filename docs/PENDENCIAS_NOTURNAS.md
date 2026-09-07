# Pendências Noturnas — sessão autônoma

Este documento registra dúvidas de regra de negócio/schema e divergências
encontradas durante o trabalho autônomo, para revisão do Pedro pela manhã.
Nada aqui foi decidido ou corrigido sem autorização explícita.

## Resumo executivo

**Concluído e commitado (4 commits separados):**
- Motor de custo de fichas técnicas (implementado em sessão anterior a
  esta rodada noturna, mas commitado agora pela primeira vez).
- Motor de dimensionamento de cardápio + Vitest configurado (idem).
- Tela de CRUD de Preparos + Composição (item 5 da fila — já estava
  pronta de uma entrega anterior desta conversa; só validei de novo,
  troquei o `confirm()` nativo por um modal com o estilo da página
  (pedido seu no meio da sessão), e commitei).
- Item 4: núcleo puro do motor de custo extraído + 5 testes
  automatizados novos com os 3 casos reais (9 testes no total passando).
- Item 6: auditoria de segurança/código — sem achados.

**Pulado (bloqueado por falta de schema ou de decisão, não por
preguiça — ver seções 2 e 3 pra detalhe completo):**
- Item 2 (Motor de Margem): `Orcamentos` não tem
  `Valor_Base_Por_Pessoa`/`Desconto_Tipo`/`Desconto_Valor`, e a tabela
  `Orcamento_Itens_Adicionais` não existe no NocoDB.
- Item 3 (Simulador de Orçamento): o "contrato JSON já desenhado"
  citado no pedido não existe em nenhum documento do projeto — não
  encontrei onde foi desenhado.

**Decisões que precisam de você, em ordem de prioridade:**
1. **(seção 1)** Ovino/Peixe em `Hierarquia_Proteina` estão como "Dado
   Operacional" mas deveriam ser "Estimativa Heurística" — foi você que
   mudou, ou reverto?
2. **(seção 2)** Motor de Margem: aprovar a criação dos campos
   financeiros faltantes em `Orcamentos` (e decidir o destino de
   `Orcamento_Itens_Adicionais` vs. a tabela órfã `Itens_Do_Orçamento`)
   antes de eu conseguir implementar.
3. **(seção 3)** Simulador de Orçamento: apontar onde está o contrato
   JSON, ou autorizar eu desenhá-lo like uma decisão nova em
   `docs/DECISOES.md`.
4. **(seção 7.1)** Campo `veiculo`: `docs/DECISOES.md` diz que devia
   ter sido removido, mas continua no banco e no código — confirmar se
   ainda quer a remoção.
5. **(seção 7.2)** Atualizar os status de "Motor de custo" e "Motor de
   dimensionamento" em `docs/DECISOES.md` pra refletir que já estão
   implementados e validados (não fiz isso sozinho).

---

## 1. Origem_Dado errada em Hierarquia_Proteina (Ovino/Peixe) — PRECISA DE CONFIRMAÇÃO

**Status: divergência confirmada, NÃO corrigida.**

Estado atual na tabela `Hierarquia_Proteina` (NocoDB, checado agora):

| Subcategoria | Peso_Padrao | Origem_Dado atual |
|---|---|---|
| Carne Vermelha | 2 | Dado Operacional |
| Suíno | 1 | Dado Operacional |
| Aves | 1 | Dado Operacional |
| Ovino | 1.3 | **Dado Operacional** ⚠️ |
| Peixe | 0.9 | **Dado Operacional** ⚠️ |

Conforme `docs/DECISOES.md` (seção "Hierarquia de proteínas"), Ovino e
Peixe deveriam estar marcados como **"Estimativa Heurística"** ("sem
calibração real ainda"), não "Dado Operacional".

**Detalhe importante:** quando criei essa tabela nesta mesma sessão
(entrega anterior, motor de dimensionamento), gravei e **confirmei
byte a byte** que Ovino e Peixe estavam corretos como "Estimativa
Heurística" logo após a criação. O estado atual mostra "Dado
Operacional" para os dois. Não sei a causa dessa mudança — não fiz
nenhuma escrita nessa tabela depois daquela confirmação. Possibilidades:
edição manual no NocoDB por alguém, ou algum efeito colateral que não
identifiquei. Não investiguei mais a fundo pra não gastar tempo da fila
notura em algo que talvez seja só uma correção manual sua mesmo.

**Não corrigi os valores nem a Origem_Dado.** Preciso que você confirme
amanhã:
- Foi você (ou alguém) que mudou manualmente pra "Dado Operacional"? Se
  sim, foi intencional (Ovino/Peixe passaram a ter dado real validado)?
- Ou devo reverter Ovino/Peixe pra "Estimativa Heurística"?

---

## 2. Motor de Margem (item 2 da fila) — BLOQUEADO, não implementado

**Status: não implementado. Tentei, travei em schema faltante, não adivinhei.**

A fórmula de `docs/BRIEFING.MD` seção 7 precisa de:
- `Orcamentos.Valor_Base_Por_Pessoa`
- `Orcamentos.Desconto_Tipo` / `Orcamentos.Desconto_Valor`
- uma tabela `Orcamento_Itens_Adicionais` (receita extra)

Conferi o schema real do NocoDB agora: **nenhum desses existe.**
`Orcamentos` só tem `Cliente_Nome, Evento, Empresa, Num_Convidados,
Status`. Não existe tabela `Orcamento_Itens_Adicionais`. Existe uma
tabela parecida chamada `Itens_Do_Orçamento` (nome quase igual a
`Itens_Orcamento`, que é a tabela real usada pelo motor de
dimensionamento) mas ela só tem um link pra `Preparos` — parece
resíduo de uma versão anterior do schema, não a tabela de receita
adicional documentada.

Isso é exatamente o tipo de "faltam campos" que já aconteceu com
`Peso_Atratividade`/`Subcategoria_Proteina` na entrega do motor de
dimensionamento — mas dessa vez, seguindo sua regra de segurança #2,
**não criei nada no NocoDB sozinho** (seria decisão de schema/negócio
sem sua aprovação registrada).

**Preciso que você decida:**
- Criar os campos `Valor_Base_Por_Pessoa`, `Desconto_Tipo` (select:
  Percentual/Valor Fixo/Nenhum), `Desconto_Valor` em `Orcamentos`?
- Criar a tabela `Orcamento_Itens_Adicionais` (Orcamento, Descricao,
  Valor)? Ou ela deveria ser a `Itens_Do_Orçamento` já existente,
  renomeada/reaproveitada?

Não escrevi nenhum código de rota pra esse item — não faz sentido
implementar contra um schema que não existe e eu não tenho autorização
pra criar.

---

## 3. Endpoint do Simulador de Orçamento (item 3 da fila) — BLOQUEADO, não implementado

**Status: não implementado.**

O pedido cita um "contrato JSON já desenhado" (`header_exibicao` como
agrupamento, `porcao_limitada_por_cap` como campo de debug). Procurei
em todos os docs (`BRIEFING.MD`, `REGRAS_NEGOCIO.md`, `DECISOES.md`,
`ARQUITETURA.MD`, `BANCO.md`, `INDEX.md`) e não encontrei esse
contrato em lugar nenhum — só a menção geral de que o simulador existe
como conceito (`BRIEFING.MD` seção 2). Isso é parecido com o caso do
"cache via revalidateTag/webhook" de uma entrega anterior, que também
não encontrei documentado quando pedido.

Não tenho como "seguir um contrato já desenhado" que não localizei. Não
inventei um contrato de API pública sozinho (é uma decisão de design
que prefiro não tomar sem confirmação, especialmente por ser uma rota
pública/externa).

Além disso, mesmo se eu desenhasse o contrato, o endpoint dependeria do
motor de dimensionamento, que hoje não retorna nada útil pra nenhum
preparo real (nenhum tem `Peso_Atratividade`/`Subcategoria_Proteina`
preenchido ainda — ver pendência já conhecida das entregas anteriores).

**Preciso que você:**
- Aponte onde esse contrato JSON foi desenhado (outro documento? outra
  conversa?), ou
- Confirme que devo desenhar o contrato eu mesmo na próxima sessão,
  como uma decisão registrada em `docs/DECISOES.md` antes de implementar.

---

## 6. Auditoria de segurança/código (item 6 da fila) — CONCLUÍDA, sem achados

Verifiquei todo `src/`:
- **Tokens/segredos hardcoded fora do `.env`:** nenhum encontrado. Só
  referências a `process.env.NOCODB_API_TOKEN` e à URL
  `100.77.218.36:8090` (não é segredo, é o host — já é assim desde antes
  desta sessão em `src/lib/preparos.ts` e `src/app/api/nocodb/preparos/route.ts`).
  Nenhuma credencial do Postgres hardcoded em `src/`.
- **Chamadas ao NocoDB do lado do cliente:** nenhuma. Os componentes
  `"use client"` que referenciam `@/lib/preparos` e `@/lib/insumos`
  (`lista-preparos.tsx`, `formulario-preparo.tsx`, `composicao-preparo.tsx`)
  só importam **tipos** (`import type`), que são apagados no build — o
  código de acesso ao NocoDB roda só em Server Actions/Server Components.
- **TODO/FIXME:** nenhum encontrado em `src/`.

Nenhuma ação necessária aqui.

---

## 7. Auditoria docs/DECISOES.md x implementação real (item 7 da fila)

**Não corrigi o documento — só listando divergências, como pedido.**

1. **Campo `veiculo` NÃO foi removido, mas `docs/DECISOES.md` diz que sim.**
   A seção "Motor logístico" (Status: DESCARTADA) diz explicitamente:
   > Remover o campo Veiculo da tabela Eventos.
   > Remover o campo "Veículo de carga" do formulário de Novo Evento.

   Isso **não aconteceu**. O campo `veiculo` continua presente em:
   - `database/init/01-schema.sql` (coluna `veiculo` na tabela `eventos`,
     com CHECK constraint e COMMENT)
   - `src/lib/eventos.ts` (tipo `Veiculo`, campo em `Evento` e
     `DadosEvento`, usado em SELECT/INSERT/UPDATE)
   - `src/app/actions/evento.ts` (extrai `veiculo` do FormData)
   - `src/components/formulario-evento-churrasco.tsx` (seção "Veículo e
     status" com o select "Veículo de carga")

   Não removi nada disso — é alteração de schema/UI que a própria regra
   de segurança #1 desta sessão me impede de fazer sem aprovação
   explícita já registrada especificamente para essa ação (a decisão diz
   "remover", mas não vi confirmação de que a remoção em si foi
   executada e aprovada além do texto da decisão). Também é redundante
   com a pendência de arquitetura mais ampla: será que o campo deve
   mesmo sumir, ou a decisão ficou só no papel e o Pedro decidiu manter?
   **Preciso que você confirme se ainda quer que eu remova isso, e nesse
   caso, se a remoção da coluna no Postgres deve ser uma migration
   formal (ideal) ou `ALTER TABLE ... DROP COLUMN` direto (mais
   arriscado, exige backup antes).**

2. **Status desatualizado: "Motor de custo" e "Motor de dimensionamento".**
   `docs/DECISOES.md` marca:
   - "Motor de custo" como `Status: DOCUMENTADO / EM IMPLEMENTAÇÃO`
   - "Motor de dimensionamento" como `Status: APROVADA` (sem menção de
     implementação)

   Ambos já foram **implementados E validados** (motor de custo: 3
   casos reais batendo exato + testes automatizados; motor de
   dimensionamento: lógica pura testada com 4 casos, endpoint
   implementado). Os status no documento não refletem mais isso. Não
   troquei os status sozinho — é conteúdo de `docs/DECISOES.md`, que
   você pediu pra eu nunca alterar sem debate prévio registrado.
   Sugestão pra amanhã: atualizar os dois pra `IMPLEMENTADA` ou
   `VALIDADA`, se concordar.

3. Não encontrei outras divergências óbvias nas demais seções
   (Hard Cap, Snapshots financeiros, Receita adicional x custo
   operacional, Extração de Contrato PDF, Exclusão de Orçamentos,
   Picking List Fase 2) — todas continuam corretamente refletindo "não
   implementado ainda" ou "decisão registrada, sem contradição no
   código".

---

