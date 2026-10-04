# Design System — Anjos Eventos (direção Brasa)

Status: **direção Brasa escolhida pelo Pedro em 2026-10-04**. Este documento descreve o **alvo**; o código só passa a refletir cada parte quando a etapa correspondente do redesign 2 for implementada (tabela abaixo). Referência visual: `docs/design/prototipos/direcao-1/` (HTML+CSS estático) e `docs/design/REDESIGN-2-PROPOSTA.md` (auditoria, contrastes, riscos, plano). Base anterior: `docs/design/UX-AUDIT.md`.

Convenções:
- **[implementado]** = já está no código. **[alvo]** = definido aqui, ainda não implementado. **[confirmar]** = depende do Pedro ou de teste real.
- Razões de contraste foram **calculadas** (fórmula WCAG 2.x) com os hex indicados; não foram medidas em tela. **Toda cor nova precisa de contraste calculado antes de entrar.**
- Nenhuma regra de negócio (`docs/REGRAS_NEGOCIO.md`) é alterada por este documento.

## Estado da implementação

| Etapa | Conteúdo | Estado |
|---|---|---|
| 0 | Docs (este arquivo, a skill `anjos-design-system`, `docs/DECISOES.md`) | feita |
| 1 | `next/font/local` (fontes do redesign e fontes antigas da Ficha) | feita (2026-10-04) |
| 2 | Tokens e componentes base (`Botao`, `BotaoEnviar`, `Campo`, `Alerta`, `Painel`, `Modal`, `Vazio`) | feita (2026-10-04); ver `docs/DECISOES.md`, "Etapa 2" |
| 3 | Shell: menu lateral, abas, topo mobile, skip link, "Trocar usuário", WhatsApp | feita (2026-10-04); ver `docs/DECISOES.md`, "Etapa 3" |
| 4 | Home + formulário longo (orçamento) | pendente |
| 5 | Listas, cartões, badges, tabelas, modais de seleção, demais telas | pendente |
| 6 | Fechamento (limpeza dos tokens antigos, lista final "PRECISA DE LÓGICA") | pendente |

Até a Etapa 6, os tokens antigos (`ink`, `paper`, `ember`, `brass`, `sage`, `acao`…) continuam existindo ao lado dos novos; só saem quando nenhum arquivo os usar mais.

---

## 0. O que mudou em relação ao design system anterior, e por quê

| Tema | Antes (primeira fase) | Agora (Brasa) | Por quê |
|---|---|---|---|
| Tema | Moldura escura `ink` com "papel" claro para ler dados | **Tudo escuro**: fundo, superfície e elevada em três degraus de grafite quente | Duas linguagens (escuro e claro) sem regra visível era uma das queixas da auditoria; um só tema simplifica e combina com uso noturno em salão |
| Forma | Raio de 2 px em tudo | **Escala de raio por papel**: 8, 12, 14, 16, 20, 28 px | O Pedro achou o app "quadrado e rígido"; raio por papel dá hierarquia (controle, linha, cartão, modal) |
| Tipografia | Fraunces itálico (títulos) + Archivo | **Bricolage Grotesque** (títulos) + **Instrument Sans** (texto). Fraunces e Archivo ficam só para a Ficha Técnica | Itálico serifado em tudo dava tom de convite até em telas de valores; a grotesca de títulos é mais firme e legível |
| Navegação | Header superior com 4 itens | **Menu lateral** (≥ 900 px) e **barra de abas** embaixo (< 900 px) | Alvo de toque e polegar no celular; o desktop ganha menu sempre visível |
| Cor de ação | Terracota escura `#a8431d` | **Brasa** `#f2753f` com texto escuro | Terracota escura sobre fundo escuro quase não destaca; brasa dá o contraste de valor que faltava |
| Elevação | Sombras literais copiadas em cada cartão | **Degraus de superfície + borda**; sombra só no modal, na barra de salvar e no brilho do botão primário | Em tema escuro sombra quase não aparece; a hierarquia vem da claridade da superfície |
| Movimento | 150/220/300 ms, entrada de página escalonada | **120 / 200 / 260 ms** (micro, componente, overlay); sem entrada escalonada de página | Faixas pedidas pelo Pedro; movimento só responde à ação do usuário |
| Home | Título centralizado, cartões iguais, pendências escondidas | **Herói "Próximo evento"**, painel de pendências e lista com tile de data | A informação que pede ação passa a ficar visível |
| Formulário | Coluna única, botão só no fim | **Seções em painéis**, índice lateral (âncoras) no desktop e **barra de salvar fixa** | Rolar ~3000 px para salvar |
| Dependências | Nenhuma de UI | Nenhuma obrigatória. **Radix só onde uma tela precisar** (§11.11); shadcn/ui só depois de teste com Next 16 | Poucas dependências (CLAUDE.md) |

**Decisões do Pedro (2026-10-04) que valem para todo o redesign:**
1. `next/font/local` é a Etapa 1, sozinha, com build no `ender`. A Ficha Técnica mantém as fontes antigas; as do redesign têm **nomes novos**.
2. Radix só onde uma tela precisar (Dropdown, Tooltip, Popover, Command para busca de insumo e de itens de cardápio). **O `Modal` atual fica**; o miolo não troca por Radix.
3. shadcn/ui: antes de instalar, teste de compatibilidade com Next 16 numa branch descartável, com build no `ender`, e mostrar o resultado. Se falhar ou não estiver claro: Radix direto e componentes próprios. Componente a componente; nunca `init` que reescreva `globals.css` sem o Pedro ver o diff.
4. `listarEmpresas()` pode ser chamada na Home (atalhos de novo orçamento por empresa), **sem alterar a função**.
5. "Em N dias" só se for **derivado na UI** da data que a lista da Home já traz, no fuso `America/Sao_Paulo`, por **diferença de dias de calendário** (não de horas), sem query nova e sem mudar a função que busca os eventos. Se exigir mexer na query: parar e listar em "PRECISA DE LÓGICA".
6. Valor do evento na Home e todo item da lista "PRECISA DE LÓGICA, NÃO IMPLEMENTAR" ficam de fora (§19).

