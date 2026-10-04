# Auditoria de UX / Frontend — Anjos Eventos

Data: 2026-10-03 · Branch: `snapshot-2026-09-22` · Escopo: somente leitura (nenhum arquivo de código alterado).

## Como esta auditoria foi feita (e seus limites)

- **Lido por inteiro:** `globals.css`, `layout.tsx`, `loading/error/not-found`, `login`, todas as 20 páginas em `src/app/**/page.tsx`, e os 24 componentes de `src/components/` (inclusive os de 400–800 linhas). Também as actions `evento`, `orcamento`, `usuario`, parte de `preparo`, `formatacao.ts`, `usuario-atual.ts`, `precificacao-constantes.ts` e as seções relevantes de `docs/REGRAS_NEGOCIO.md`.
- **Contraste:** calculado (fórmula WCAG) a partir dos tokens de `globals.css`; não medido no navegador.
- **Não feito:** não abri o app no navegador, não rodei lint/testes/build, não testei leitor de tela nem viewport real. Itens que dependem disso estão marcados **[verificar]**. Tudo sem marca foi confirmado lendo o código.
- Não li `src/lib/*` além do necessário (motor de custo/dimensionamento fica fora do escopo de UX).

---

## 0. Mapa do frontend

**Stack:** Next.js 16 (App Router, Server Components + Server Actions), React 19, Tailwind 4 (tokens em `@theme`), fontes Fraunces (display, itálico) + Archivo (corpo). Sem biblioteca de UI/ícones/formulários. 4 dependências de runtime além do Next/React.

**Rotas (todas exigem cookie `usuario_atual`, senão `redirect("/login")`):**

| Rota | Função | Componentes principais |
|---|---|---|
| `/login` | Escolha de usuário (cartões inclinados) | — |
| `/` | Boas-vindas, eventos dos próximos 15 dias com ⚠️, 2 atalhos | `BotaoResolverPendencias` |
| `/agenda` | Calendário mensal ou lista "Em sequência" | `CalendarioEventos`, `ListaEventos` |
| `/agenda/novo` | Escolha da empresa → formulário de **Orçamento** | `FormularioOrcamentoChurrasco/Generico` |
| `/orcamentos/[id]` | Passo 3: "Aprovar e Confirmar Evento" | `FormularioConfirmarEvento` |
| `/agenda/[id]` | Edição do evento + Decisões operacionais | `FormularioEventoChurrasco/Generico`, `FormularioDecisoesOperacionais`, `BotaoExcluirEvento` |
| `/agenda/[id]/fichas-tecnicas` | Documento imprimível (fundo branco) | `BotaoImprimir` |
| `/senhor-churrasco` | Hub (Ferramentas/Cadastros) | — |
| `/simulador-cardapio` | Simulador de preço | `SimuladorCardapio` |
| `/cardapios-modelo`, `/novo`, `/[id]` | CRUD de cardápios pré-montados | `ListaCardapiosModelo`, `FormularioCardapioModelo` |
| `/preparos`, `/novo`, `/[id]` | CRUD de fichas técnicas | `ListaPreparos`, `FormularioPreparo`, `ComposicaoPreparo`, `EditorPassosPreparo` |
| `/insumos`, `/[id]` | Lista/edição (sem "novo": insumo nasce na composição) | `ListaInsumos`, `FormularioInsumo` |
| `/colaboradores`, `/novo`, `/[id]` | CRUD de equipe | `FormularioColaborador` |

**Fluxo principal do usuário:** Login → Home → Agenda → Novo evento → *Orçamento (Passo 2, define o preço)* → *Aprovar e Confirmar (Passo 3, só logística)* → Evento → Decisões operacionais/pendências → Exportar Fichas Técnicas.

**Design tokens existentes:** cores `ink`, `ink-soft`, `ember`, `brass`, `paper`, `paper-dim`, `paper-ink`, `sage`; fontes `display`/`sans`; tokens de movimento (`--motion-*`) bem definidos e respeitando `prefers-reduced-motion`; raio único `rounded-[2px]`. **Não há** tokens de espaçamento, sombra, tipografia (escala), z-index nem cor semântica (erro/sucesso/aviso).

**Estados:** `loading.tsx` e `error.tsx` só na raiz; vazios existem em todas as listas; erro de formulário inline só em 5 formulários (ver 1.3).

---

## Partes ligadas a regras de negócio críticas

Alterar estes arquivos exige ler a regra antes (CLAUDE.md: não alterar regra silenciosamente).

