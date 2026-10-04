# Design System — Anjos Eventos

Status: **proposta de planejamento visual** (nenhum código alterado). Base: `docs/design/UX-AUDIT.md` + tokens atuais em `src/app/globals.css`.
Data: 2026-10-03.

Convenções deste documento:
- **[existe]** = já está no código hoje. **[novo]** = proposta. **[ajuste]** = existe, mas muda.
- Razões de contraste foram **calculadas** (fórmula WCAG 2.x) com os hex indicados; não foram medidas em tela.
- Onde algo depende de decisão do negócio ou de teste real, está marcado **[confirmar]**.
- Nenhuma regra de negócio (`docs/REGRAS_NEGOCIO.md`) é alterada por este documento. Onde um componente toca regra, isso é dito.

---

## 1. Quem usa e em que situação

Isto decide quase tudo abaixo. Evidências vêm do código e da documentação, não de pesquisa com usuários (**não existe pesquisa; as premissas de uso precisam de confirmação do Pedro**).

| Fato | Origem | Consequência de design |
|---|---|---|
| Equipe pequena de uma operação de eventos (3 empresas); login é "quem está usando?", sem senha | `login/page.tsx`, `usuario-atual.ts` | Interface sem cerimônia: poucos cliques, nenhum fluxo de conta |
| Acesso via Tailscale, provavelmente celular e desktop **[confirmar proporção]** | comentário em `usuario-atual.ts` | Mobile é requisito de primeira classe, não adaptação |
| Tarefa central: orçar → confirmar → preparar o evento, com **dinheiro e contrato** envolvidos | REGRAS §2, §3, §5 | Erros custam caro; clareza de valores e confirmação de ações irreversíveis valem mais que estética |
| Uso em cozinha/ambiente de evento (Ficha Técnica impressa, equipe via WhatsApp) | `fichas-tecnicas`, `automacao-whatsapp` | Leitura rápida, números grandes e legíveis, impressão confiável |
| Quem mantém tem pouco tempo (CLAUDE.md) | CLAUDE.md | Poucos componentes, poucas variantes, tokens em um lugar só |

**Tarefas do usuário em ordem de frequência provável:** ver o que vem aí (Home/Agenda) → resolver pendências → criar orçamento → confirmar evento → consultar/ajustar ficha técnica → cadastrar equipe/insumos.

---

## 2. Filosofia visual

> **"O caderno do maître": organizado, quente e firme.**
> A interface deve parecer um instrumento de trabalho de quem organiza festas, não um painel de métricas.

Princípios (cada um com o porquê):

1. **Informação antes de decoração.** Cada tela responde "o que preciso fazer agora?". *Porque* a maioria do tempo o usuário está a caminho de uma ação (confirmar, resolver pendência), não analisando dados. Não há gráficos no produto; não criar "cards de KPI" só para preencher espaço.
2. **Dinheiro e ações irreversíveis têm tratamento próprio.** Valores em tipografia numérica estável; ações que gravam contrato ou apagam dados têm confirmação clara. *Porque* o preço é congelado no Orçamento (REGRAS §2) e exclusão de evento é hard delete (REGRAS §6).
3. **Cor significa uma coisa só.** Cada cor da marca identifica uma empresa; estados usam cores próprias; nunca só cor. *Porque* hoje `ember` é ao mesmo tempo cor do Senhor Churrasco, do botão principal, de erro e de ação destrutiva (UX-AUDIT §2.6), o que torna "erro" indistinguível de "Senhor Churrasco".
4. **Superfície clara para ler, moldura escura para orientar.** Mantém a identidade atual (fundo `ink`, papéis `paper`). *Porque* os dados densos (listas, formulários, tabelas) já são lidos em superfícies claras e de alto contraste; a moldura escura é a assinatura do produto e reduz brilho em ambiente de salão/noite. É decisão de identidade, não de função — mantida por ser o que o usuário já conhece.
5. **Reutilizar antes de criar.** Uma variante nova só entra se houver uso real no código. *Porque* o maior custo atual é duplicação (UX-AUDIT §6).
6. **Funciona sem hover e sem cor.** Tudo que existe no desktop existe no toque; todo estado tem texto ou ícone. *Porque* o uso em celular é premissa.

**O que deliberadamente não fazemos**, e por quê:

| Evitado | Motivo |
|---|---|
| Glassmorphism, gradientes decorativos em cartões, brilhos neon | Não carregam informação e reduzem contraste. O único gradiente é o `venue-glow` do fundo (identidade existente, **[existe]**, mantido sutil e limitado ao fundo da página). |
| Roxo/azul "SaaS", cantos muito arredondados, avatares coloridos | Nada disso vem do negócio (buffet, cerimonial, chácara). A paleta nasce de brasa, latão, sálvia e papel — materiais do próprio ofício. |
| Ilustrações e mascotes em estados vazios | Atrasam a leitura e exigem manutenção de arte; texto objetivo com ação resolve. |
| Ícones em todo lugar | Poucos itens exigem ícone (ver §13). Ícone só onde reduz leitura ou ambiguidade. |
| Animações de entrada em listas longas | Já limitadas (12 itens, `prefers-reduced-motion`); manter. Movimento só confirma ação (pressionar, abrir/fechar modal). |
| Sidebar fixa com 12 itens | O produto tem 4 áreas principais (ver §11). |

---

## 3. Personalidade da interface

| Atributo | Como aparece | Como **não** aparece |
|---|---|---|
| **Confiável** | Valores sempre com símbolo e casas decimais (`R$ 1.234,00`); ações importantes mostram resumo antes de gravar | Texto vago ("Sucesso!"), números sem unidade |
| **Calorosa** | Papel creme, serifa itálica nos títulos, tom de voz humano ("Nenhum evento nos próximos 15 dias.") | Humor, emojis em textos de sistema, "Oops!" |
| **Direta** | Verbos no infinitivo nos botões (**Salvar**, **Excluir**, **Gerar orçamento**); erro diz o que corrigir | Mensagem técnica ("Algo deu errado", nome de arquivo de doc) |
| **Tranquila sob pressão** | Alertas só para o que exige ação; pendências agrupadas em um lugar | Vários tons de vermelho disputando atenção |

**Assinatura visual** (o que faz o produto reconhecível):
- **Título em Fraunces itálico** (hoje já presente) — lembra convite/cardápio impresso.
- **Faixa colorida no topo do cartão** (6 px) — hoje decorativa em `ember` em quase todo cartão; passa a ser **exclusivamente a cor da empresa** (§5.4). Vira informação.
- **Papel sobre madeira escura**: cartões `paper` sobre o fundo `ink`.
- **Cartões com cantos de 2 px** — referência a ficha/contrato impresso, não a app.

---

## 4. Paleta de cores

### 4.1 Cores base **[existem]** (mantidas)