**Escolhas minhas onde o protótipo era ambíguo (registradas; o Pedro pode reverter):**

| # | Ambiguidade | Escolha | Motivo |
|---|---|---|---|
| E1 | O protótipo não mostra o WhatsApp nem "Trocar usuário" no celular | Desktop: rodapé do menu lateral, acima do nome do usuário. Celular: topo, à direita (nome truncado, "Trocar" e o indicador), como no header atual | "Nada some; só muda de lugar" |
| E2 | O protótipo tem avatar com a inicial do usuário | **Sem avatar**: só o nome | O avatar estava na lista "PRECISA DE LÓGICA" da proposta (elemento novo) e o Pedro excluiu essa lista |
| E3 | Um botão "Novo orçamento" no topo da Home (protótipo) vs. atalhos por empresa (decisão 4) | Seção **"Novo orçamento"** com **três atalhos** (um por empresa, ids vindos de `listarEmpresas()`), no lugar do botão único. O botão do topo da **Agenda** continua | A decisão 4 só faz sentido com atalhos por empresa; o botão único repetiria a rota `/agenda/novo` |
| E4 | O rail e a barra de abas são dois desenhos; o `IndicadorWhatsapp` faz polling | Dois blocos no DOM (menu lateral e topo/abas), cada um com sua cópia de "Trocar usuário" (a oculta fica `display: none`, fora do foco e do leitor de tela). **O `IndicadorWhatsapp` só monta no bloco visível** (`matchMedia`), para não duplicar o polling | Um único desenho com `order` quebraria "ordem de foco = ordem visual" em uma das larguras |
| E5 | Ponto de troca entre menu lateral e abas | Breakpoint próprio de **900 px** (token `rail`), como no protótipo; 768 px usa o layout de abas | Com 768 px o menu lateral deixaria só ~520 px para o formulário |
| E6 | Largura do conteúdo: o protótipo usa 1120 px | **Padrão 1120 px** em Home, Agenda e formulários longos (com índice); formulários curtos e telas de detalhe ficam em **48rem (768 px)**; a Ficha Técnica mantém `pagina-documento` | O protótipo só cobre Home, lista e formulário longo |
| E7 | Teclado virtual e a barra de abas fixa | Com `input`, `select` ou `textarea` em foco, **a barra de abas é escondida só por CSS** (`:has(:focus)`), no celular | A barra não pode subir com o teclado nem cobrir o campo; não depende de JS |
| E8 | Brasa é a cor de **ação** e é também a cor da empresa Senhor Churrasco (`#f2753f` nos dois) | **Mantido como no protótipo, com mitigação**: a cor da empresa aparece só em ponto de 8 px e em tile a 16 % (nunca como botão), sempre com o **nome da empresa ao lado**; a ação é sempre preenchimento sólido ou link com texto. Se o uso mostrar confusão, trocar o tom da empresa **[confirmar]** | Preserva a direção aprovada; "cor significa uma coisa" vira "cor nunca é o único sinal" |
| E9 | Aviso (`#f2c14e`) e Anjos Cerimonial (`#d9a441`) têm matiz parecido | Aviso sempre com **ícone de triângulo e texto**; empresa sempre com ponto + nome | Mesma razão |
| E10 | Cartão "em N dias": o que mostrar em "hoje" e "amanhã" | `hoje`, `amanhã`, `em N dias` (N ≥ 2); data passada nunca ocorre (a query só traz de hoje em diante) | A decisão 5 aprova "em N dias"; hoje e amanhã são o mesmo cálculo |

---

## 1. Quem usa e em que situação

Evidências vêm do código e da documentação, não de pesquisa com usuários (**não existe pesquisa; premissas de uso precisam de confirmação do Pedro**).

| Fato | Origem | Consequência de design |
|---|---|---|
| Equipe pequena de uma operação de eventos (3 empresas); login é "quem está usando?", sem senha | `login/page.tsx`, `usuario-atual.ts` | Interface sem cerimônia: poucos cliques, nenhum fluxo de conta |
| Acesso via Tailscale, provavelmente celular e desktop **[confirmar proporção]** | comentário em `usuario-atual.ts` | Mobile é requisito de primeira classe |
| Tarefa central: orçar → confirmar → preparar o evento, com **dinheiro e contrato** | REGRAS §2, §3, §5 | Clareza de valores e confirmação de ações irreversíveis valem mais que estética |
| Uso em salão à noite e em chácara de dia (Ficha Técnica impressa, equipe via WhatsApp) | `fichas-tecnicas`, `automacao-whatsapp` | Leitura rápida, números grandes. **Tema escuro lê pior ao sol: não testado em campo [confirmar]** |
| Quem mantém tem pouco tempo (CLAUDE.md) | CLAUDE.md | Poucos componentes, poucas variantes, tokens em um lugar só |

Tarefas por frequência provável: ver o que vem aí (Home/Agenda) → resolver pendências → criar orçamento → confirmar evento → consultar a ficha técnica → cadastrar equipe e insumos.

---

## 2. Filosofia visual

> **Brasa: a noite do evento.** Grafite quente, uma só cor viva para o que é ação, cantos macios e o próximo evento em destaque.

Princípios (cada um com o porquê):

1. **Informação antes de decoração.** Cada tela responde "o que preciso fazer agora?". Sem gráficos nem "cards de KPI" para preencher espaço.
2. **Dinheiro e ações irreversíveis têm tratamento próprio.** Valores em números tabulares; ações que gravam contrato ou apagam dados têm confirmação clara (REGRAS §2, §6).
3. **Cor nunca é o único sinal.** Brasa = ação; estados têm cores próprias; empresa = ponto + nome (ver E8, E9). Todo estado tem ícone ou texto.
4. **Um herói por tela, o resto calmo.** A Home destaca o próximo evento com o único brilho decorativo do produto; as demais telas não têm brilho.
5. **Hierarquia por claridade, não por sombra.** Fundo → superfície → elevada, separados por borda fina; sombra só em overlay.
6. **Reutilizar antes de criar.** Variante nova só com uso real no código.
7. **Funciona sem hover e sem cor.** Tudo do desktop existe no toque.