| Área do frontend | Regra / decisão | Por que é sensível |
|---|---|---|
| `formulario-orcamento-churrasco.tsx`, `formulario-confirmar-evento.tsx`, `orcamentos/[id]/page.tsx` | REGRAS §2/§3: **preço é decidido só no Passo 2 e congelado**; Passo 3 não recalcula. Margem usa `preco_pessoa` congelado | Qualquer "simplificação" de UX que permita editar preço no Passo 3 quebra a regra |
| `formulario-evento-churrasco.tsx` | Cardápio de evento vindo de Orçamento é **somente leitura**; Valor Sugerido vem do servidor (DECISOES 2026-09-08) | Cardápio confirmado = snapshot histórico (REGRAS §5) |
| `simulador-cardapio.tsx`, blocos "itens excluídos" nos 3 formulários | REGRAS §10/§15: itens sem peso são **excluídos com aviso visível**; timeout = **fail-hard** com `mensagem` amigável | O aviso não pode sumir nem ficar discreto; nunca mostrar total parcial como se fosse completo |
| `botao-excluir-evento.tsx` | REGRAS §6: hard delete incondicional é **intencional**; "não implementar restrição/confirmação adicional sem nova decisão" | Melhorar o *visual* da confirmação é OK; mudar a *regra* não |
| `formulario-decisoes-operacionais.tsx`, `botao-resolver-pendencias.tsx`, `pendencias-evento.ts`, Home ⚠️ | Pendências (equipe mínima, 4 campos logísticos), Ordens de Ação por WhatsApp (mudança depois do envio não reenvia) | Texto do aviso "não atualizam mensagens já enviadas" é regra de comunicação |
| `indicador-whatsapp.tsx` | Worker WhatsApp é um serviço à parte; falha dele não pode derrubar o app | Já trata `worker_offline`; manter |
| `formulario-preparo.tsx` | REGRAS §9: peso médio (g) **obrigatório** quando unidade = "Unidade"; porção máxima sempre em g/ml | Validação duplicada no cliente (`required` condicional) e na action |
| `precificacao-constantes.ts` importado no cliente | Constantes (garçom 230, taxa 250, 1/30 garçom…) usadas no placeholder/preview | Duplicação de fórmula cliente×servidor (ver 7.3) |
| `fichas-tecnicas/page.tsx` + bloco `@media print` em `globals.css` | Ficha imprimida em produção: "+10% buffer", quebra de página, fundo branco (histórico em PENDENCIAS_NOTURNAS) | Frágil: comentários documentam 2 bugs de impressão já achados em produção |
| `usuario-atual.ts` / `/login` | Sem senha; cookie de sessão; "de preferência não selecione outro usuário" | Não é autenticação real; qualquer redesign deve manter o fluxo simples |

---

## 1. Problemas críticos de UX

### 1.1 Orçamentos ficam órfãos
Nenhum `.tsx` linka para `/orcamentos/[id]` (confirmado por busca); só a action redireciona para lá. `/agenda` lista **eventos**, não orçamentos. Se o usuário gerar o orçamento e fechar a aba antes de confirmar, o orçamento em "Simulação" só é alcançável digitando a URL. Para o fluxo central do negócio (orçar → confirmar) isso é a maior lacuna.

### 1.2 Erros de validação nos formulários principais derrubam a página inteira
`criarOrcamentoAction`, `aprovarConfirmarEventoAction`, `atualizarEventoAction` fazem `throw new Error(...)` (ex.: "Informe ao menos 1 convidado.", "Preencha a data do evento.", ou o `resultado.erro` da conversão). Esses forms não usam `useActionState`; o erro cai em `error.tsx` ("Algo deu errado… avise o responsável") e **o usuário perde tudo que digitou** num formulário de ~25 campos. É o pior ponto: acontece nos 3 formulários mais longos e mais importantes. O próprio `error.tsx` esconde a mensagem (decisão consciente), então o usuário nem sabe o que corrigir.

### 1.3 Preservação de valores só em 3 dos 9 formulários
Existe `valores` de retorno apenas em colaborador, insumo e decisões operacionais. Em **preparo** e **cardápio modelo** a action devolve `{ erro }` sem `valores`; como os campos são `defaultValue` (não controlados) e o React 19 reseta formulários após a action, os campos tendem a voltar ao valor inicial **[verificar no navegador]**. Em preparo isso inclui nome, rendimento, modo de preparo (texto longo).