| Token | Hex | Papel |
|---|---|---|
| `ink` | `#1e1811` | Fundo da página (moldura) |
| `ink-soft` | `#2a2118` | Painéis sobre a moldura (formulários, modal) |
| `paper` | `#f6efe1` | Superfície de leitura (listas, cartões) e texto sobre escuro |
| `paper-dim` | `#eae0cb` | Texto secundário sobre escuro; zebra/hover sobre papel |
| `paper-ink` | `#2b2013` | Texto sobre papel (13,9:1 sobre `paper`) |
| `ember` | `#c1552c` | **Marca / empresa Senhor Churrasco** (uso restrito, ver 4.2) |
| `brass` | `#b8933f` | **Marca / empresa Anjos Cerimonial**; anel de foco sobre escuro (5,5:1 sobre `ink-soft`) |
| `sage` | `#6e7a5c` | **Marca / empresa Em Plena Natureza** |

> Origem do mapeamento empresa→cor: `src/lib/formatacao.ts` (`coresEmpresa`). Mantido.

### 4.2 Problema e correção do `ember`

Contraste calculado hoje (UX-AUDIT §3): `text-ember` = 3,46–3,99:1 e botão `paper` sobre `ember` = 3,99:1 → abaixo de 4,5:1. A correção **separa três usos** que hoje usam o mesmo token:

| Uso | Token novo | Hex | Contraste calculado |
|---|---|---|---|
| Identidade da empresa (barra, bolinha) — **sem texto** | `ember` **[existe]** | `#c1552c` | Não precisa contraste de texto; sempre acompanhada do nome |
| Fundo do botão primário, com texto `paper` | `acao` **[novo]** | `#a8431d` | texto `paper` 5,27:1 |
| Hover/pressionado do botão primário | `acao-forte` **[novo]** | `#9c3c19` | texto `paper` 5,97:1 |
| Texto/ícone de ação sobre **escuro** (links, "Resolver pendências") | `acao-claro` **[novo]** | `#e8825a` | 6,51:1 sobre `ink`; 5,85:1 sobre `ink-soft` |
| Texto/link de ação sobre **papel** | `acao` | `#a8431d` | 5,27:1 sobre `paper` |

*Por que manter `acao` na família de `ember`:* é a cor com que o Pedro já identifica o produto; muda a luminosidade, não o matiz. *Por que não usar outra cor para o botão:* seria trocar a identidade para resolver contraste, e isso se resolve escurecendo.

### 4.3 Superfícies e bordas **[novo/ajuste]**

| Token | Hex | Uso | Justificativa |
|---|---|---|---|
| `superficie-escura` | `ink` | Página | — |
| `superficie-painel` | `ink-soft` | Painéis de formulário, modais | — (1,11:1 contra `ink`; por isso painel precisa de **borda**, ver abaixo) |
| `superficie-papel` | `paper` | Listas, cartões | — |
| `superficie-papel-alt` | `paper-dim` | Zebra, hover, cabeçalho de grupo | — |
| `borda-campo-escuro` | `#8a7d68` | Borda de input/select sobre `ink-soft` | **3,92:1** — hoje a borda é `paper-dim/20` (≈1,3:1), abaixo dos 3:1 de WCAG 1.4.11 para identificar o campo |
| `borda-campo-papel` | `#8a7d68` | Borda de input sobre `paper` (filtros) | 3,52:1 |
| `borda-suave-escuro` | `paper-dim/15` | Divisores decorativos (não identificam controle) | Divisor decorativo não exige 3:1 |
| `borda-suave-papel` | `paper-ink/10` | Divisor de lista | idem |

### 4.4 Texto secundário **[ajuste]**

Hoje usa `/50`, `/60`, `/70` de opacidade (ex.: `paper-ink/50` = 3,07:1, placeholder `paper-ink/40` = 2,37:1). Substituir opacidade por **tokens sólidos**, para que o contraste seja previsível:

| Token | Hex | Sobre | Contraste |
|---|---|---|---|
| `texto` | `paper-ink` `#2b2013` | `paper` | 13,9:1 |
| `texto-suave-papel` | `#6b5b46` | `paper` | 5,72:1 (`paper-dim`: 4,99:1) |
| `texto` (escuro) | `paper` | `ink-soft` | 13,8:1 |
| `texto-suave-escuro` | `#a89c85` | `ink` / `ink-soft` | 6,50:1 / 5,84:1 |
| placeholder | = `texto-suave` | — | ≥ 4,5:1 (hoje 2,4–4,1:1) |

### 4.5 Quando usar cada superfície

- **Ler e comparar dados (listas, tabelas, calendário, Ficha):** `paper`.
- **Preencher dados (formulários):** `ink-soft` sobre `ink`. *Porque* formulários longos em fundo claro cansam mais em ambiente escuro e é a convenção já estabelecida no app; contraste interno dos campos é corrigido pelas bordas de 4.3.
- **Foco/decisão (modal):** `ink` com borda `borda-suave-escuro`.

---

## 5. Cores semânticas

Cada semântica tem **duas versões** (para fundo escuro e para papel), porque a mesma cor não passa em ambos. Todos os contrastes são texto sobre a superfície indicada.

| Semântica | Quando usar | Sobre escuro (`ink-soft`) | Sobre papel (`paper`) | Ícone/forma obrigatório |
|---|---|---|---|---|
| **Perigo** `perigo` | Erro de validação, exclusão, falha de cálculo (fail-hard §15) | texto `#f08294` — 6,26:1 | texto `#a3243a` — 6,39:1; botão `#a3243a` + texto `paper` 6,39:1 | ✕ / "!" em círculo |
| **Aviso** `aviso` | Item pendente, itens fora do cálculo (§10), valor que "NÃO reflete o cardápio inteiro" | texto `#e6b957` — 8,61:1 | texto `#7a5410` — 5,91:1 | triângulo "!" |
| **Sucesso** `sucesso` | "Salvo", conexão ativa | texto `#9fae88` — 6,68:1 | texto `#4f5b3f` — 6,33:1 | ✓ |
| **Informação** `info` | Ajuda de campo, "valor pré-preenchido do cardápio pré-montado" | texto `#8fb3cf` — 7,16:1 | texto `#2f5775` — 6,70:1 | "i" em círculo |

Fundos de alerta: a cor semântica a **12–15 % de opacidade** sobre a superfície, com **borda de 1 px** na cor cheia e texto na versão calculada acima. (Contraste do texto sobre esses fundos translúcidos deve ser reconferido na implementação **[confirmar]**.)

**Por que `perigo` é um carmesim e não o `ember`:** a distância entre `#c1552c` e `#a3243a` é pequena em luminância (1,6:1), mas o matiz de `perigo` fica mais para vermelho-vinho; **mesmo assim a distinção nunca depende da cor** — ícone e texto sempre acompanham. O ponto é que erro deixa de compartilhar token com "Senhor Churrasco" e com "botão principal".