| Evitado | Motivo |
|---|---|
| `backdrop-filter` e vidro fosco | Criam contexto de empilhamento (já quebraram o modal) e reduzem contraste |
| Gradiente em cartões e listas | Só o brilho do herói da Home e o sinal da marca têm gradiente |
| Roxo/azul "SaaS", avatares coloridos | Nada disso vem do negócio |
| Ilustrações e mascotes em estados vazios | Texto objetivo com ação resolve |
| Maiúsculas espaçadas como rótulo | O protótipo não usa; rótulos em frase |
| "Pílula" em tudo | Só o círculo de pontos e a marca; chips têm raio 8 |
| Animação de entrada em lista e página | Movimento só responde à ação (§10) |

---

## 3. Personalidade da interface

| Atributo | Como aparece | Como **não** aparece |
|---|---|---|
| **Confiável** | Valores com símbolo e casas (`R$ 1.234,00`) em números tabulares; resumo antes de gravar | Texto vago ("Sucesso!"), números sem unidade |
| **Acolhedora** | Grafite quente, cantos macios, tom humano ("Nenhum evento nos próximos 15 dias.") | Humor, emoji em texto de sistema, "Oops!" |
| **Direta** | Verbo + objeto nos botões (**Salvar orçamento**, **Excluir evento**); erro diz o que corrigir | Mensagem técnica |
| **Tranquila sob pressão** | Aviso só para o que pede ação; pendências agrupadas num painel | Vários tons de vermelho disputando atenção |

**Assinatura visual:** (1) o **brilho de brasa** no herói "Próximo evento"; (2) o **tile de data** (dia grande sobre tinta da empresa a 16 %); (3) a **marca** com o sinal de brasa (círculo de 12 px com brilho); (4) o **menu lateral** com item ativo em brasa a 16 %.

---

## 4. Paleta de cores

### 4.1 Tokens **[alvo]** (nomes novos; os antigos ficam até a Etapa 6)

| Token (`--color-…`) | Hex | Papel |
|---|---|---|
| `fundo` | `#151210` | Fundo da página, fundo de campo |
| `superficie` | `#1f1a17` | Cartões, linhas de lista, painéis de seção |
| `elevada` | `#2a2420` | Modal, barra de salvar, item em hover, bloco dentro de cartão |
| `menu` | `#1a1512` → `fundo` (degradê vertical) | Fundo do menu lateral |
| `borda` | `rgb(255 255 255 / .08)` | Divisores e contorno de cartão (decorativo) |
| `borda-forte` | `rgb(255 255 255 / .16)` | Contorno de botão secundário, hover de cartão |
| `borda-controle` | `#8a7e73` | Borda de input, select e caixa de seleção |
| `texto` | `#f4eee8` | Texto principal |
| `texto-suave` | `#b9ada2` | Texto secundário, rótulo, ajuda |
| `brasa` | `#f2753f` | Fundo do botão primário; ícone de item ativo |
| `brasa-hover` | `#ff8a57` | Hover do primário |
| `sobre-brasa` | `#1a0e08` | Texto sobre `brasa` |
| `link` | `#ff9a6b` | Link e ação em texto |
| `foco` | `#ffc089` | Anel de foco |
| `perigo` | `#ff8c98` | Erro, exclusão (texto, ícone, preenchimento do botão) |
| `sobre-perigo` | `#1f0a0d` | Texto sobre `perigo` |
| `aviso` | `#f2c14e` | Aviso, pendência |
| `sucesso` | `#a8c48f` | Sucesso, "Confirmado" |
| `info` | `#8dbbe0` | Informação, "Orçado" |
| `emp-churrasco` | `#f2753f` | Empresa Buffet Senhor Churrasco |
| `emp-cerimonial` | `#d9a441` | Empresa Anjos Cerimonial |
| `emp-chacara` | `#8db27a` | Empresa Em Plena Natureza |

Mapeamento empresa→cor: `src/lib/formatacao.ts` (`coresEmpresa`); na Etapa 5 ele passa a apontar para os tokens `emp-*` (mudança de classe, não de regra).

### 4.2 Contrastes calculados (WCAG 2.x)

| Par | Razão | Mínimo |
|---|---|---|
| `texto` / `fundo` · `superficie` · `elevada` | 16,20 · 14,97 · 13,30 | 4,5 |
| `texto-suave` / `fundo` · `superficie` · `elevada` | 8,49 · 7,85 · 6,97 | 4,5 |
| `sobre-brasa` / `brasa` · `brasa-hover` | 6,66 · 8,13 | 4,5 |
| `link` / `fundo` · `superficie` · `elevada` | 8,96 · 8,28 · 7,35 | 4,5 |
| `foco` / `fundo` · `superficie` | 11,68 · 10,80 | 3 |
| `borda-controle` / `fundo` · `superficie` · `elevada` | 4,72 · 4,36 · 3,87 | 3 |
| `brasa` / `fundo` (forma do botão) | 6,57 | 3 |
| `sobre-perigo` / `perigo` · hover `#ffa3ad` | 8,54 · 10,02 | 4,5 |
| `perigo` / `superficie` | 7,76 | 4,5 |
| `aviso` / `superficie` | 10,27 | 4,5 |
| `sucesso` / `superficie` | 8,99 | 4,5 |
| `info` / `superficie` | 8,47 | 4,5 |
| `emp-churrasco` · `emp-cerimonial` · `emp-chacara` / `superficie` | 6,07 · 7,66 · 7,21 | 3 (forma) |
| Texto do tile de data (empresa a 16 % sobre `superficie`) | 4,74 · 5,69 · 5,43 | 4,5 |
| Chip de status (cor sobre a própria cor a 14 %): Confirmado · Orçado · Cancelado | 6,75 · 6,43 · 6,03 | 4,5 |
| Chip "Realizado" (`texto-suave` sobre branco a 6 %) | 6,65 | 4,5 |
| `texto` sobre chip de empresa (branco a 6 %) | 12,69 | 4,5 |
| `texto` sobre item de menu ativo (`brasa` a 16 % sobre `menu`) | 12,45 | 4,5 |
| `sobre-brasa` sobre o ícone da caixa marcada (`brasa`) | 6,66 | 3 |
| Texto do alerta (cor cheia) sobre a própria cor a 10 % sobre `fundo` · `superficie` · `elevada`: perigo | 7,21 · 6,56 · 5,77 | 4,5 |
| idem aviso | 9,16 · 8,29 · 7,26 | 4,5 |
| idem sucesso | 8,15 · 7,40 · 6,49 | 4,5 |
| idem info | 7,75 · 7,04 · 6,19 | 4,5 |