### 1.4 Sem proteção contra duplo envio nas ações mais caras
`FormularioOrcamentoChurrasco/Generico`, `FormularioConfirmarEvento`, `FormularioEventoChurrasco/Generico` não têm estado `pendente`/`disabled` no botão (usam `action={fn}` simples). Duplo clique em **"Aprovar e Confirmar Evento"** pode disparar a conversão duas vezes (a regra no servidor pode ou não proteger — **[verificar]**). Os 6 formulários com `useActionState` já fazem certo ("Salvando…"); falta uniformizar.

### 1.5 "Aprovar e Confirmar Evento" sem resumo/confirmação
É a Ação de Conversão (irreversível na prática, grava snapshot e dispara automações). O botão é igual aos outros e está no fim de um formulário longo; a conferência de valores está no meio da página e é só texto. Não há "revisar antes de confirmar".

### 1.6 Confirmações e erros com diálogos nativos do navegador
`BotaoExcluirEvento` usa `window.confirm` e `window.alert`, enquanto exclusão de preparo/cardápio usa o `Modal` do app. Inconsistente, não estilizável, bloqueia a thread, e some em alguns navegadores móveis/PWA.
(⚠️ não alterar a *regra* de exclusão — REGRAS §6.)

### 1.7 Data inválida na URL quebra o calendário
`/agenda?mes=abc` → `new Date(NaN)` → `Intl.DateTimeFormat.format` lança `RangeError` → página de erro genérica. Não há validação de `mes`.

### 1.8 Fuso horário não definido no app
Datas são formatadas com `Intl` e `getDate()` **no servidor** (Server Components) e `paraInputDatetimeLocal` usa `getTimezoneOffset()` — em componente `"use client"` renderizado também no SSR. Não há `TZ`/`timeZone` configurado em nenhum lugar do app (só no worker de WhatsApp e scripts). Se o processo Node na Oracle roda em UTC, horários exibidos, o dia em que o evento cai no calendário e o valor inicial do `datetime-local` podem divergir do que o usuário vê/espera, e pode haver **hydration mismatch**. **[verificar TZ do PM2 e comparar um evento à noite]**.

### 1.9 Agenda "Em sequência" mostra tudo, do mais antigo
`listarEventos()` sem filtro nem limite, `ORDER BY data_evento ASC`: o usuário abre "o que vem a seguir" e vê primeiro o histórico inteiro. Escala mal conforme o histórico cresce.

### 1.10 Feedback de sucesso inexistente
Salvar colaborador/insumo/preparo/evento apenas redireciona. Só "Decisões salvas." mostra confirmação. O usuário não sabe se salvou.

---

## 2. Problemas de consistência visual

1. **Três "botões primários" copiados** com pequenas diferenças: `px-4 py-2` (colaboradores), `px-5 py-2.5` (agenda, preparos), `px-6 py-2.5` (submit de form), `px-5 py-2` (modal). Alguns têm `focus-visible`, outros não (botão "Novo colaborador", submits de colaborador/insumo/decisões, "Fechar" do modal de pendências, "Excluir" nos modais).
2. **Estilo de cancelar/fechar** varia: sublinhado cinza (modais de exclusão), botão com borda (`BotaoResolverPendencias`, `IndicadorWhatsapp`), "Fechar" no cabeçalho do modal (seletores).
3. **Dois modais fora do padrão:** `IndicadorWhatsapp` reimplementa seu próprio overlay (sem `Modal`: sem Esc, sem trap de foco, sem retorno de foco, sem animação, `bg-paper` em vez de `bg-ink`); `SeletorCardapio` ainda registra um listener de Esc próprio que duplica o do `Modal`.
4. **Fundo do modal:** `bg-ink` (maioria) vs `bg-ink-soft` (pendências) vs `bg-paper` (WhatsApp).
5. **Títulos de modal:** `<h4>` (seletores, exclusões) vs `<h2>` (pendências, WhatsApp); `aria-labelledby` vs `aria-label` misturados.
6. **Cores de erro/alerta sem token:** `text-ember` serve de erro, de ação destrutiva *e* de CTA; `red-300/500/950`, `red-200/600/700/900` aparecem soltos (excluir evento, painel de debug). Sucesso = `text-sage`. Não há conceito "perigo" vs "aviso".
7. **Emojis como ícones:** ⚠️ (home) e 🟢🟡🔴 (WhatsApp); setas de texto "←", "↑↓", "×". Sem conjunto de ícones.
8. **Cartões/painéis:** `bg-paper` (listas), `bg-ink-soft/60` (formulários), `bg-ink-soft` (blocos internos), `bg-paper-ink/5` (cabeçalho de grupo): sombra `shadow-[0_20px_40px_-20px…]` e `…-24px…` com valores levemente diferentes repetidos como string literal em ~15 lugares.
9. **Largura de página:** `max-w-2xl` na maioria, `max-w-4xl` em Cardápios Feitos e Hub; `max-w-3xl` na Ficha.
10. **Rótulos de ação:** "Novo evento" (cria *orçamento*, e a página se chama "Novo orçamento"), "Novo Preparo" vs "Novo colaborador", "Cadastrar" vs "Cadastrar preparo" vs "Gerar Orçamento", capitalização irregular ("Nome Do Preparo", "Modo de Preparo").
11. **Links de voltar:** "← Início" em páginas de `/senhor-churrasco/*` (Preparos, Cardápios, Simulador) mas "← Senhor Churrasco" só em Insumos — o hub fica pulado.
12. **Visões da Agenda** (Agenda / Em sequência) são links estilizados como abas, sem `role=tab` nem `aria-current`.
13. **Termos:** "Assador" (UI) vs `qtd_churrasqueiros` (id/nome interno), "Copo/taça" vs "Tipo de bebida recipiente".
14. **Ficha Técnica** usa `<a href>` em vez de `Link` (recarrega a página) e cores `black/white` hardcoded fora da paleta (aceitável pela impressão, mas a tela mostra o cabeçalho escuro do app em cima da folha branca).
15. Mensagens de rodapé técnico visíveis ao usuário final: "Passo 2 da Máquina de Estados…", "docs/DECISOES.md" (formulário de preparo), "NocoDB" em comentários — vocabulário de desenvolvedor na tela.

