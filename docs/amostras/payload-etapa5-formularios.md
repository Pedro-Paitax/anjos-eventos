# Etapa 5: FormData de cada formulário lido no navegador, antes × depois

Método: Chrome headless (CDP) sobre dois builds do ender, "antes" = `ab2d0d9` (fim da Etapa 4) e "depois" = o HEAD da Etapa 5, numa página de prévia com os 11 formulários e **dados fictícios**. Cada formulário foi preenchido pela interface (texto `x_<name>`, número 7, data/hora fixas, 1º valor não vazio dos selects, caixas marcadas) e, nos que têm seletor de itens, foram escolhidos itens no modal (`SeletorCardapio` e `SeletorPreparos`: 2 em "Carnes" e 2 em "Sobremesa"). Lido com `new FormData(form)` **sem enviar** (a action da prévia é vazia). Comparados: lista `name=valor` na ordem e lista `elemento:tipo:name` dos controles nomeados.

| Formulário | Seletor de itens | Entradas | Itens no payload | Resultado |
|---|---|---|---|---|
| Colaborador | não | 4 | 0 | idêntico |
| Insumo | não | 4 | 0 | idêntico |
| Cardápio feito (`SeletorPreparos`) | sim | 6 | 4 (`preparoId`) | idêntico |
| Preparo | não | 17 | 0 | idêntico |
| Evento churrasco (`SeletorCardapio`) | sim | 35 | 8 (`cardapio*` e `preparoIds`) | idêntico |
| Evento churrasco, cardápio confirmado (somente leitura) | não | 27 | 0 | idêntico |
| Evento genérico | não | 10 | 0 | idêntico |
| Decisões operacionais | não | 10 | 0 | idêntico |
| Confirmar evento | não | 15 | 0 | idêntico |
| Orçamento genérico | não | 6 | 0 | idêntico |
| Orçamento churrasco (`SeletorCardapio`) | sim | 18 | 8 | idêntico |

Exemplo (Cardápio feito): `nome=x_nome`, `descricao=x_descricao`, `preparoId=21`, `preparoId=22`, `preparoId=51`, `preparoId=52`. Os ids e nomes são os da prévia, inventados.

A única diferença bruta em qualquer formulário é o campo interno `$ACTION_ID_<hash>`, que o Next gera por build.

**Limites:** o `SimuladorCardapio` também usa o `SeletorCardapio`, mas não tem `<form>` (não envia nada), então não entra no payload. Os formulários rodaram na prévia sem sessão nem banco: o cardápio pré-montado e o cálculo de preço (actions de servidor) não foram exercitados nesta comparação (o primeiro foi coberto em `payload-etapa4-orcamento-churrasco.md`).

## Caixa de seleção customizada (por teclado)

Mesmo método, só que a caixa é focada e alternada com a **barra de espaço** (evento de tecla real, sem clique), duas vezes. Resultado idêntico antes × depois:

| Formulário | Inicial | Após Espaço | Após 2º Espaço |
|---|---|---|---|
| Colaborador (`ativo`) | `ativo=on` | (ausente) | `ativo=on` |
| Decisões operacionais (`colaboradorIds`) | `colaboradorIds=1` | (ausente) | `colaboradorIds=1` |
| Região Metropolitana (campo oculto `regiaoMetropolitanaCuritiba`) | `=false` | `=true` | `=false` |

Foco visível ao chegar por Tab: `outline` sólido de 2 px em `#ffc089` com `outline-offset: 2px`. Contraste medido nos estilos computados: caixa marcada (`#f2753f`) sobre o painel `superficie`: **6,07:1**; marca ✓ (`#1a0e08`) sobre a caixa: **6,66:1**; borda da caixa desmarcada (`#8a7e73`) sobre o painel: **4,36:1**. Tamanho 24 × 24 px; o rótulo clicável mede 44 px de altura.