**Por que `aviso` ≠ `perigo`:** o produto tem muitos avisos que **não bloqueiam** (itens excluídos do cálculo, pendências) e poucos erros que bloqueiam. Se tudo for vermelho, o usuário aprende a ignorar o vermelho. Pendências (Home ⚠️) passam a usar `aviso` (âmbar).

**Sucesso e `sage`:** `sage` é também a cor da Em Plena Natureza. `sucesso` usa a mesma família em tons claros/escuros mas **sempre com ✓ e texto "Salvo"**; a empresa nunca aparece sem nome. Se isso confundir em teste, trocar `sucesso` por verde puro **[confirmar com uso]**.

### 5.4 Cor da empresa (identidade, não estado)

| Empresa | Cor | Onde aparece |
|---|---|---|
| Buffet Senhor Churrasco | `ember` `#c1552c` | Faixa de topo de cartão do evento, bolinha em lista/calendário, chip |
| Anjos Cerimonial | `brass` `#b8933f` | idem |
| Em Plena Natureza Chácara de Eventos | `sage` `#6e7a5c` | idem |

Regras:
1. A cor da empresa **só** aparece onde há uma entidade daquela empresa (evento, orçamento). Cartões neutros (atalhos do Hub, "Novo X") usam faixa `brass`? **Não:** usam **faixa neutra `paper-dim`** — hoje todos usam `ember` e parecem "do Senhor Churrasco" **[ajuste]**.
2. Cor da empresa **sempre acompanhada do nome** (ou sigla — ver 5.5). Hoje a bolinha do calendário tem o nome só em `title` (UX-AUDIT §3.5).
3. Cor da empresa nunca é fundo de texto (não passa 4,5:1 para `brass`/`sage` com texto `paper`).

### 5.5 Chip da empresa **[novo, confirmar]**
Chip: bolinha da cor + nome (ou sigla em telas estreitas). Siglas propostas: **SC**, **AC**, **EPN**. **Siglas são proposta minha, não existem na documentação — confirmar com o Pedro ou usar o nome completo truncado.**

---

## 6. Tipografia

### 6.1 Famílias **[existem]**

| Família | Uso | Por quê |
|---|---|---|
| **Fraunces** (itálico) — `font-display` | Títulos de página e de seção, nome do cliente em cartão, título de modal | Serifa de caráter lembra convite/cardápio impresso; é a assinatura do produto |
| **Archivo** — `font-sans` | Todo o resto: formulários, tabelas, botões, números, mensagens | Grotesca neutra e legível em tamanhos pequenos; boa para dados |

**Regras novas:**
1. **Fraunces só a partir de 18 px** e só em texto de rótulo humano (títulos, nome de cliente). *Porque* itálico de serifa em tamanho pequeno perde legibilidade. Nunca em botões, campos, tabelas ou mensagens de erro.
2. **Valores monetários e quantidades em Archivo com `tabular-nums`** (colunas alinham; mudar um dígito não "pula" o layout enquanto o preço recalcula). Hoje o Simulador mostra totais em Fraunces itálico `text-2xl`; **o valor total pode manter display grande**, mas **[confirmar]** que os dígitos da fonte são legíveis lado a lado (não testado).
3. Texto em maiúsculas pequenas (`uppercase tracking-wide`) só em rótulos de grupo (≤ 3 palavras).

### 6.2 Escala tipográfica **[novo, proposta]**

Base **16 px** (1rem). *Porque* campos abaixo de 16 px disparam zoom automático ao focar no iOS Safari, e o app tem vários `text-sm` (14 px) em filtros **[confirmar em iPhone]**.

| Token | Tamanho / altura de linha | Peso | Fonte | Uso |
|---|---|---|---|---|
| `titulo-pagina` | 30 / 36 px (36/40 em ≥ sm) | 400 itálico | Fraunces | H1 de página |
| `titulo-secao` | 22 / 28 | 400 itálico | Fraunces | H2 (Próximos 15 dias, Decisões operacionais) |
| `titulo-bloco` | 18 / 24 | 400 itálico | Fraunces | Título de seção interna de formulário, nome do cliente em cartão, título de modal |
| `corpo` | 16 / 24 | 400 | Archivo | Texto de leitura, valores de campos |
| `corpo-pequeno` | 14 / 20 | 400 | Archivo | Metadados, descrições de lista, tabelas densas |
| `rotulo` | 14 / 20 | **500** | Archivo | Rótulo de campo (hoje 400 `text-sm text-paper-dim`) |
| `legenda` | 12 / 16 | 400 | Archivo | Ajuda de campo, "+N mais" — **mínimo do produto; não usar abaixo de 12 px** |
| `numero-destaque` | 24 / 32 | 500 | Archivo `tabular-nums` (ou Fraunces, ver 6.1.2) | Valor total, custo por pessoa |
| `grupo` | 12 / 16, `uppercase`, tracking 0.06em | 600 | Archivo | Cabeçalho de grupo ("EQUIPE", "ENTRADA") |

*Por que `rotulo` com peso 500:* rótulos são a âncora de formulários de 25 campos; mais peso melhora a varredura sem aumentar tamanho.

Comprimento de linha: texto corrido ≤ 65 caracteres (`max-w-prose`). A maioria do app é UI curta, então só importa em textos de ajuda e observações.

---

## 7. Espaçamento

### 7.1 Escala **[novo, alinhada ao Tailwind já usado]**
Base 4 px. Tokens (os valores já são os do Tailwind, então **não exige mudar nenhuma classe**, só passar a usar um subconjunto):

`1 = 4` · `2 = 8` · `3 = 12` · `4 = 16` · `5 = 20` · `6 = 24` · `8 = 32` · `10 = 40` · `12 = 48` · `16 = 64`

### 7.2 Aplicação (o que cada espaço significa)

| Espaço | Valor | Significa |
|---|---|---|
| Rótulo ↔ campo | 6 px (`gap-1.5`) **[existe]** | Pertencem juntos |
| Campo ↔ campo (dentro de seção) | 20 px (`gap-5`) **[existe]** | Mesma seção |
| Seção ↔ seção em formulário | 32 px (`gap-8`) **[existe]** | Assunto novo |
| Padding de painel/cartão | 24 px (`p-6`) desktop, **16 px (`p-4`) mobile** **[ajuste]** | Hoje 24 px em 360 px de largura rouba ~13 % da largura útil |
| Gutter da página | **16 px mobile, 24 px ≥ sm** **[ajuste]** (hoje `px-6` sempre) | Idem |
| Topo da página | 24 px mobile, 64 px desktop **[ajuste]** (hoje `py-16` sempre) | `py-16` empurra a primeira informação 64 px para baixo em celular |
| Linha de lista | 16 px vertical, 24 px horizontal (16/16 em mobile) | Densidade confortável para toque |

### 7.3 Larguras de página **[ajuste]**
Hoje `max-w-2xl` / `3xl` / `4xl` misturados. Definir **três**:

| Nome | Largura | Páginas |
|---|---|---|
| `pagina-estreita` | 42rem (672 px) | Formulários, detalhe, login |
| `pagina-media` | 56rem (896 px) | Listas, hub, Cardápios Feitos, Agenda |
| `pagina-documento` | 48rem (768 px) | Ficha Técnica (tela); impressão = sem limite |

*Porque* a variedade atual (2xl em Agenda, 4xl em Cardápios Feitos) não segue critério do conteúdo; o calendário (7 colunas) precisa de mais largura que um formulário.

---

## 8. Raio de borda

| Token | Valor | Uso | Justificativa |
|---|---|---|---|
| `raio` | **2 px** **[existe]** | Botões, campos, cartões, painéis, modais | Remete a papel/ficha impressa; é assinatura do produto e já está em todo o código. Cantos quase retos também comunicam "formulário/contrato", coerente com a natureza do trabalho |
| `raio-total` | 9999 px **[existe]** | Chips, badges, "×" de item, bolinhas | Elementos pequenos e contáveis que "flutuam" sobre o conteúdo |
| — | Nenhum outro | — | Evitar escala de 6/8/12/16 px "por tendência"; o produto não tem justificativa para cantos suaves |

---

## 9. Sombra e elevação

Em fundo escuro, sombra quase não aparece; **a hierarquia é feita por claridade da superfície + borda**, e sombra só reforça. Hoje existem ~6 sombras literais diferentes copiadas como strings (UX-AUDIT §2.8). Reduzir a **quatro níveis** **[ajuste]**:

| Nível | Token | Quando | Valor proposto |
|---|---|---|---|
| 0 | `elev-0` | Painel `ink-soft` sobre `ink`; campos | Sem sombra; **borda `borda-suave-escuro`** |
| 1 | `elev-1` | Cartão/lista de papel sobre `ink` | `0 12px 24px -16px rgb(0 0 0 / .55)` |
| 2 | `elev-2` | Cartão clicável em hover/foco | `0 20px 32px -16px rgb(0 0 0 / .7)` + `translateY(-2px)` (hoje -4 px) |
| 3 | `elev-3` | Modal | `0 30px 60px -20px rgb(0 0 0 / .8)` **[existe]** |

Regras:
- Elevação **não indica clicável**: o que é clicável tem rótulo/seta/sublinhado. *Porque* em toque não há hover.
- `translateY` em hover só em cartões de navegação (Home/Hub), nunca em linhas de lista.
- Impressão: **sem sombra, sem animação** **[existe]** (`@media print`).

Camadas (`z-index`): `10` cabeçalho fixo, `40` barra de ações fixa do formulário, `50` modal/overlay, `60` tooltip/toast. Hoje só existe `z-50`.

---

## 10. Tamanhos e estados de componentes

### 10.1 Tamanhos

| Elemento | Mobile | ≥ md | Justificativa |
|---|---|---|---|
| Altura de botão/campo/select | **44 px** | 40 px | 44 px é o alvo de toque recomendado; hoje ~36–38 px |
| Altura mínima de alvo clicável (qualquer) | 44 × 44 (área, não só visual) | 32 × 32 | WCAG 2.2 AA exige ≥ 24 px; "×" de 12 px e links "Editar" de ~36 px não passam com folga |
| Padding de botão | 16 px horizontal | 20 px | — |
| Ícone | 16 px (inline), 20 px (botão de ícone) | idem | — |
| Linha de lista | ≥ 56 px | ≥ 56 px | Duas linhas de texto + toque |
| Linha de tabela | 48 px | 44 px | Idem |

Tamanhos de botão: **`md`** (padrão) e **`sm`** (dentro de linhas e modais). Não existe `lg`/`xs` — nenhum caso real hoje.

### 10.2 Estados universais (qualquer controle)

| Estado | Regra visual | Regra de acessibilidade |
|---|---|---|
| **Repouso** | Conforme variante | — |
| **Hover** (só ponteiro) | Clarear/escurecer 6–8 % ou sublinhar; **nunca revelar informação** | Nada essencial depende de hover |
| **Foco (teclado)** | Anel de **2 px** a 2 px de distância, **sempre visível** | Sobre escuro: `brass` (5,5:1). **Sobre papel: `brass` falha (2,52:1) → usar `paper-ink` ou `acao` (13,9:1 / 5,3:1)** |
| **Pressionado** | `scale(.97)` **[existe]** | — |
| **Desabilitado** | Opacidade 50 % + `cursor-not-allowed`; **texto mantém ≥ 3:1 não é exigido por WCAG para desabilitados**, mas o motivo deve estar escrito perto quando não for óbvio | `disabled` real |
| **Carregando** | Texto muda para "Salvando…" + spinner opcional; **botão desabilitado** (resolve duplo envio, UX-AUDIT §1.4) | `aria-busy`, texto muda |
| **Erro** | Borda `perigo` 2 px + mensagem abaixo do campo com ícone | `aria-invalid`, `aria-describedby` apontando para a mensagem |
| **Somente leitura / calculado** | Sem borda de campo, fundo `paper-dim/10`, valor em texto — **não usar `input disabled`** (UX-AUDIT §3.11) | `<output>` ou texto com rótulo |

O anel de foco **substitui** o `focus:outline-none` atual dos campos. Hoje o foco é só uma borda `brass` fina — manter a borda e **acrescentar o anel**.

---

## 11. Componentes

### 11.1 Botões

| Variante | Aparência | Quando usar | Nunca usar para |
|---|---|---|---|
| **Primário** | Fundo `acao`, texto `paper`, sombra `elev-1` | **Uma** ação principal por tela/seção: "Gerar orçamento", "Salvar alterações", "Novo evento" | Duas por tela; ações destrutivas |
| **Secundário** | Borda `borda-campo` 1 px, texto `paper`/`paper-ink`, fundo transparente | Ações alternativas: "Exportar fichas técnicas", "Fechar", "Cancelar" | — |
| **Perigo** | Fundo `perigo` (sobre papel) com texto `paper`; **na tela de confirmação**, não na lista | Confirmar exclusão | Na linha da lista (ali é link, ver abaixo) |
| **Link/ação em linha** | Texto `acao`/`acao-claro` sublinhado, **altura de toque 44 px** | "Editar" / "Excluir" em linhas | Ação principal |
| **Ícone** | 44×44 com `aria-label` obrigatório | "×" de remover, ↑ ↓ de ordenar | Qualquer ação sem rótulo textual alternativo |

