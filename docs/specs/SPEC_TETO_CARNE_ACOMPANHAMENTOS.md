# SPEC — Teto de carne 450 g, redução por acompanhamentos e fim do hard cap em Carnes

> **DECISÃO FINAL (2026-11-05, em produção) — prevalece sobre os números deste texto.**
> Onde a SPEC fala em "teto de 450 g" e "piso de 360 g", leia: **450 g comprados = 315 g servidos**,
> **piso de 252 g** servidos, **referência de 5 acompanhamentos** e **redução de 5 % por acompanhamento**.
> Valores gravados em `configuracoes_globais` (`teto_carne_piso_g` = 252, `acomp_referencia` = 5,
> `acomp_reducao_por_item` = 0,05). Decisões e números em `docs/DECISOES.md`, seção "Teto de carne 450 g comprados…".

> Pedido do Pedro em 04/11/2026. Destinatário: Claude Code no repositório `anjos-eventos`.
> Base lida: branch `automacao-deploy` (commit `a6309ea`), `src/lib/dimensionamento-cardapio.ts`, `docs/REGRAS_NEGOCIO.md` (seções 8, 11 e 12), `src/db/schema/catalogo-complementar.ts`.

## 0. Regras desta tarefa

- **Não commitar, não dar push, não fazer merge.** O Pedro faz o commit e o merge de tudo junto. Deixe as mudanças no working tree de uma branch nova (`teto-carne-acompanhamentos`) criada a partir da branch de trabalho atual. Se não for óbvio qual é a branch de trabalho, pergunte.
- **Não aplicar nada em produção** (nem migração, nem UPDATE, nem deploy). Gere o SQL e mostre ao Pedro, como manda `.claude/skills/alterar-banco/SKILL.md`.
- Leitura do banco de produção só para levantamento (seção 6), sem escrita.
- Ler `CLAUDE.md`, `AGENTS.md` e a skill `alterar-banco` antes de começar.

## 1. Decisões do Pedro (fechadas)

| # | Decisão |
|---|---|
| D1 | O teto de carne praticado é **450 g por pessoa**, não 400 g. |
| D2 | Os 450 g são de **carne crua**. Interpretação adotada: crua e já limpa (depois do Fator de Correção, antes da brasa). Se as fichas mostrarem que isso não bate (seção 6.2), pare e pergunte. |
| D3 | Os 450 g valem **independentemente** do número de acompanhamentos. Com **muitos** acompanhamentos, o teto pode **baixar**. Nunca sobe acima de 450 g. |
| D4 | **Entradas contam** como acompanhamento (pão de alho, queijo coalho etc.). |
| D5 | **Carnes não têm hard cap.** `Porcao_Maxima_Individual` deixa de valer para preparos da categoria Carnes. |

Contexto da pesquisa (04/11): fontes de churrasco tratam 400–500 g de carne crua sem osso por adulto como padrão para eventos de duração média, e apontam redução de 10% a 20% quando a mesa de acompanhamentos é farta. Isso sustenta um piso por volta de −20%.

## 2. Regra nova de dimensionamento

Para cada macro-categoria marcada com `ajusta_por_acompanhamentos = true` (hoje, só a de Carnes):

```text
A          = Σ peso_acompanhamento da macro de cada preparo selecionado
             (preparos distintos; macros com peso 0 não contam; a própria macro de Carnes tem peso 0)
excedente  = MAX(0, A − acomp_referencia)
fator      = 1 − acomp_reducao_por_item × excedente
teto_ajust = MAX(teto_carne_piso_g, teto_base × fator)
teto_ajust = MIN(teto_ajust, teto_base)        -- nunca sobe (D3)
```

- `teto_base` = `macro_categorias.capacidade_teto` da macro de Carnes (passa a ser 450, D1).
- Se **qualquer** dos três parâmetros globais for nulo, o ajuste fica **desligado** e `teto_ajust = teto_base`. Assim o deploy antes da migração, ou antes de o Pedro definir os valores, não muda nada.
- Se `teto_carne_piso_g > teto_base`, usar `teto_base`.
- Validar: `0 ≤ acomp_reducao_por_item < 1`, `acomp_referencia ≥ 0`, `teto_carne_piso_g > 0`. Fora disso, ajuste desligado e aviso no resultado (não lançar exceção no simulador).
- Arredondar com a função `arredondar` já existente.
- A distribuição dentro da macro continua a mesma (`teto_ajust × peso / Σpesos`, hierarquia 2 : 1,3 : 1 : 0,9 : 1).