---

## 3. Problemas de acessibilidade

**Contraste (calculado; AA texto normal = 4,5:1):**

| Par | Razão | Onde |
|---|---|---|
| `text-ember` sobre `ink` | **3,86** | links "Resolver pendências", erros, alertas |
| `text-ember` sobre `ink-soft` | **3,46** | mensagens de erro nos formulários |
| `text-ember` sobre `paper` | **3,99** | "Excluir" nas listas, erro do Cardápio Modelo |
| `text-paper` sobre `bg-ember` (CTA principal) | **3,99** | todos os botões primários |
| `text-sage` sobre `ink-soft` | **3,46** | "Decisões salvas." |
| `text-paper-ink/50` sobre `paper` | **3,07** | botão "×" remover item |
| `text-paper-ink/60` sobre `paper` | 4,08 | metadados em listas, "+N mais" |
| placeholder `paper-ink/40` sobre `paper` | **2,37** | campo de busca |
| placeholder `paper-dim/50` sobre `ink-soft` | 4,09 | campos de formulário |
| badge `ember` sobre `ember/15` | **3,32** | "R$/pessoa" nos cardápios |
| `paper-dim` / `paper` sobre `ink` | 13,4 / ok | corpo (bom) |

O CTA principal e todo o vocabulário de erro/ação ficam abaixo de AA. A causa é um token só (`ember`); uma versão mais clara para texto sobre fundo escuro e mais escura para botão resolve a maioria.

**Outros pontos:**
1. **Modal**: bom (portal, trap, Esc, retorno de foco, `aria-modal`). Mas clique no overlay fecha — em modais com formulário (`ModalNovoInsumo`) perde dados digitados; `IndicadorWhatsapp` não tem nada disso.
2. **Rótulos sem associação:** em `ComposicaoPreparo`, `EditorPassosPreparo` e `ModalNovoInsumo` os `<label>` não têm `htmlFor`/`id` (compensado com `aria-label` no input, mas o rótulo visível não clica no campo e há duplicação).
3. **Botões só com símbolo:** `↑` / `↓` do editor de passos sem `aria-label`; `×` tem label (ok).
4. **Alvos de toque:** links "Editar/Excluir" ~36 px de altura, "×" ~12 px, navegação principal `text-sm` sem padding, checkboxes nativos 13 px (o `<label>` ajuda). Abaixo de 44 px recomendado (WCAG 2.2 AA exige ≥ 24 px — "×" e checkboxes soltos podem falhar) **[medir]**.
5. **Informação só por cor/emoji:** bolinhas das empresas no calendário/lista (cor + nome só em tooltip no calendário), semáforo 🟢🟡🔴 do WhatsApp (tem `aria-label`, mas o estado é só ícone), ⚠️ com detalhe só em `title` (não acessível por toque nem teclado).
6. **Foco:** `focus:outline-none` + só troca de cor de borda nos campos (borda `brass` sobre `ink-soft`: contraste de ~4,5? **[verificar ≥ 3:1]**); vários links/botões sem `focus-visible` explícito.
7. **Calendário** é uma grade de `div`s sem semântica de tabela/grid, dias sem nome acessível ("15" solto), "+N mais" não é link nem botão.
8. **Mensagens dinâmicas** (calculando, erro de precificação, "itens não entraram", "Decisões salvas") sem `role="status"`/`aria-live`; só `loading.tsx` e `error.tsx` anunciam.
9. **Sem *skip link*** e o `<header>` não envolve landmark principal consistente; cada página tem `<main>`, mas o `main` da Home/Login usa `venue-glow` com ordem de leitura OK.
10. `lang="pt-BR"` correto. `<title>` é fixo "Anjos Eventos" em todas as páginas (sem `generateMetadata`) → todas as abas/historico iguais.
11. `<input disabled readOnly>` para valores calculados (Valor Total, Assadores): leitores de tela os tratam como campos desabilitados; melhor `<output>` ou texto.
12. Ficha Técnica: tabela semântica boa; lista de passos usa `<ol>` + número visual duplicado (leitor lê "1 1 …").
13. `prefers-reduced-motion` respeitado (ponto forte); modal respeita também no JS.