Regras:
- **Rótulo = verbo + objeto** quando ambíguo: "Excluir evento", "Gerar orçamento", "Aprovar e confirmar evento". Capitalização de frase (só a primeira letra) em todo o app — hoje mistura ("Novo Preparo"/"Novo colaborador").
- Botão de envio **sempre desabilita e muda o texto** durante o envio.
- "Aprovar e confirmar evento" (Ação de Conversão) é primário **mas** abre **resumo de confirmação** (11.7) antes de gravar — *porque* é irreversível na prática e grava o snapshot (REGRAS §5). **O fluxo de dados não muda** (regra de preço congelado intacta); só se acrescenta uma tela de conferência.
- Excluir evento mantém **confirmação via Modal** (hoje `window.confirm`). **A regra de exclusão (REGRAS §6) não muda**; só o componente visual.

### 11.2 Inputs de texto/número/data/hora

- Estrutura: **rótulo acima**, campo, ajuda/erro abaixo — nunca placeholder como rótulo.
- Fundo `ink-soft` (formulário) ou transparente com borda (filtros sobre papel); borda `borda-campo` (3,9:1); texto `paper`; placeholder = `texto-suave` (≥ 4,5:1).
- Obrigatório: `*` **e** texto "(obrigatório)" no rótulo quando a maioria é opcional; o inverso ("(opcional)") onde a maioria é obrigatória. Hoje só aparece "(opcional)" em alguns campos.
- Números: `inputmode="decimal"`/`numeric`, `step` explícito, sufixo/prefixo visual (**R$**, **g**, **min**) dentro do campo como texto fixo.
- Campos calculados (Valor Total, Assadores) ⇒ **estado somente leitura** (10.2), com texto "calculado" visível — não um input desabilitado.
- Erro: mensagem **específica e acionável** ("Informe ao menos 1 convidado"), não "Algo deu errado". Mostrar junto ao campo **e** num resumo no topo quando o form é longo.
- Ajuda: `legenda` abaixo; o texto técnico atual (referências a `docs/DECISOES.md`, "Máquina de Estados") sai da tela — vai para a documentação.

### 11.3 Selects

- Select nativo (`<select>`) estilizado igual aos inputs. *Porque* é o que funciona melhor em toque (abre o seletor nativo do sistema) e não exige manutenção; as opções são curtas e fixas (decisões operacionais, unidades, categorias).
- Opção vazia explícita: "Selecione…" com valor vazio **[existe]**; valores legados aparecem como "X (valor antigo)" **[existe]**, comportamento mantido.
- **Quando passar de ~12 opções ou precisar de busca** (ex.: escolher insumo): combobox com busca. Hoje o seletor de insumo na composição e o seletor de itens de cardápio exigem rolar longas listas **[ajuste futuro, fase D]**.
- Checkbox: caixa **20 px** com rótulo clicável em toda a linha (alvo 44 px). Grupo de checkboxes em `fieldset/legend` **[existe nas decisões]**.

### 11.4 Tabelas

O produto usa listas (`ul`) em quase tudo, o que é correto para mobile. **Tabela real só quando há colunas comparáveis em desktop**: Insumos (nome, unidade, preço, fator, corrigido), "Ver cálculos" do Simulador, Ficha Técnica (já tabela) e, futuramente, financeiro (REGRAS §16).

- Desktop (≥ md): `<table>` semântico; cabeçalho `grupo` (12 px caps, `paper-ink` suave) sobre `paper-dim`; zebra opcional apenas em tabelas > 8 linhas (1,15:1 — é só guia visual, nunca informação); números **alinhados à direita** com `tabular-nums`; linha 44–48 px.
- Mobile: **cada linha vira cartão/lista** (nome + 2–3 dados-chave + ação), não rolagem horizontal. Exceção: tabela de cálculos do Simulador (diagnóstico técnico): rolagem horizontal com **sombra de borda** indicando que há mais e primeira coluna fixa.
- Ordenação/filtro: controles **acima**, visíveis; indicador textual do critério ("Ordenado por nome").
- Ação por linha: **máximo 2** visíveis (Editar, Excluir); mais que isso, menu "⋯" com rótulo.
- Estado vazio **dentro** da tabela (11.9).

### 11.5 Cartões

Três tipos, nada mais:

| Tipo | Anatomia | Elevação | Interação |
|---|---|---|---|
| **Cartão de entidade** (evento, cardápio, colaborador) | Faixa de topo 6 px na **cor da empresa** (quando há empresa), título `titulo-bloco`, 2–3 linhas de dados, ações | `elev-1` | Toda a área do título é o link; ações separadas |
| **Cartão de atalho** (Home, Hub) | Faixa de topo **neutra** (`paper-dim`), título + descrição | `elev-1` → `elev-2` em hover/foco | Cartão inteiro é um `<a>` |
| **Painel** (seção de formulário) | Fundo `ink-soft`, borda suave, `p-4 md:p-6` | `elev-0` | Sem interação própria |

*Por que menos faixa colorida:* só quando carrega informação (empresa). Hoje 100 % dos cartões têm faixa `ember`, que o usuário aprende a ignorar.
Cartão de evento na Home: mostrar **pendência como linha de aviso dentro do cartão** ("Faltam: 1 assador, veículo") em vez de ⚠️ com `title` (inacessível em toque). O botão "Resolver pendências" permanece.

### 11.6 Modais

Base: o `Modal` atual **[existe]** (portal, foco preso, Esc, retorno de foco, `aria-modal`, animação respeitando `prefers-reduced-motion`). **Todos** os diálogos usam este componente (hoje `IndicadorWhatsapp` e `window.confirm` não).

| Tipo | Largura | Conteúdo | Botões |
|---|---|---|---|
| **Confirmação** | `max-w-sm` | Título (`titulo-bloco`), 1–2 frases dizendo **o que será perdido**, nome do objeto | Secundário "Cancelar" (foco inicial) + Perigo/Primário |
| **Formulário curto** (novo insumo) | `max-w-md` | Campos + erro inline | "Cancelar" + Primário |
| **Seleção/lista** (adicionar itens, pendências) | `max-w-lg` | Busca (quando > 12 itens) + lista com rolagem interna | "Concluir" |
| **Informativo** (WhatsApp/QR) | `max-w-sm` | Texto + QR | "Fechar" |

Regras:
- **Foco inicial:** no botão **seguro** (Cancelar) nas confirmações destrutivas; no primeiro campo nos formulários.
- **Clique fora não fecha** modais com formulário preenchido (hoje perde dados do `ModalNovoInsumo`); em confirmação/lista, fecha.
- Título sempre `h2`, ligado por `aria-labelledby` (hoje `h2`/`h4` misturados).
- Em mobile (< sm): **tela quase cheia** (margem 8 px) com ação principal no rodapé fixo do modal; evita teclado cobrir o botão **[confirmar em celular]**.
- Fundo único `ink`; borda `borda-suave-escuro` (corrige variação `ink-soft`/`paper`).
- Modal **não** é usado para fluxos com mais de ~6 campos (isso é página).