Texto em `elevada` e `fundo` com `texto-suave` passa em todos os casos acima. **Qualquer cor ou mistura fora desta tabela precisa ser calculada antes de entrar.**

### 4.3 Superfícies e quando usar

- **Página:** `fundo`. **Cartão, linha de lista, painel de seção:** `superficie` com `borda`. **Modal, barra de salvar, hover:** `elevada`.
- **Campo:** `fundo` dentro de um painel `superficie` (o campo "afunda"), borda `borda-controle`.
- Cartão dentro de cartão (ex.: bloco de pendência no painel) usa `elevada`.
- Texto secundário **nunca** usa opacidade; usa `texto-suave`.

---

## 5. Cores semânticas

| Semântica | Quando usar | Cor | Ícone/forma obrigatório |
|---|---|---|---|
| **Perigo** | Erro de validação, exclusão, falha de cálculo (fail-hard §15) | `perigo` | ✕ em círculo / lixeira |
| **Aviso** | Item pendente, itens fora do cálculo (§10), valor que "NÃO reflete o cardápio inteiro" | `aviso` | triângulo "!" |
| **Sucesso** | "Salvo", "Confirmado", conexão ativa | `sucesso` | ✓ |
| **Informação** | Ajuda de campo, "Orçado", valor pré-preenchido do cardápio pré-montado | `info` | "i" em círculo |

Fundo de alerta: a cor semântica a **10 %** sobre `superficie`, **borda de 1 px a 50 %**, texto na cor cheia (contraste do texto sobre o fundo misturado **calculado na Etapa 2**: menor razão 5,77 — `perigo` sobre `elevada`; ver tabela 4.2).

Pendências da Home usam `aviso`; erro usa `perigo`; **nunca só cor** (E8, E9).

### 5.1 Cor da empresa (identidade, não estado)

| Empresa | Token | Onde aparece |
|---|---|---|
| Buffet Senhor Churrasco | `emp-churrasco` | Ponto de 8 px no chip, tile de data (tinta a 16 %), atalho de novo orçamento |
| Anjos Cerimonial | `emp-cerimonial` | idem |
| Em Plena Natureza Chácara de Eventos | `emp-chacara` | idem |

Regras: a cor da empresa só aparece onde há entidade daquela empresa; **sempre com o nome por perto** (chip: ponto + nome); nunca é fundo de botão; cartões neutros (atalhos do hub) não usam cor de empresa.

---

## 6. Tipografia

### 6.1 Famílias **[alvo]**

| Família | Token | Uso |
|---|---|---|
| **Bricolage Grotesque** 600, 700 | `--font-titulo` | Títulos de página, seção e bloco, nome do cliente em cartão de destaque, título de modal, números grandes (dia no tile) |
| **Instrument Sans** 400, 500, 600 | `--font-texto` | Todo o resto: formulários, listas, botões, valores, mensagens |
| Fraunces 400 (normal e itálico) e Archivo 400, 500 | `--font-display`, `--font-sans` **[existem; não reutilizar o nome]** | **Só a Ficha Técnica.** Mantidos para a impressão não mudar |

Regras:
1. Arquivos em `src/app/fonts/` via `next/font/local`, subset latino (cobre pt-BR). Pesos estáticos: Bricolage 600/700 e Instrument Sans 400/500/600 (~94 KB) mais Fraunces e Archivo (~69 KB) enquanto a Ficha existir.
2. O `font-family` do `body` do redesign vale em todas as telas **menos** onde houver `.sem-animacao` (Ficha): `body:has(.sem-animacao)` mantém Archivo, no mesmo padrão já usado em `globals.css`. O menu lateral e o topo declaram `--font-texto` por conta própria, para ficarem iguais também na Ficha em tela.
3. Valores monetários e quantidades com `font-variant-numeric: tabular-nums`.
4. Sem maiúsculas espaçadas como rótulo.

### 6.2 Escala **[alvo]** (base 16 px; campos de 16 px evitam o zoom do iOS **[confirmar em aparelho]**)

| Token | Tamanho / linha | Peso | Fonte | Uso |
|---|---|---|---|---|
| `titulo-pagina` | `clamp(30px, 4vw, 42px)` / 1,05, espaçamento −0,025em | 700 | Titulo | H1 de página |
| `titulo-secao` | 22 / 1,2, −0,01em | 600 | Titulo | H2 (Próximos 15 dias, Atalhos) |
| `titulo-bloco` | 20 / 1,2, −0,01em | 600 | Titulo | Título de painel de formulário, de modal (24 / 700 no modal) |
| `corpo` | 16 / 1,5 | 400 | Texto | Texto, valores de campos |
| `corpo-pequeno` | 14 / 1,4 | 400 | Texto | Metadados, descrições de lista |
| `rotulo` | 14 / 1,4 | 500 | Texto | Rótulo de campo |
| `legenda` | 13 / 1,4 | 400 | Texto | Ajuda de campo, chips (mínimo do produto: **12 px**) |
| `numero-destaque` | 18 / 1 | 600 | Titulo | "em N dias", valor total |
| `data-heroi` | `clamp(64px, 9vw, 92px)` / 0,95, −0,04em | 700 | Titulo | Dia do evento no herói |