### Pesos de acompanhamento por macro

| Macro (nome exato a conferir no banco) | `peso_acompanhamento` | Status |
|---|---|---|
| Entradas | 1 | Decidido (D4) |
| Guarnições | 1 | Implícito no pedido |
| Saladas Pesadas | 1 | Sugestão, confirmar com o Pedro |
| Saladas Leves | 0,5 | Sugestão, confirmar com o Pedro |
| Molhos, Bebidas, Sobremesas | 0 | Sugestão, confirmar com o Pedro |
| Carnes | 0 | Fixo |

Liste todas as macros que existem de fato e proponha o peso de cada uma ao Pedro. Não invente macro.

### Parâmetros globais (valores a confirmar com o Pedro)

| Parâmetro | Sugestão inicial | Origem da sugestão |
|---|---|---|
| `acomp_referencia` | **definir com a seção 6.1** | Quantos acompanhamentos (ponderados) tem o cardápio típico |
| `acomp_reducao_por_item` | 0,05 (5% por acompanhamento acima da referência) | Sugestão |
| `teto_carne_piso_g` | 360 (−20% de 450) | Pesquisa de 04/11 |

Exemplo **sintético**, só para teste: referência 5, redução 5%, piso 360. Com A = 5 → 450 g; A = 7 → 405 g; A = 9 → 360 g; A = 12 → 360 g (piso).

## 3. Fim do hard cap em Carnes (D5)

- Aplicar a regra num ponto que cubra **todos** os chamadores de `distribuirPorcoes`: `calcularDimensionamentoOrcamento`, `precificacao-cardapio.ts`, `precificacao-evento.ts` e `debug-calculo-cardapio.ts`. Sugestão: levar a categoria do preparo (ou um booleano `ignoraHardCap`) no `ItemResolvido` e decidir em `distribuirPorcoes`.
- **Não apagar** `porcao_maxima_individual` dos preparos de Carnes no banco (seria UPDATE sem necessidade). O motor só ignora.
- No formulário de preparo, esconder ou desabilitar o campo de porção máxima quando a categoria for Carnes, com uma frase curta explicando.
- Relatar ao Pedro quais preparos de Carnes têm cap preenchido hoje (suspeita: Linguiça Toscana). Eles passam a receber a fatia cheia.
- Atualizar `docs/REGRAS_NEGOCIO.md` seção 12 e o texto do "Teste de Estresse de Item Único" (seção 13) para dizer que não se aplica a Carnes.

## 4. Mudanças de banco (migração 0008, só aditiva)

DDL (gerar com `drizzle-kit generate`, conferir o SQL):

```sql
ALTER TABLE macro_categorias
  ADD COLUMN peso_acompanhamento numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN ajusta_por_acompanhamentos boolean NOT NULL DEFAULT false;

ALTER TABLE configuracoes_globais
  ADD COLUMN acomp_referencia numeric(4,1),
  ADD COLUMN acomp_reducao_por_item numeric(5,4),
  ADD COLUMN teto_carne_piso_g numeric(6,2);
```

Script de dados **separado**, mostrado ao Pedro com os valores que ele aprovar:

```sql
-- pesos por macro (por id, depois de listar as macros reais)
UPDATE macro_categorias SET peso_acompanhamento = ... WHERE id = ...;
UPDATE macro_categorias SET ajusta_por_acompanhamentos = true WHERE id = <id da macro de Carnes>;
-- D1: só se o valor atual não for 450
UPDATE macro_categorias SET capacidade_teto = 450 WHERE id = <id da macro de Carnes>;
-- parâmetros (linha única, id = 1)
UPDATE configuracoes_globais SET acomp_referencia = ..., acomp_reducao_por_item = ..., teto_carne_piso_g = ... WHERE id = 1;
```

Aplicação em produção, quando o Pedro mandar: dump validado, transação única, contagens antes/depois (procedimento de `docs/AUTONOMIA.md`).

**Leitura defensiva:** o código precisa funcionar se o deploy chegar antes da migração (colunas ausentes = ajuste desligado, cap de Carnes ignorado mesmo assim). Usar o padrão de `src/lib/lista-compras-envio.ts`. O caminho legado NocoDB não recebe a feature (ajuste desligado).