### 11.7 Resumo de confirmação (componente **[novo]**)
Usado em **Aprovar e confirmar evento** (e só nele, por ora): modal ou bloco com cliente, data, nº de convidados, **valor total** e "este valor foi definido no orçamento e não muda aqui". Botões: "Voltar e revisar" (secundário) / "Confirmar evento" (primário). *Porque* o Passo 3 é onde o contrato vira evento; é o momento de maior custo de erro.

### 11.8 Badges e chips

| Tipo | Forma | Conteúdo | Exemplos |
|---|---|---|---|
| **Status** | Pílula, fundo semântico a 15 % + borda, texto na versão de contraste, **ícone ou texto** | Palavra curta | Evento: *Orçado* (`info`), *Confirmado* (`sucesso`), *Realizado* (neutro: `paper-dim`), *Cancelado* (`perigo`, riscado). Orçamento: *Simulação* (`info`), *Aceito* (`sucesso`). |
| **Empresa** | Bolinha da cor + nome/sigla (5.5) | — | — |
| **Contagem** | Pílula neutra | Número | "(3)" nas abas de categoria |
| **Restrição** (tags de preparo) | Pílula neutra com borda | Texto | Vegetariano etc. (valores de `RESTRICOES_PREPARO`) |

Regra: **um badge por entidade para status**; máximo 2 badges por linha. Texto 12–14 px, peso 500. Mapeamento de cores de status de evento é proposta **[confirmar]** — os rótulos vêm de `formatacao.ts`; hoje o status é texto simples.

### 11.9 Alertas

Anatomia: ícone + título curto (opcional) + texto + ação (opcional). Cores por semântica (§5). Posição: **acima** da área afetada, nunca flutuando.

| Situação do produto | Semântica | Obrigatoriedade |
|---|---|---|
| Itens fora do cálculo ("o valor NÃO reflete o cardápio inteiro") | `aviso` | **Visível sempre**; não colapsar (REGRAS §10) |
| Falha de cálculo (timeout/rede) — fail-hard | `perigo` | Mostrar `mensagem` amigável do payload; **nunca exibir valor parcial** (REGRAS §15) |
| Validação de formulário | `perigo` (resumo no topo + inline) | Move o foco para o resumo |
| Pendências do evento | `aviso` | Lista + botão "Resolver pendências" |
| "Ordens de Ação enviadas… não atualizam mensagens já enviadas" | `info` | Texto da regra preservado |
| Salvo com sucesso | `sucesso` (faixa/toast curto) | `role="status"` |
| Ajuda de preenchimento | `info` (legenda, sem caixa) | — |

Acessibilidade: erros/avisos dinâmicos com `role="alert"` (urgente) ou `role="status"` (informativo). Toast de sucesso: 4 s, **não** para erros.

### 11.10 Tooltips

**Regra: tooltip nunca é o único lugar de uma informação.** Hoje `title` carrega o detalhe das pendências e o nome da empresa no calendário (inacessível em toque e teclado).
- Uso permitido: esclarecer um **ícone** ou abreviação (ex.: "SC" → nome completo), em desktop, ao focar **ou** passar o mouse, com atraso de 300 ms; fecha com Esc.
- Em toque: o mesmo conteúdo vira **texto visível** ou **disclosure** (botão "Por quê?" que expande), não long-press.
- Estilo: fundo `ink`, texto `paper`, `legenda`, `max-w-xs`, `z-60`.
- Caso de teste: o ⚠️ da Home deixa de ter tooltip e passa a mostrar o texto dentro do cartão.

---

## 12. Navegação

### 12.1 Header **[implementado na Etapa 4/5 do redesign]**

Antes: marca "Anjos Eventos" + link "Colaboradores" + semáforo do WhatsApp; o usuário voltava à Home para ir a qualquer lugar (UX-AUDIT §4.2). Hoje (`src/components/navegacao-principal.tsx`):

| Item | Rota | Ativo (`aria-current="page"`) em |
|---|---|---|
| Início | `/` | só `/` |
| Agenda | `/agenda` | `/agenda` e filhas |
| Senhor Churrasco | `/senhor-churrasco` | o hub e suas telas: `/preparos`, `/insumos`, `/cardapios-modelo`, `/simulador-cardapio` |
| Colaboradores | `/colaboradores` | `/colaboradores` e filhas |

**Disposição (desktop, ≥ sm):** uma linha — **marca**, depois **usuário atual (nome) + "Trocar usuário" + indicador do WhatsApp** junto da marca, à esquerda, e os **4 itens à direita**. *Mudança em relação à proposta original (usuário à direita):* a ordem de foco (Tab) é a ordem do DOM e precisa coincidir com a ordem visual nas duas larguras; como no mobile o usuário fica na primeira linha e os itens na segunda, o DOM é marca → usuário → itens, e o desktop segue a mesma sequência.

**Mobile (< sm):** duas linhas, sem hambúrguer. Linha 1: marca à esquerda; nome (truncado), "Trocar" e o indicador à direita. Linha 2: os 4 itens, com rolagem horizontal quando não cabem (em 360 px "Colaboradores" fica parcialmente fora). O texto "Trocar" aparece completo ("Trocar usuário") só a partir de `lg`; o nome acessível é sempre "Trocar usuário".

**Ordem de foco:** skip link → marca → nome/Trocar/WhatsApp → Início, Agenda, Senhor Churrasco, Colaboradores → conteúdo.

- "Trocar usuário" reaproveita a action `trocarUsuario` (`src/app/actions/usuario.ts`); o nome vem de `obterUsuarioAtual()` chamado em `src/app/layout.tsx` (com `.catch(() => null)`). **Consequência:** o layout consulta o banco em toda página (ver pendência de `connectionTimeoutMillis` em `docs/PENDENCIAS_NOTURNAS.md`).
- Alvos de toque de 44 px (mobile) em todos os itens; em ≥ sm o botão "Trocar usuário" tem 32 px.
- O indicador do WhatsApp continua sendo o emoji 🟢🟡🔴 com `aria-label`/`title`; **ícone + texto curto ("WhatsApp: conectado") ainda não foi feito** (§13 prevê os SVGs).
- Header **não fixo** (rolagem normal) em qualquer largura; fixo em ≥ md segue **[confirmar]**. Borda inferior `borda-suave-escuro`.
- Item ativo: texto `paper` + sublinhado de 2 px `brass` (`box-shadow` inset) + `aria-current="page"` (brass sobre `ink` tem 6,1:1).
- **Skip link** "Ir para o conteúdo": primeiro foco, visível só ao focar (fixo no canto, fundo `paper`, anel `paper-ink`); destino `<div id="conteudo" tabIndex={-1}>` logo após o header. Não aparece em `/login`, que não tem header.
- Título da aba por página: `metadata` estática (modelo `%s · Anjos Eventos`); páginas por id usam títulos fixos, nunca o nome do cliente.

### 12.2 Sidebar — decisão: **não adotar agora**