Texto corrido ≤ 65 caracteres (`max-w-prose`).

---

## 7. Espaçamento

Base 4 px (escala do Tailwind). Aplicação:

| Espaço | Valor | Significa |
|---|---|---|
| Rótulo ↔ campo | 6 px | Pertencem juntos |
| Campo ↔ campo | 18 px | Mesma seção |
| Painel de seção ↔ painel | 16 px | Assunto novo |
| Padding de painel | 24 px desktop, 18 px mobile | — |
| Conteúdo (`miolo`) | 44 px topo / 48 px lados / 120 px base no desktop; **24 px / 16 px / 112 px no celular** (a base livra a barra de abas) | — |
| Linha de lista | 12 px de padding | Toque confortável |
| Bloco ↔ bloco | 40 px | — |

Larguras: **`pagina` 1120 px** (Home, Agenda, formulário longo); **`pagina-curta` 48rem** (formulário curto, detalhe); `pagina-documento` 48rem (Ficha, intacta).

---

## 8. Raio de borda **[alvo]**

| Token | Valor | Uso |
|---|---|---|
| `raio-chip` | 8 px | Chips, status, ícone dentro de atalho (com 44 px: 12) |
| `raio-controle` | 12 px | Botão, campo, select, item de menu, item de aba de visão |
| `raio-tile` | 14 px | Tile de data, segmento de visão |
| `raio-linha` | 16 px | Linha de lista, bloco dentro de cartão |
| `raio-cartao` | 20 px | Cartão, painel de seção, barra de salvar |
| `raio-modal` | 28 px | Modal (no celular: só os cantos de cima, como folha inferior) |
| círculo | 9999 px | Só o ponto de empresa e o sinal da marca |

---

## 9. Superfícies, elevação e camadas

| Nível | Quando | Como |
|---|---|---|
| 0 | Fundo | `fundo` |
| 1 | Cartão, linha, painel | `superficie` + `borda` + realce interno `inset 0 1px 0 rgb(255 255 255 / .05)` |
| 2 | Hover de linha/cartão, bloco interno | `elevada` + `borda-forte` |
| Overlay | Modal | `elevada` + `borda-forte` + sombra `0 32px 80px -20px rgb(0 0 0 / .75)`; fundo do overlay `rgb(10 7 6 / .72)` |
| Barra de salvar | Fixa no rodapé do formulário | `elevada` + `borda-forte` + sombra `0 18px 44px -12px rgb(0 0 0 / .7)` |
| Botão primário | — | Brilho `0 10px 28px -10px rgb(242 117 63 / .6)` |

Regras: elevação **não indica clicável**; sem sombra em cartão e lista; **sem `backdrop-filter` em lugar nenhum**; impressão: sem sombra, sem animação **[implementado]**.

**Escala de `z-index` (tokens `--z-*`)** — ordem obrigatória: **conteúdo < barra de salvar < menu/abas < overlay do modal < popover/tooltip < toast < skip link**

| Token | Valor | Elemento |
|---|---|---|
| `--z-conteudo` | 0 | Conteúdo e cartões |
| `--z-barra-acoes` | 20 | Barra de salvar do formulário |
| `--z-shell` | 30 | Menu lateral, topo, barra de abas |
| `--z-overlay` | 50 | Overlay e caixa do `Modal` (em portal no `<body>`) |
| `--z-popover` | 60 | Dropdown, popover, tooltip (se existirem; ficam acima do modal para funcionar dentro dele) |
| `--z-toast` | 70 | Toast (reservado; não existe hoje) |
| `--z-skip` | 100 | Skip link ao receber foco |

Os valores atuais `--z-header: 10`, `--z-barra-acoes: 40`, `--z-modal: 50`, `--z-tooltip: 60` são substituídos na Etapa 2. **Modais continuam em portal**; nenhum ancestral de `position: fixed` pode ter `transform`, `filter`, `perspective` ou `overflow` (a barra de abas e o menu lateral ficam fora de qualquer um).

---

## 10. Tamanhos, estados e movimento

### 10.1 Tamanhos

| Elemento | Celular | Desktop (≥ 900 px) |
|---|---|---|
| Botão `md` | 44 px | 44 px |
| Botão `sm` | 44 px | 36 px |
| Campo e select | 48 px | 48 px |
| Alvo clicável (qualquer) | ≥ 44 × 44 (área, não só o visual) | ≥ 36 × 36 |
| Item de aba | 64 px | — |
| Item de menu lateral | — | 44 px |
| Caixa de seleção | 24 px com rótulo clicável (alvo 44 px) | idem |

### 10.2 Estados

| Estado | Regra |
|---|---|
| Foco (teclado) | Anel de **2 px**, offset 2 px, `foco` (`#ffc089`), **sempre visível**. Campo: anel a 1 px de offset + borda `foco`. Em todas as superfícies do tema o contraste é ≥ 10,8:1 |
| Hover (ponteiro) | Mais claro (`elevada`, `borda-forte`, `brasa-hover`); nunca revela informação |
| Pressionado | `translate: 0 1px` (propriedade `translate`, não `transform`) |
| Desabilitado | Opacidade 50 % + `cursor: not-allowed` + `disabled` real |
| Carregando | Texto "Salvando…" + botão desabilitado + `aria-busy` |
| Erro | Borda `perigo` 2 px + mensagem abaixo com ícone, `aria-invalid`, `aria-describedby` |
| Somente leitura/calculado | Sem borda de campo, texto rotulado (não `input disabled`) |

### 10.3 Movimento **[alvo]**

| Token | Valor | Uso |
|---|---|---|
| `--motion-micro` | 120 ms | Cor, borda, hover, pressionar, caixa de seleção |
| `--motion-comp` | 200 ms | Linha, cartão, abas de visão |
| `--motion-overlay` | 260 ms | Modal (entra: sobe 14 px e aparece; sai em 120 ms) |
| `--motion-ease` | `cubic-bezier(.2, .8, .2, 1)` | Todas |