---

## 4. Problemas de responsividade

Nenhum teste em viewport real foi feito **[verificar todos em 360–390 px]**. Pelo código:

1. **Calendário mensal**: `grid-cols-7` fixo, `min-h-24`, nomes `truncate` em células de ~50 px num celular de 375 px: nomes de clientes praticamente ilegíveis; sem alternativa móvel (a visão "Em sequência" existe, mas não é sugerida).
2. **Navegação principal**: um único link ("Colaboradores") + semáforo. Não há menu; sem acesso global à Agenda/Senhor Churrasco (precisa voltar à Home). Em mobile a barra funciona só porque tem quase nada.
3. **Formulários longos** (`FormularioEventoChurrasco` ~800 linhas, ~25 campos): grids `grid-cols-2 sm:grid-cols-4` (horas e convidados) deixam labels longos ("Limpeza/encerramento", "Crianças de 5 a 10 anos") quebrando em 2–3 linhas; botão de salvar só no final, sem *sticky*.
4. **Tabela de "Ver cálculos"**: `min-w-[1100px]` dentro de `overflow-x-auto` — funciona, mas sem indicação de rolagem.
5. **Modal de pendências / seletores**: `max-h-[calc(100dvh-2rem)]` com scroll (bom); lista de itens do seletor não tem busca (preparos podem ser dezenas por categoria).
6. **Cartões da Home**: `hover:-translate-y-1` não tem equivalente em toque; o detalhe das pendências está no `title` (inacessível por toque).
7. **Filtros de listas**: já corrigido para quebrar linha (observação 929 do histórico). Em `ListaPreparos` há 4 controles empilhados ocupando a tela antes da primeira linha.
8. **Login**: cartões rotacionados com `transform` inline; funciona, mas com `hover:rotate-0` + `focus-visible` — sem alternativa para `prefers-reduced-motion` (o transform é estático, ok).
9. **Ficha Técnica**: layout de impressão cuidadoso (`break-after-page`, `print:`); tela mobile = largura `max-w-3xl` com grid `grid-cols-2` ok.
10. Sem `viewport`/`themeColor`/PWA manifest definidos; `public/` só tem os SVG padrão do create-next-app (não usados). (CLAUDE.md cita escopo PWA, mas não existe `manifest.json` no repositório.)

---

## 5. Oportunidades de melhoria (por impacto)

**Alto impacto / baixo risco**
1. Link e lista de **orçamentos em aberto** (na Home e/ou Agenda) — resolve 1.1.
2. Converter os 3 forms de ação por `throw` para `useActionState` com `{erro, valores}` — resolve 1.2 e 1.3 e permite mensagens específicas.
3. Estado `pendente` + `disabled` em todos os botões de envio (hook/`<BotaoEnviar>` com `useFormStatus`).
4. Ajustar token `ember` (texto vs. fundo) para atingir AA.
5. Trocar `window.confirm/alert` por `Modal` e `IndicadorWhatsapp` por `Modal` (mesmo componente que já existe).
6. Validar `?mes=` e corrigir "Em sequência" para começar em "hoje" (com opção "ver passados").
7. `generateMetadata`/`title` por página (a aba mostra sempre "Anjos Eventos").
8. Definir fuso (`TZ=America/Sao_Paulo` no PM2/Dockerfile e/ou `timeZone` explícito nos `Intl`).

