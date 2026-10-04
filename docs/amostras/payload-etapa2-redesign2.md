# Redesign 2, Etapa 2: comparação do payload dos formulários (antes × depois)

Método (sem navegador logado, sem banco): cada formulário foi renderizado no servidor (`renderToStaticMarkup`, vitest no `ender`, a partir de `git archive HEAD`) com dados fictícios e `action` vazia. De cada `input`, `select`, `textarea` e `button` foram extraídos, em ordem de aparição: tag, `type`, `name`, `value`, `checked`, `required`, `min`, `max`, `step`, `readOnly`, `disabled`; e a lista de `<option>` (valor e selecionada). Como o `FormData` é função só disso, nomes, ordem, tipos e valores iguais significam payload igual.

"Antes" = `717211d` (fim da Etapa 1). "Depois" = `c578fd2` (Etapa 2).

| Formulário (caso) | Controles | Resultado |
|---|---|---|
| Colaborador (novo, existente) | 5 e 5 | idêntico |
| Insumo | 5 | idêntico |
| Cardápio modelo (novo) | 4 | idêntico |
| Preparo (novo) | 17 | idêntico |
| Evento genérico (novo, existente) | 11 e 11 | idêntico |
| Evento churrasco (novo, existente, com cardápio confirmado) | 33, 33 e 31 | idêntico |
| Orçamento genérico | 7 | idêntico |
| Orçamento churrasco | 15 | idêntico |
| Decisões operacionais | 11 | idêntico |
| Confirmar evento (churrasco, genérico) | 16 e 18 | idêntico |

Exemplo de linha comparada: `input|text|nome|value=|checked=false|req=true|min=|max=|step=|ro=false|dis=false`.

**Limites desta comparação:** é a renderização inicial no servidor. Não cobre o que muda só depois da hidratação (campos que o cliente cria ou preenche por estado, como as linhas de composição do preparo e os totais recalculados), nem a leitura de `new FormData(form)` no navegador com valores digitados, nem páginas reais com dados do banco. A Etapa 2 não mudou nenhum `name`, ordem ou tipo no código (só classes, a prop `className` do `Modal` nos chamadores e o conteúdo visual dos componentes base), então a comparação serve de rede de segurança, não de prova completa.