Regras: sem animação de entrada de página nem de lista; **`prefers-reduced-motion: reduce` desliga animação e transição**; nunca em `@media print` nem na Ficha (`body:has(.sem-animacao)`); só as propriedades `translate` e `scale`, nunca `transform` residual (animações com `animation-fill-mode: backwards`).

---

## 11. Componentes

A **API atual** de `Botao`, `BotaoEnviar`, `Campo`, `Alerta`, `Painel`, `Modal`, `ModalConfirmacao`, `Vazio` **não muda** (props, render-prop de `Campo`, `data-foco-inicial`); muda só a aparência. Os formulários não mudam.

### 11.1 Botões

| Variante | Aparência | Quando usar |
|---|---|---|
| **Primário** | Fundo `brasa`, texto `sobre-brasa`, brilho, raio 12 | **Uma** ação principal por tela/seção |
| **Secundário** | Fundo branco a 5 %, borda `borda-forte`, texto `texto` | Alternativas: Cancelar, Fechar, Resolver pendências |
| **Perigo** | Fundo `perigo`, texto `sobre-perigo` | Só na confirmação de exclusão |
| **Link** | Texto `link` sublinhado (offset 4 px), altura de toque 44 px | Ação em linha |
| **Ícone** | 44 × 44 com `aria-label` | "×", ↑ ↓ |

Rótulo = verbo + objeto, capitalização de frase. O botão de envio sempre desabilita e muda o texto. "Aprovar e confirmar evento" mantém a tela de conferência (§11.7); a regra de preço congelado não muda. Excluir evento mantém confirmação por `ModalConfirmacao`.

### 11.2 Campos

Rótulo acima (`rotulo`), campo de 48 px com `fundo` e `borda-controle`, texto `texto`, placeholder `texto-suave`; ajuda (`legenda`) e erro (com ícone) abaixo. `Campo` continua entregando `id`, `className`, `aria-describedby`, `aria-invalid`. Números com `inputmode` adequado e prefixo/sufixo visual. Campos calculados em estado somente leitura. Erro específico e acionável.

### 11.3 Selects e caixas de seleção

`<select>` **nativo estilizado** igual ao campo, com seta SVG (`appearance: none`; `padding-right: 42px`). Caixa de seleção: input real visualmente oculto + caixa de 24 px (raio 8; marcada = `brasa` com ✓ `sobre-brasa`; foco no anel). Grupos em `fieldset/legend`. Combobox com busca (Command) só nos seletores de insumo e de itens de cardápio (§11.11).

### 11.4 Tabelas

`<table>` semântico só com colunas comparáveis (Insumos, Simulador, Ficha). Dentro de cartão `superficie`: cabeçalho `legenda` em `texto-suave`, zebra `rgb(255 255 255 / .03)`, linha de 44–48 px, números à direita com `tabular-nums`. **Celular: cada linha vira cartão; sem rolagem horizontal da página em 360 px**; a tabela de cálculos do Simulador pode rolar dentro de um contêiner com indicação.

### 11.5 Cartões

| Tipo | Anatomia | Elevação |
|---|---|---|
| **Herói** (Home, próximo evento) | `superficie`, raio 20, padding 28, brilho de brasa no canto, data gigante + nome + chip de empresa + "em N dias" + "Abrir evento" | Nível 1 |
| **Linha de evento** | Tile de data (68 × 76, tinta da empresa a 16 %) + nome e tipo/hora + chip de empresa + chip de status [+ valor, só onde a lista já traz] | Nível 1; hover nível 2 |
| **Atalho** | Ícone em quadrado de 44, título e descrição | Nível 1; hover nível 2 |
| **Painel de seção** | `superficie`, raio 20, padding 24/18, título `titulo-bloco` | Nível 1 |

A lista da Home **não mostra valor** (a query não o traz).

### 11.6 Modais

Mantém o `Modal` atual (portal, foco preso, Esc, clique fora configurável, foco devolvido, `data-foco-inicial`, título `h2` com `aria-labelledby`). Aparência: `elevada`, raio 28, padding 28, ícone de contexto em quadrado de 52 (perigo a 14 %), título 24/700, texto `texto-suave`, botões à direita (desktop). **Celular: folha inferior** (ancorada embaixo, cantos de cima 28, padding inferior com `env(safe-area-inset-bottom)`, botões em coluna invertida, como o `ModalConfirmacao` já faz). Foco inicial no botão seguro nas confirmações destrutivas. Clique fora não fecha modal com formulário preenchido.

### 11.7 Resumo de confirmação

Como antes: usado em "Aprovar e confirmar evento", mostra cliente, data, convidados e **valor total** com a frase de que o valor foi definido no orçamento. Só visual.

### 11.8 Badges e chips

| Tipo | Forma | Cores |
|---|---|---|
| **Status do evento** | Raio 8, `legenda` 600, cor sobre a própria cor a 14 % | Confirmado `sucesso`; Orçado `info`; Realizado `texto-suave` sobre branco a 6 %; Cancelado `perigo` |
| **Empresa** | Raio 8, fundo branco a 6 %, `texto`, ponto de 8 px na cor da empresa | `emp-*` |
| **Contagem / restrição** | Raio 8, neutro | — |

Máximo 2 chips por linha; mapeamento de cores de status é proposta **[confirmar]**.

### 11.9 Alertas

Ícone (forma por tipo) + título curto opcional + texto + ação. Fundo a 10 %, borda a 50 %, raio 16, texto na cor cheia. `perigo` = `role="alert"`; os demais `role="status"`. Posição: acima da área afetada. Os avisos de regra (itens fora do cálculo, fail-hard) **mantêm o texto e ficam sempre visíveis** (REGRAS §10, §15).

### 11.10 Tooltips

Nunca o único lugar de uma informação. Só quando uma tela precisar (§11.11).

### 11.11 Biblioteca de comportamento (Radix) e shadcn/ui