**Médio**
9. Navegação global com Agenda, Senhor Churrasco, Colaboradores e usuário atual/"Trocar usuário" (hoje só na Home).
10. Resumo final antes de "Aprovar e Confirmar Evento" + botão fixo no rodapé do formulário.
11. Feedback de sucesso (toast ou faixa) após salvar.
12. Busca dentro do seletor de itens de cardápio.
13. Link "Resolver" mostrando o detalhe das pendências sem depender de `title`.
14. Calendário móvel: lista por dia ou células com contador e toque para expandir.
15. Cor semântica: `danger`, `warning`, `success` como tokens.

**Baixo / futuro**
16. Conjunto de ícones SVG (substituir emojis); skeleton em vez de "Carregando…"; `loading.tsx` por rota longa; esconder vocabulário técnico ("Máquina de Estados", "docs/DECISOES.md").

---

## 6. Componentes que deveriam ser padronizados

| Componente a criar/consolidar | Substitui hoje |
|---|---|
| `Botao` (variantes: primário, secundário, perigoso, link; estado `pendente`; foco padrão) | ~25 strings de classe copiadas; "Novo X" nas páginas, submits, "Fechar", "Excluir" |
| `BotaoEnviar` (`useFormStatus`) | 6 variantes de `{pendente ? "Salvando…" : rotulo}` + 5 forms sem estado |
| `Campo` (label+input+erro+ajuda, `id` automático via `useId`) | ~120 blocos `div > label > input` repetidos; resolve rótulos sem `htmlFor` |
| `Secao` / `CardPainel` (tema escuro/claro) | `bg-ink-soft/60 p-6 shadow…` repetido em 11 páginas; `bg-paper … shadow` em 5 |
| `ModalConfirmacao` (título, texto, confirmar/cancelar) | 3 implementações (preparo, cardápio, evento) + `window.confirm` |
| `Alerta` (erro / aviso / sucesso com `role`) | `<p className="text-sm text-ember">` e os blocos "itens não entraram" ×3 |
| `LinhaLista` / `AcoesLinha` (Editar/Excluir) | `LinhaPreparo`, `LinhaInsumo`, `CardCardapioModelo`, `colaboradores/page` |
| `BarraFiltros` (busca + selects) | `campoFiltroClasse` duplicado em 2 listas + 1 filtro diferente em cardápios |
| `SeletorItens` | `SeletorPreparos` e `SeletorCardapio` (≈ 90 % iguais; um grava ids, outro grava nomes) |
| `CardAtalho` (link com faixa colorida) | 4 cópias na Home, Hub, Novo evento |
| `Badge` / `StatusEmpresa` (cor + texto) | bolinhas só-cor |
| `BlocoPrecificacao` (aviso de itens excluídos + erro + calculando) | repetido em Simulador, Orçamento, Evento (≈ 60 linhas ×3) |
| `Cabecalho de formulário de fluxo` (aviso/ajuda técnica) | textos de ajuda ad hoc |

---

## 7. Possíveis melhorias de arquitetura de frontend