| Critério | Situação | Decisão |
|---|---|---|
| Itens de primeiro nível | 4 | Cabem no header |
| Largura útil | Páginas de 672–896 px; formulários longos | Sidebar de 240 px reduziria área em notebooks de 1280 px |
| Uso em celular | Premissa forte | Sidebar vira hambúrguer em mobile, que é pior para 4 itens |

**Gatilho para adotar:** ≥ 7 áreas de primeiro nível (ex.: quando entrarem Financeiro/Margem, REGRAS §16, além de Orçamentos e Relatórios) **ou** necessidade de sub-navegação persistente. **Especificação já definida para quando for necessário:** 240 px (recolhível a 64 px com ícones + rótulo), fundo `ink`, item ativo com barra lateral `brass` 3 px + texto `paper`, agrupamento por rótulos `grupo` ("Operação", "Cadastros"), em < md vira gaveta aberta por botão "Menu" com rótulo textual. *Justificativa de documentar agora:* evita redesenhar o header depois.

### 12.3 Padrões de navegação internos

- **Voltar:** link "← Agenda" no topo da página **[existe]**, sempre para o pai lógico (Preparos/Insumos/Cardápios → **Senhor Churrasco**, não Início — corrige UX-AUDIT §2.11). Breadcrumb não é necessário (profundidade máxima 3).
- **Abas de visão** (Agenda / Em sequência): `role="tablist"`/ou `nav` com `aria-current`; estado ativo `paper` com texto `paper-ink` **[existe]**, acrescentar `aria-current`.
- **Ação principal da página** (ex.: "Novo evento"): no cabeçalho, alinhada à direita em ≥ sm e **abaixo do título em largura total em mobile**.
- **Barra de ações fixa** (formulários longos): rodapé fixo (`z-40`) com "Salvar"/"Cancelar" e status "Alterações não salvas" — **[novo, fase C]**. Em formulários curtos (< 1,5 tela), botão no fim do formulário basta.
- **Paginação:** não existe hoje. Listas grandes (eventos, preparos) usam **filtro por período/busca** e "Mostrar mais" (carregar 25 por vez), nunca paginação numerada. *Porque* o usuário procura "o próximo" ou "um item que conheço", não a página 7.
- **Agenda — padrão de abertura:** "Em sequência" começa em **hoje** com link "Ver eventos passados" (UX-AUDIT §1.9).

---

## 13. Ícones

Conjunto mínimo de SVG inline, traço de 1,5–2 px, 16/20 px, `currentColor`. Lista (cada um com função real):
`alerta` (triângulo), `erro` (círculo ✕), `sucesso` (✓), `info` (i), `fechar` (×), `editar` (lápis), `excluir` (lixeira), `adicionar` (+), `voltar` (←), `seta-mais` (→), `subir`/`descer`, `imprimir`, `whatsapp-status` (3 formas), `calendario`.
Substitui emojis (⚠️ 🟢🟡🔴), cuja renderização varia por sistema e que não herdam cor. Sem biblioteca externa (CLAUDE.md: poucas dependências) — arquivo único de SVGs.

---

## 14. Estados de tela

### 14.1 Loading

| Contexto | Padrão | Justificativa |
|---|---|---|
| Navegação entre páginas | Esqueleto da estrutura da página (título + 3 linhas de lista) no lugar do "Carregando…" central | O usuário percebe a forma do que vem; o `loading.tsx` raiz atual deixa a tela vazia. **Atenção: `loading.tsx` altera as respostas HTTP das rotas protegidas e o smoke test do deploy depende disso (UX-AUDIT §9); mexer só com o `deploy-oracle.sh` revisado.** |
| Ação de formulário | Botão "Salvando…" + desabilitado; campos permanecem | Evita duplo envio |
| Cálculo de preço (debounce 600 ms) | Valor anterior **esmaecido** (não apagado) + texto "Calculando…" com `aria-live="polite"` | Não "pisca" o valor e deixa claro que está desatualizado. **Nunca mostrar valor parcial como final** (REGRAS §15) |
| Polling do WhatsApp | Sem indicador (silencioso) | Atualização de fundo, não ação do usuário |
| Primeira carga do indicador | Espaço reservado de 24 px | Evita deslocamento do header |

Spinner: só ≥ 1 s de espera, 16 px, `currentColor`; esqueleto usa `paper-dim` pulsante **desligado com `prefers-reduced-motion`**.

### 14.2 Estados vazios

Fórmula: **o que está vazio + por quê + a ação** (sempre um verbo). Sem ilustração.

| Local | Texto proposto (ajustar com o Pedro) | Ação |
|---|---|---|
| Home — sem eventos em 15 dias | "Nenhum evento nos próximos 15 dias." | "Ver agenda completa" |
| Agenda — sem eventos | "Nenhum evento cadastrado." | "Novo evento" |
| Lista com filtro sem resultado | "Nenhum preparo encontrado com 'xyz'." | "Limpar filtros" |
| Preparos/Cardápios/Colaboradores vazios | Texto atual **[existe]** | Botão primário "Novo …" **dentro** do vazio |
| Insumos vazios | "Insumos são criados a partir da composição de um preparo." **[existe]** | Link "Ir para Preparos" |
| Orçamentos em aberto (novo) | "Nenhum orçamento em aberto." | "Gerar orçamento" |
| Composição sem insumos | "Nenhum insumo adicionado." **[existe]** | "+ Adicionar insumo" |

### 14.3 Estados de erro

| Nível | Padrão | Regra |
|---|---|---|
| **Campo** | Borda `perigo` + mensagem abaixo com ícone | Dizer como corrigir |
| **Formulário** | Resumo `perigo` no topo + foco nele + **valores preservados** | Todos os formulários devolvem `{erro, valores}` (UX-AUDIT §1.2–1.3) |
| **Ação (falha de rede/servidor)** | Alerta `perigo` no ponto da ação com "Tentar de novo" | Não perder o que o usuário digitou |
| **Cálculo (fail-hard)** | Alerta `perigo` com `mensagem` do payload; total **oculto** | REGRAS §15 |
| **Página (`error.tsx`)** | Mantido: título "Algo deu errado", **código** (`digest`), "Tentar de novo" e "Voltar ao início"; **não** expor `error.message` **[existe, mantido]** | Segurança: pode vazar detalhes de banco |
| **404** | Mantido **[existe]** | — |
| **Serviço externo (WhatsApp offline)** | Aviso `aviso` não bloqueante: "O restante do sistema continua funcionando." **[existe no modal]** | Falha do worker não é falha do app |
| **Sessão/usuário** | Redireciona para login com mensagem opcional | Hoje silencioso |

---

## 15. Responsividade

### 15.1 Breakpoints

Usar os do Tailwind já presentes (sem criar novos):
`< 640` (mobile, **projetar primeiro**), `≥ 640 sm`, `≥ 768 md`, `≥ 1024 lg`. **Larguras de teste obrigatórias:** 360, 390, 768, 1280.

### 15.2 Regras por padrão