- **Radix só onde uma tela precisar:** Dropdown Menu, Tooltip, Popover e **Command (`cmdk`) para a busca de insumo na composição e de itens do cardápio**. Nada é instalado "por precaução"; cada um entra na etapa da tela que o usa, com justificativa de custo e risco.
- **O `Modal` atual fica**; não trocar o miolo por Radix Dialog.
- **shadcn/ui:** só depois de teste de compatibilidade com Next 16 numa branch descartável com build no `ender`, mostrado ao Pedro. Se falhar ou não estiver claro: Radix direto e componentes próprios. Componente a componente, com `add --dry-run` e `--diff`; **nunca `init` que reescreva `globals.css` sem o Pedro ver o diff**.
- Ícones: **SVG inline** (traço 1,75 px, `currentColor`, 20 px), sem biblioteca. Os SVGs usados estão nas páginas do protótipo.

---

## 12. Navegação (shell no layout raiz)

### 12.1 Estrutura

| | ≥ 900 px (token `rail`) | < 900 px |
|---|---|---|
| Navegação | **Menu lateral** de 248 px, fixo, altura da janela | **Topo** de 60 px + **barra de abas** fixa embaixo |
| Itens | Início, Agenda, Senhor Churrasco, Colaboradores (ícone + texto, 44 px) | os mesmos, em 4 abas (64 px; "Senhor Churrasco" quebra em duas linhas) |
| Marca | "Anjos Eventos" com o sinal de brasa, no topo do menu | no topo, à esquerda |
| Usuário | Rodapé do menu: **nome**, **Trocar usuário** (action `trocarUsuario`) | Topo, à direita: nome truncado, "Trocar" (nome acessível "Trocar usuário") |
| WhatsApp | Rodapé do menu, acima do nome | Topo, à direita |

Item ativo: `aria-current="page"`, fundo `brasa` a 16 %, texto `texto`, ícone `brasa`; na aba, também barra de 3 px `brasa` no topo. Prefixos de rota ativa mantidos (Início só `/`; Agenda `/agenda…`; Senhor Churrasco: hub + `/preparos`, `/insumos`, `/cardapios-modelo`, `/simulador-cardapio`; Colaboradores).

### 12.2 Regras

- **Ordem de foco = ordem visual (DOM):** skip link → menu lateral (marca, itens, WhatsApp, Trocar) **ou** topo (marca, Trocar, WhatsApp) → `#conteudo` → barra de abas. O menu lateral e o topo ficam antes do conteúdo no DOM; a barra de abas fica depois, que é onde está na tela. O bloco que não está visível fica `display: none`.
- `<nav aria-label="Navegação principal">` em ambos os blocos (só um visível por vez).
- **Skip link** "Ir para o conteúdo": primeiro foco, `--z-skip`, fundo `texto` com texto `fundo`; destino `<div id="conteudo" tabIndex={-1}>`.
- **Não existe `<h1>` no shell, no esqueleto nem na marca** (smoke test: página protegida sem sessão devolve 307 ou 200 com `NEXT_REDIRECT` e sem `<h1>`). Sem `loading.tsx` novo. `/login` continua **sem** o shell.
- O layout raiz **não ganha consulta nova ao banco**: continua só com `obterUsuarioAtual()` (com `.catch(() => null)`). Não alterar `actions/usuario.ts`, `usuario-atual.ts` nem a página de login.
- **Barra de abas e teclado virtual:** padding inferior no conteúdo (112 px), `env(safe-area-inset-bottom)` na barra, alvos de 64 px; com campo em foco a barra **é escondida por CSS** (E7). Não testado em aparelho **[confirmar]**.
- **Impressão:** o menu, o topo, a barra de abas e a barra de salvar têm `display: none` em `@media print`; o contêiner do shell volta a `display: block` e o fundo a branco, para a Ficha imprimir idêntica. Na tela, a Ficha aparece dentro do shell, com a folha igual à de hoje.
- Cada `<main>` de página hoje define o próprio `px-6 py-16`; a Etapa 3 move o espaçamento do conteúdo para o shell **sem** alterar a Ficha.
- Título da aba por página: `metadata` estática; nunca o nome do cliente.

### 12.3 Padrões internos

- **Voltar:** "← Agenda" no topo da página, sempre para o pai lógico (Preparos, Insumos e Cardápios voltam ao **Senhor Churrasco**).
- **Visão da Agenda** (Agenda / Em sequência): segmento com fundo `superficie`, item ativo `elevada`, `aria-current`.
- **Ação principal da página:** no cabeçalho, à direita no desktop; abaixo do título no celular.
- **Barra de salvar** (formulário longo): fixa no rodapé do formulário (`--z-barra-acoes`), acima das abas no celular (`bottom: 76px`); só "Cancelar" e "Salvar …"; **sem total ao vivo**.
- **Índice do formulário** (desktop): âncoras para as seções, sem item ativo por rolagem (isso exigiria JS novo).
- Paginação: não existe; sem busca nova (ver §19).

---

## 13. Ícones

SVG inline, traço 1,75 px, 20 px (16 px dentro de botão e chip), `currentColor`. Conjunto: início, agenda, churrasco (chama), equipe, adicionar, alerta, sucesso, fechar, seta, lixeira, seta para baixo (select). Substituem os emojis ⚠️ 🟢🟡🔴 (o `IndicadorWhatsapp` ganha ícone e texto curto na Etapa 3, **se** isso não alterar o comportamento do componente; caso contrário, só muda a cor).

---

## 14. Estados de tela

Tema escuro em tudo: formulários, alertas, tabelas, modais, vazios, erro e carregamento usam os mesmos tokens. Nada de fundo claro herdado.

### 14.1 Loading
Esqueleto da estrutura em `elevada` pulsando (desligado com `prefers-reduced-motion`). **Sem `loading.tsx` novo.** O esqueleto raiz atual não pode ter `<h1>`. Ação de formulário: "Salvando…" com botão desabilitado. Cálculo de preço: valor anterior esmaecido + "Calculando…" com `aria-live="polite"`; **nunca mostrar valor parcial como final** (REGRAS §15).

### 14.2 Vazios
Fórmula: o que está vazio + por quê + a ação (um verbo), sem ilustração; ação como botão primário dentro do vazio onde houver "Novo …". Textos existentes mantidos.