1. **Hook `usePrecificacao`** (debounce + chamada + erro + itens excluídos): a lógica de `setTimeout(600)` + `calcularPrecificacao*Action` + `itensExcluidos` está copiada em 3 componentes (~120 linhas cada), com lista de dependências manual (risco de *stale* e de efeitos extras). Também `aplicarTemplate`/`cardapioBase`/`chaveSeletorCardapio` repetido 3×.
2. **Separar `FormularioEventoChurrasco` (809 linhas)** em seções (Cliente, Datas, Convidados, Valores…) — facilita testes e reuso entre Orçamento e Evento (os campos de cliente/convidados são idênticos).
3. **Duplicação cliente×servidor do total:** `FormularioOrcamentoChurrasco` calcula `valorTotalPreview` localmente (preço×adultos + meia×crianças + garçom + taxa), enquanto o formulário de evento diz que o total vem *sempre* do servidor "pra não duplicar a lógica" (DECISOES, 2026-09-08). Os dois comentários se contradizem; a fórmula pode divergir sem ninguém notar. Sugestão: uma só função pura em `precificacao-constantes.ts` (já importável no cliente) ou usar o retorno do servidor.
4. **Estado do formulário via `useActionState` em todos** + schema de validação único (o projeto já tem `zod`) compartilhado entre action e cliente.
5. **Seleção por nome vs. por id:** `SeletorCardapio` guarda **nomes** (`", "`-joined) e depois resolve id por `find(p => p.nome === nome)`; dois preparos com o mesmo nome (ou nome editado) quebram a seleção. Preferir ids como em `SeletorPreparos`. (Parte vem do modelo legado de texto livre do evento — documentar antes de mexer.)
6. **Tema/tokens:** mover sombras, larguras de página e cores semânticas para `@theme`; criar `<PaginaShell>` (`main.venue-glow` + container `max-w` + `CabecalhoPagina`) — hoje cada página repete `redirect("/login")` + `<main>` + `<div max-w>`.
7. **Auth no layout/middleware:** as ~20 páginas repetem `obterUsuarioAtual() → redirect("/login")`. Um ponto único (layout de grupo `(app)` ou `proxy`/middleware conforme a versão do Next instalada — consultar `node_modules/next/dist/docs/` conforme AGENTS.md) reduziria repetição e o risco de esquecer em página nova. A decisão de autenticação está em DECISOES; não mudar a semântica.
8. **`loading.tsx`/`error.tsx`** por segmento (formulários pesados, agenda) e `loading` com skeleton; ver observação do histórico: `loading.tsx` raiz cria Suspense e faz o smoke test aceitar 200 com NEXT_REDIRECT.
9. **Testes de UI:** só há testes de lib; nenhum de componente/acessibilidade. Antes de padronizar, vale um teste de renderização (Vitest + testing-library) nos formulários críticos.
10. **`indicador-whatsapp`**: polling a cada 15 s por aba — considerar pausar fora de foco (já pausa) e consolidar com o `Modal`.
11. **Remover** `public/*.svg` do template e componentes mortos (`formulario-evento.tsx` é só 3 constantes de classe — nome enganoso: virar `estilos-formulario.ts`).

---

## 8. Arquivos que seriam alterados posteriormente

Agrupado por fase sugerida (nenhum foi tocado agora).

**Fase A — fundação (tokens e componentes base)**
`src/app/globals.css`, `src/components/formulario-evento.tsx` (→ estilos), novos: `src/components/ui/{botao,botao-enviar,campo,alerta,painel,badge,modal-confirmacao}.tsx`, `src/components/modal.tsx`.

**Fase B — correção de erros/acessibilidade transversal**
`src/app/error.tsx`, `src/components/indicador-whatsapp.tsx`, `botao-excluir-evento.tsx`, `botao-resolver-pendencias.tsx`, `composicao-preparo.tsx`, `editor-passos-preparo.tsx`, `seletor-cardapio.tsx`, `seletor-preparos.tsx`, `calendario-eventos.tsx`, `navegacao-principal.tsx`, `src/app/layout.tsx`, `src/app/agenda/page.tsx` (validação de `mes`).

**Fase C — formulários do fluxo principal (maior valor, maior risco)**
`formulario-orcamento-churrasco.tsx`, `formulario-orcamento-generico.tsx`, `formulario-confirmar-evento.tsx`, `formulario-evento-churrasco.tsx`, `formulario-evento-generico.tsx`, `src/app/actions/{orcamento,evento}.ts`, `src/app/orcamentos/[id]/page.tsx`, `src/app/agenda/novo/page.tsx`, `src/app/agenda/[id]/page.tsx`; novo: lista de orçamentos em aberto (Home/Agenda), hook `usePrecificacao`.

**Fase D — cadastros**
`formulario-preparo.tsx`, `formulario-cardapio-modelo.tsx`, `formulario-colaborador.tsx`, `formulario-insumo.tsx`, `formulario-decisoes-operacionais.tsx`, `lista-*.tsx`, `src/app/actions/{preparo,cardapio-modelo}.ts` e as páginas de `colaboradores/`, `insumos/`, `preparos/`, `cardapios-modelo/`.

**Fase E — telas de entrada**
`src/app/page.tsx`, `src/app/login/page.tsx`, `src/app/senhor-churrasco/page.tsx`, `cabecalho-pagina.tsx`, `simulador-cardapio.tsx`.

**Fase F — impressão**
`src/app/agenda/[id]/fichas-tecnicas/page.tsx`, `botao-imprimir.tsx`, bloco `@media print` de `globals.css` (alterar por último, com teste de impressão real).

---

## 9. Riscos de alterar cada área