| Padrão | Mobile | Desktop |
|---|---|---|
| Gutter / topo | 16 px / 24 px | 24 px / 64 px |
| Formulários | 1 coluna; grids de 3–4 campos curtos viram **2 colunas** só para campos ≤ 6 caracteres (horas, quantidades), senão 1 | 2–4 colunas |
| Ação principal | Largura total, no fim do formulário **e** barra fixa em formulários longos | Auto, alinhada à esquerda |
| Cabeçalho de página | Título, depois ação em largura total | Título à esquerda, ação à direita |
| Lista de entidades | Linha única com ação textual de 44 px | Linha com colunas |
| Tabela | Vira lista de cartões | Tabela |
| Modal | Quase tela cheia, botão no rodapé | Centralizado, `max-w` por tipo |
| Filtros | Empilhados; **campo de busca primeiro**, demais em "Filtros" expansível | Em linha |
| Navegação | Header + segunda linha de itens | Header único |

### 15.3 Calendário
- **Mobile:** o padrão inicial é a visão **"Em sequência"** (lista agrupada por dia), e o calendário mensal vira **mini-mês** onde cada dia mostra **só um ponto/contador** e **tocar abre a lista do dia** abaixo. *Porque* células de ~50 px não comportam nomes (UX-AUDIT §4.1). **[confirmar com teste real em celular antes de remover o mês completo]**
- **≥ md:** grade completa; cada evento = bolinha + nome; "+N mais" vira **botão** que expande o dia; dia com nome acessível ("15 de outubro, 2 eventos").
- Legenda das empresas sempre visível (já existe).

### 15.4 Ficha Técnica e impressão
- Tela: folha branca (`#fff`, texto preto) **[existe]** dentro de `pagina-documento`; **cabeçalho do app escuro permanece acima** (decisão atual), mas a barra de ações da folha ("Voltar", "Imprimir") passa a usar componentes do sistema.
- Impressão: **sem alteração de comportamento**; qualquer ajuste só na fase F, com teste de PDF real (dois bugs prévios em produção).
- Tema de documento é **separado** do tema do app: preto sobre branco, sem cor de marca. *Porque* vai para papel, às vezes em impressora monocromática.

### 15.5 Toque x ponteiro
- `hover` só realça; nenhuma informação essencial só em hover.
- `:active` mantém o feedback `scale(.97)` **[existe]**.
- Teclado e leitor de tela: ordem de foco = ordem visual; `aria-live` para cálculos; landmarks `header`, `nav`, `main`.

---

## 16. Tokens propostos para `@theme` (resumo, sem implementar)

```
Cores:   ink, ink-soft, paper, paper-dim, paper-ink        [existem]
         ember, brass, sage                                [existem — só identidade de empresa]
         acao #a8431d, acao-forte #9c3c19, acao-claro #e8825a      [novos]
         perigo-claro #f08294 / perigo-escuro #a3243a              [novos]
         aviso-claro #e6b957 / aviso-escuro #7a5410                [novos]
         sucesso-claro #9fae88 / sucesso-escuro #4f5b3f            [novos]
         info-claro #8fb3cf / info-escuro #2f5775                  [novos]
         texto-suave-papel #6b5b46, texto-suave-escuro #a89c85     [novos]
         borda-campo #8a7d68                                       [novo]
Fontes:  display (Fraunces), sans (Archivo)                [existem]
Raio:    raio 2px, raio-total 9999px
Sombra:  elev-1, elev-2, elev-3
Z:       header 10, barra-acoes 40, modal 50, tooltip 60
Largura: pagina-estreita 42rem, pagina-media 56rem, pagina-documento 48rem
Movimento: --motion-fast/base/slow/ease/stagger            [existem, mantidos]
```

Os valores de movimento atuais (150/220/300 ms, ease `cubic-bezier(.16,1,.3,1)`) são mantidos: já respeitam `prefers-reduced-motion` e a Ficha Técnica.

---

## 17. Componentes a construir (ordem sugerida) e o que cada um resolve do UX-AUDIT

| # | Componente | Resolve |
|---|---|---|
| 1 | Tokens em `@theme` (cores, raio, sombra, z, largura) | §2.1, §2.6, §2.8, §2.9, contraste §3 |
| 2 | `Botao` + `BotaoEnviar` | §2.1, §1.4, §1.10 |
| 3 | `Campo` (rótulo/ajuda/erro/`id`) e `Select`, `Checkbox` | §3.2, §3.11, erro por campo |
| 4 | `Alerta` | §2.6, §3.8, avisos de regra de negócio |
| 5 | `Modal` ajustado + `ModalConfirmacao` | §1.6, §2.3–2.5 |
| 6 | `Painel`, `CartaoEntidade`, `CartaoAtalho` | §2.8, faixa de empresa |
| 7 | `Badge` / `ChipEmpresa` | §3.5 |
| 8 | `Header` com 4 itens + usuário + skip link | §4.2 |
| 9 | Estados `Vazio`, `Esqueleto` | §1.10, loading |
| 10 | Calendário móvel e lista de orçamentos em aberto | §1.1, §4.1 |

(A ordem de implementação das *telas* segue as fases A–F do UX-AUDIT §8.)

---

## 18. Pontos que dependem do Pedro ou de teste real

1. **Proporção celular/desktop** do uso real (define quanto investir em mobile; hoje é premissa).
2. **Siglas SC / AC / EPN** (inventadas aqui).
3. **Cores de status do evento** (Orçado/Confirmado/Realizado/Cancelado): mapeamento é proposta.
4. **Textos de estados vazios e de resumo de confirmação**: tom e palavras.
5. **Sucesso em `sage`** vs verde: confirmar se confunde com a Em Plena Natureza.
6. **Calendário mobile como lista por padrão**: validar com uso real.
7. **Fraunces nos totais do Simulador**: verificar legibilidade dos dígitos em tela.
8. **Header fixo ou não** em ≥ md.
9. **Contraste dos fundos translúcidos de alertas** (texto sobre `cor/12–15 %`): reconferir na implementação.
10. **Zoom automático em iOS** nos campos de 14 px: confirmar em aparelho.

## 19. Restrições que este design **respeita** (não alterar)

- Regra de **preço congelado** (Passo 2 → 3), cardápio fixo após orçamento, itens excluídos sempre visíveis e fail-hard (REGRAS §2, §10, §15).
- **Exclusão de evento** continua hard delete sem restrição nova (REGRAS §6).
- Textos legais/operacionais de regra (ex.: "Ordens de Ação enviadas… não atualizam mensagens já enviadas") permanecem.
- Opções das decisões operacionais e valores legados (`OPCOES_POR_CAMPO`) não mudam.
- Comportamento de impressão da Ficha Técnica (`@media print`) não muda sem teste de PDF.
- `name=` dos inputs e a ordem dos campos dos formulários de orçamento/confirmação/evento não mudam.