### 14.3 Erros
Campo: borda `perigo` + mensagem. Formulário: como hoje (a recuperação com valores preservados **não** entra, §19). Página: `error.tsx` mantido (código `digest`, sem `error.message`). 404 mantido. WhatsApp offline: aviso não bloqueante.

---

## 15. Responsividade

Larguras de teste obrigatórias: **360, 390, 768 e 1280 px**. Breakpoints: o do Tailwind já usado mais o token `rail` (900 px).

| Padrão | Celular | Desktop |
|---|---|---|
| Navegação | Topo + abas | Menu lateral |
| Home | Coluna única: herói → pendências → lista → atalhos | Herói (1,6fr) e pendências (1fr) lado a lado, depois lista e atalhos |
| Lista de eventos | Tile + nome na primeira linha; chips na segunda | Uma linha com chips à direita |
| Formulário | Uma coluna; grades de 2 e 4 viram 1 e 2 colunas; barra de salvar com botões de largura total | Índice lateral de 200 px + painéis; grades de 2 e 4 colunas |
| Modal | Folha inferior | Centralizado |
| Tabela | Cartões; sem rolagem horizontal da página | Tabela |

### Calendário
Mantém a decisão anterior: no celular a visão "Em sequência" como padrão e mês enxuto **[confirmar com teste real]**; na grade, cores de empresa pelos tokens `emp-*`, sempre com legenda.

### Ficha Técnica e impressão
Tela: folha branca `#fff`, texto preto, **intacta**. Impressão: **sem alteração**; shell oculto (§12.2). Qualquer mudança só com teste de PDF real (1 e N preparos).

---

## 16. Tokens para `@theme` (resumo)

```
Cores:    fundo, superficie, elevada, menu, borda, borda-forte, borda-controle,
          texto, texto-suave, brasa, brasa-hover, sobre-brasa, link, foco,
          perigo, sobre-perigo, aviso, sucesso, info,
          emp-churrasco, emp-cerimonial, emp-chacara            [alvo]
          ink, ink-soft, paper, paper-dim, paper-ink, ember, brass, sage, acao…  [existem; saem na Etapa 6]
Fontes:   --font-titulo, --font-texto                           [alvo]
          --font-display, --font-sans                           [existem; só Ficha]
Raio:     raio-chip 8, raio-controle 12, raio-tile 14, raio-linha 16, raio-cartao 20, raio-modal 28
Z:        conteudo 0, barra-acoes 20, shell 30, overlay 50, popover 60, toast 70, skip 100
Movimento: --motion-micro 120ms, --motion-comp 200ms, --motion-overlay 260ms, --motion-ease
Breakpoint: rail 900px
```

---

## 17. Componentes a construir (ordem) e etapa

| # | Componente | Etapa |
|---|---|---|
| 1 | Tokens e fontes | 1 e 2 |
| 2 | `Botao`, `BotaoEnviar`, `Campo`, `Alerta`, `Painel`, `Vazio` (mesma API) | 2 |
| 3 | `Modal` e `ModalConfirmacao` (aparência; mesma API) | 2 |
| 4 | Shell: menu lateral, topo, abas, skip link | 3 |
| 5 | Herói, linha de evento, atalho, `ChipEmpresa`, `ChipStatus` | 4 e 5 |
| 6 | Home recomposta; formulário de orçamento (painéis, índice, barra de salvar) | 4 |
| 7 | Listas, tabelas, modais de seleção, demais telas | 5 |
| 8 | Command (busca) nos seletores de insumo e de itens de cardápio | 5, **só se o Pedro aprovar a busca** (é comportamento novo, §19) |

---

## 18. Pontos que dependem do Pedro ou de teste real

1. Tema escuro **ao sol** (chácara de dia): não testado em campo.
2. Proporção celular/desktop do uso real.
3. Cores de status do evento (mapeamento é proposta).
4. Brasa como ação e como cor do Senhor Churrasco (E8) e aviso × Cerimonial (E9).
5. Teclado virtual e barra de abas (E7) em aparelho; zoom do iOS em campo de 16 px.
6. Calendário mobile como lista por padrão.
7. Contraste de alerta a 10 % (texto sobre o fundo misturado) a conferir na Etapa 2.
8. Compatibilidade do shadcn/ui com Next 16 (teste em branch descartável).
9. Impressão real da Ficha (PDF com 1 e N preparos, antes e depois).

## 19. PRECISA DE LÓGICA, NÃO IMPLEMENTAR (fica de fora do redesign)

Paginação e ordenação de tabela; filtro por empresa ou status na Agenda; atividade recente; cartões de resumo com totais (query nova); mensagem de "sucesso" após salvar, toast ou aviso após redirecionamento; recuperação de erro nos formulários principais (manter valores digitados, foco no primeiro erro); busca nos seletores de preparos e de insumos (inclusive Command), **a menos que o Pedro aprove em decisão separada**; índice do formulário com item ativo por rolagem; total ao vivo na barra de salvar; agrupar a lista por semana ou mês; valor do evento na Home; avatar do usuário com inicial (E2); qualquer query ou Server Action nova.

## 20. Restrições que este design **respeita**

- Regra de **preço congelado** (Passo 2 → 3), cardápio fixo após orçamento, itens excluídos sempre visíveis, fail-hard (REGRAS §2, §10, §15).
- **Exclusão de evento** continua hard delete sem restrição nova (REGRAS §6).
- Textos de regra (ex.: "Ordens de Ação enviadas… não atualizam mensagens já enviadas") permanecem.
- Opções das decisões operacionais e valores legados (`OPCOES_POR_CAMPO`) não mudam.
- **Ficha Técnica e `@media print` idênticas.**
- `name=`, ordem e tipo dos campos dos formulários não mudam.
- Smoke test do deploy: 307 ou 200 com `NEXT_REDIRECT` e sem `<h1>`; sem `loading.tsx` novo; `/login` sem shell.
- Actions, `lib/` de regra, `api/`, `db/` e deploy não são tocados.