| Área | Risco | Mitigação |
|---|---|---|
| **Tokens/`globals.css`** (cor `ember`, sombras) | Médio. Mudança global; a Ficha Técnica impressa depende de `print-color-adjust` e de `body{background:white}` no print | Mudar só o texto/botão, conferir print da Ficha antes e depois |
| **`Modal` / animações** | Médio. Já houve bug recente (modal preso por `transform` residual; `fill-mode: backwards`, ver comentários). Mexer em animação pode recriar o bug | Manter portal + `fill-mode: backwards`; testar abrir/fechar em lista animada |
| **Orçamento churrasco / Confirmar / Evento** | **Alto.** Regra de preço congelado; um refactor que recalcule preço no Passo 3 ou envie campo errado grava valores de contrato errados (margem, receita) | Alterar só estado/erro/pendente; não tocar nos `name=` dos inputs nem na ordem dos campos; rodar os testes de `orcamentos`/`margem`; comparar payload do `FormData` antes/depois |
| **`usePrecificacao` (extração)** | Alto. Debounce/dependências do `useEffect` são sutis; risco de loop ou de sobrescrever preço digitado (o código já comenta o loop) | Extrair sem mudar comportamento; teste com preço fixo + edição manual |
| **`SeletorCardapio` (nome→id)** | Alto. Eventos antigos gravam cardápio como texto livre por nome; mudar para id pode quebrar edição de eventos legados | Manter nomes no hidden; só adicionar id; teste com evento legado |
| **Actions que hoje fazem `throw`** | Médio. `useActionState` muda o contrato (retorna estado em vez de lançar/redirecionar); `redirect()` precisa continuar lançando | Padrão já usado em colaborador/insumo: copiar |
| **Excluir evento** | Médio (regra). REGRAS §6: sem nova restrição sem decisão | Trocar só `confirm()` por `Modal`; mesma regra e mesmo texto |
| **Decisões operacionais / pendências** | Médio. Pendências alimentam Ordens de Ação (WhatsApp) e o ⚠️ da Home; opções legadas (`valor antigo`) devem continuar | Não mudar valores das opções (`OPCOES_POR_CAMPO`), só layout |
| **Calendário** | Baixo/médio. Lógica de datas depende do fuso (1.8); mexer sem definir TZ pode deslocar eventos de dia | Definir TZ primeiro; teste com evento às 23h |
| **Fuso horário (`TZ`)** | Alto se trocado em produção: muda horários exibidos de todos os eventos já gravados | Verificar valor atual no servidor; tratar como mudança de infra, não de UI |
| **Preparo (form + composição + passos)** | Médio. Campos com `name` repetido (`composicaoId`, `composicaoInsumoId`) e `passos` serializado em JSON dependem da ordem; remover linha reindexa | Não alterar nomes; teste de adicionar/remover/ordenar |
| **Navegação global** | Baixo. `smoke` do deploy testa rotas e respostas; links novos não afetam | Apenas adicionar |
| **Ficha Técnica (impressão)** | **Alto.** Dois bugs de impressão já aconteceram em produção (página em branco, fundo preto) | Mexer por último; imprimir PDF de evento real com 1 e N preparos |
| **Login/usuário** | Baixo, mas é "autenticação" implícita; texto "De preferência não selecione outro usuário" é decisão do negócio | Não adicionar senha/fluxos sem decisão |
| **Home (⚠️/pendências)** | Baixo. Consulta por evento; mudar o layout não afeta a regra | Manter `BotaoResolverPendencias` e `ativosPorFuncao` |
| **Deploy** | Qualquer mudança vai a produção por `deploy-oracle.sh` com smoke test; `loading.tsx` altera respostas das rotas protegidas (200 + NEXT_REDIRECT) | Sem novas `loading.tsx` sem revisar o smoke |

---

## Resumo executivo

O app tem identidade visual coerente (paleta quente, tipografia serifada, movimento bem tokenizado e acessível a `prefers-reduced-motion`) e o `Modal` é sólido. Os problemas reais são de **fluxo e robustez**, não de estética:

1. **Orçamentos órfãos** e **erros que descartam formulários longos** no coração do negócio (orçar → confirmar).
2. **Sem proteção de duplo envio** na ação de conversão.
3. **Contraste abaixo de AA** em CTA e mensagens (um único token).
4. **Fuso horário e `?mes=` inválido** como riscos latentes.
5. **Duplicação** (botões, campos, painéis, seletor, lógica de precificação ×3) que torna cada melhoria cara — padronizar antes de redesenhar.

Sugestão de ordem: A (fundação) → B (acessibilidade/erros transversais) → C (fluxo de orçamento) → D → E → F.