## 5. Código e tela

- `ItemResolvido`: novos campos vindos da macro (`pesoAcompanhamentoMacro`, `macroAjustaPorAcompanhamentos`) e o necessário para o item 3.
- `distribuirPorcoes(itens, numConvidados, parametros?)`: terceiro argumento opcional. Sem ele, comportamento idêntico ao atual (os testes existentes devem passar sem alteração). Função de carga dos parâmetros separada, com I/O.
- `MacroCategoriaDimensionada`: `capacidade_teto` passa a ser o teto **ajustado** (é o que os consumidores usam); novos campos `capacidade_teto_base` e `ajuste_acompanhamentos` (`{ contagem, referencia, reducao_por_item, piso_g, fator_aplicado } | null`). Conferir todos os consumidores de `capacidade_teto` com busca no código.
- Onde o dimensionamento aparece para usuário interno (orçamento, simulador interno, debug), mostrar uma linha como: **"Carnes: 450 → 405 g por pessoa (7 acompanhamentos; referência 5)"**. Não colocar isso no payload da rota pública do simulador.
- Evento já aceito não muda: as quantidades ficam congeladas em `itens_evento_confirmados`. Confirmar isso no código.
- Editar os parâmetros pela interface fica fora deste escopo (por SQL agora).

## 6. Levantamento antes de pedir os valores ao Pedro (só leitura)

1. **Contagem ponderada dos cardápios-modelo** (`cardapios_modelo` + `cardapio_modelo_itens`) e dos orçamentos existentes, com os pesos da seção 2. Mostrar em tabela. É a base para o Pedro escolher `acomp_referencia`.
2. **Estado da carne nas fichas:** para os preparos de Carnes, verificar se `rendimento` está em peso cru limpo ou em peso pronto (assado). Se estiver em peso pronto, o teto de 450 g cru não pode ser usado direto; **pare e leve as opções ao Pedro** (converter pelo rendimento de cada preparo ou recadastrar o rendimento). Não decida sozinho.
3. **Valor atual** de `capacidade_teto` da macro de Carnes (os docs dizem 400).
4. **Impacto de 400 → 450 e do ajuste**: para os 6 cardápios-modelo e para os orçamentos existentes, custo de cardápio por pessoa, preço sugerido (×1,40) e margem nos pacotes de preço fixo, antes e depois. Subir de 400 para 450 aumenta em 12,5% a carne de todo cardápio e, portanto, o custo; nos pacotes de preço fixo isso reduz a margem projetada. O Pedro precisa ver esses números antes de aplicar.
5. Preparos de Carnes com `porcao_maxima_individual` preenchida (seção 3).

## 7. Testes (Vitest)

- Sem parâmetros: resultado idêntico ao atual.
- A = referência → 450; A acima → redução linear; A muito acima → piso; A abaixo → 450 (nunca sobe).
- Parâmetro nulo ou inválido → ajuste desligado, com aviso.
- Pesos fracionários (salada leve 0,5) e peso 0 (molho) na contagem.
- Preparo repetido conta uma vez.
- Carne com `porcaoMaximaIndividual` preenchida não é limitada; item de outra categoria com cap continua limitado.
- Cardápio só com carne e cardápio com uma carne só (recebe o teto inteiro).
- Mistura de unidades (Peso_Medio_Unidade_G) continua funcionando com o teto ajustado.

Antes de dizer que terminou: `npx next typegen && npx tsc --noEmit && npx eslint . && npx vitest run && npm run build`.

## 8. Documentação

- `docs/REGRAS_NEGOCIO.md`: seção 8 (fórmula com teto ajustado), seção 11 (450 g crua no lugar de 400 g), seções 12 e 13 (sem hard cap em Carnes).
- `docs/DECISOES.md`: entrada nova com D1–D5, data 04/11/2026, status APROVADA (implementação pendente de aplicação em produção).
- Não reescrever `docs/PENDENCIAS_NOTURNAS.md`; só acrescentar o registro do que foi feito.

## 9. Entrega ao Pedro

1. Resumo do que mudou, arquivo por arquivo.
2. Tabelas do levantamento (seção 6).
3. SQL da migração 0008 e SQL de dados, com os valores sugeridos destacados para ele aprovar ou trocar.
4. Resultado dos testes e do build.
5. Lembrete: nada foi commitado nem aplicado em produção.
