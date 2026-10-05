---
name: anjos-design-system
description: Orienta qualquer trabalho de UI/UX no Anjos Eventos (telas, componentes, estilos, acessibilidade, responsividade) seguindo docs/design/DESIGN-SYSTEM.md, sem tocar em lógica de negócio, cálculos, APIs ou banco.
---

# Skill — Anjos Design System

Use esta skill em **toda** tarefa que mude aparência, layout, textos de interface, componentes visuais, acessibilidade ou responsividade.

Fontes de verdade (ler antes de começar, só o que for relevante à tarefa):

- `docs/design/DESIGN-SYSTEM.md` — tokens, componentes, estados, regras visuais. **Segue-se, não se reinterpreta.**
- `docs/design/UX-AUDIT.md` — problemas conhecidos, arquivos por fase, riscos por área.
- `docs/REGRAS_NEGOCIO.md` e `docs/DECISOES.md` — quando a tela toca regra de negócio.
- `AGENTS.md` — o Next.js instalado tem mudanças de API; consultar `node_modules/next/dist/docs/` antes de usar recurso do framework.

O DESIGN-SYSTEM.md descreve o **alvo da direção Brasa** (escolhida pelo Pedro em 2026-10-04). A tabela "Estado da implementação" no início dele diz o que já está no código (Etapas 0 a 6 feitas); o que está **[alvo]** ainda não existe (hoje nada) e o que está marcado **[confirmar]** não está decidido: não trate como decidido; pergunte. O §21 lista as divergências conhecidas entre o documento e o código. O protótipo de referência está em `docs/design/prototipos/direcao-1/`; quando ele for ambíguo, escolha, registre a escolha no DESIGN-SYSTEM.md (§0) e siga. O redesign anterior ("caderno do maître": papel sobre moldura escura, Fraunces, raio de 2 px) **não vale mais**.

---

# Regra mais importante

**Mudança visual não é mudança de lógica.** Se a alteração de interface exigir tocar em lógica, separe as duas e peça confirmação antes da parte lógica (ver "Separar visual de lógica").

Não invente: tokens, siglas, cores de status, textos de regra ou comportamentos que não estejam no DESIGN-SYSTEM.md ou no código. Se faltar, procure no código e na doc; se continuar ausente, pergunte.

---

# Antes de mexer

1. Identifique a tela/componente e **leia o arquivo inteiro** (e os que o usam).
2. Procure componente existente em `src/components/` e estilos em `src/app/globals.css` e `src/components/formulario-evento.tsx` (`campoClasse`, `rotuloClasse`, `secaoTituloClasse`). **Reutilize** antes de criar.
3. Confirme em `docs/design/UX-AUDIT.md` (seção 9) o risco da área.
4. Para tarefa média/grande: apresente um plano curto (arquivos, o que muda, o que **não** muda) antes de implementar, como pede o CLAUDE.md.

---

# Princípios (como aplicar)

## 1. Seguir o DESIGN-SYSTEM.md
Use os tokens e as regras do documento (cores, tipografia, espaçamento, raio, elevação, tamanhos, estados, componentes). Não escolha valor por gosto: se o documento define, use; se não define, proponha e peça confirmação em vez de inventar.

## 2. Preservar a identidade visual (Brasa)
- Tudo escuro, em três degraus: `fundo` → `superficie` → `elevada`, separados por borda fina (DESIGN-SYSTEM.md §4, §9). Sem cartão de "papel" claro.
- Títulos em **Bricolage Grotesque** (`--font-titulo`), texto em **Instrument Sans** (`--font-texto`). Fraunces e Archivo (`--font-display`, `--font-sans`) são **só da Ficha Técnica**: não use o nome desses tokens no redesign.
- Raio por papel (8, 12, 14, 16, 20, 28 px); círculo só no ponto de empresa e na marca; **sem "pílula"** e sem `rounded-[2px]` em código novo.
- Brasa (`brasa`) = ação (preenchimento sólido ou link com texto). Cor da empresa = ponto de 8 px + nome, ou tile a 16 %; **nunca fundo de botão**. Erro, aviso, sucesso e info usam seus tokens; **nunca só cor** (sempre texto ou ícone).
- Um herói por tela: o brilho de brasa existe só no herói da Home e no sinal da marca. Sem `backdrop-filter` e sem gradiente em cartão ou lista.
- Hierarquia por claridade de superfície e borda; sombra só em modal, barra de salvar e brilho do botão primário.

## 3. Reutilizar antes de criar / evitar duplicação
- Não copie strings de classe de botão/campo/painel para um terceiro lugar. Se já existem ≥ 2 cópias, **extraia** para o componente previsto em DESIGN-SYSTEM.md §17 (em vez de copiar mais uma).
- Componentes previstos: `Botao`, `BotaoEnviar`, `Campo`, `Alerta`, `Modal`/`ModalConfirmacao`, `Painel`, `CartaoEntidade`, `CartaoAtalho`, `Badge`/`ChipEmpresa`, estados `Vazio`/`Esqueleto`. Crie o componente **uma vez** e migre os usos; não crie variantes paralelas.
- Todo diálogo usa `src/components/modal.tsx`. Não crie overlay próprio e não use `window.confirm/alert`.
- Antes de criar arquivo novo em `src/components/`, mostre que nenhum existente serve.
- Poucas dependências (CLAUDE.md). Ícones são SVG inline. **Radix só onde uma tela precisar** (Dropdown, Tooltip, Popover, Command para busca de insumo e de itens de cardápio), com justificativa de custo e risco, uma tela por vez. **O `Modal` atual fica**: não trocar o miolo por Radix. **shadcn/ui:** só depois de teste de compatibilidade com Next 16 numa branch descartável com build no `ender`, mostrado ao Pedro; componente a componente, com `add --dry-run`/`--diff`; **nunca `init` que reescreva `globals.css` sem o Pedro ver o diff**.
- Mantenha a **API atual** de `Botao`, `BotaoEnviar`, `Campo`, `Alerta`, `Painel`, `Modal`, `ModalConfirmacao`, `Vazio`: muda a aparência, não as props (os formulários não podem mudar).

## 4. Responsividade
- Projete **mobile primeiro** (360 e 390 px), depois 768 e 1280 (DESIGN-SYSTEM.md §15).
- Menu lateral a partir de 900 px (token `rail`), topo + barra de abas abaixo disso. Conteúdo: 24/16/112 px (topo/lados/base) no celular, 44/48/120 px no desktop; painel 18/24 px. A base de 112 px livra a barra de abas.
- Sem rolagem horizontal da **página** em 360 px.
- Alvo de toque ≥ 44 px (área clicável, não só o visual); campos ≥ 16 px de fonte.
- Tabela vira lista de cartões no mobile (exceto a tabela de cálculos do Simulador).
- Nenhuma informação essencial depende de `hover`.
- Verifique a mudança em largura estreita antes de declarar pronta; se não conseguiu verificar, diga.

## 5. Acessibilidade
- Todo `input/select/textarea` com `<label htmlFor>` real (ou `useId`); `aria-label` só quando não há rótulo visível.
- Erros: `aria-invalid`, `aria-describedby`, mensagem acionável; avisos dinâmicos com `role="alert"`/`role="status"`.
- Foco sempre visível: anel de 2 px com o token `foco` (DESIGN-SYSTEM.md §10.2).
- Contraste: texto ≥ 4,5:1, controles/bordas ≥ 3:1. **Não usar opacidade para texto secundário** — usar `texto-suave`. Toda cor ou mistura nova precisa de contraste calculado (a tabela do DESIGN-SYSTEM.md §4.2 lista os pares já calculados) e informado.
- `z-index` só pelos tokens `--z-*` (conteúdo < barra de salvar < menu/abas < overlay do modal < popover < toast < skip link). Modal em portal; **nenhum `transform`, `filter`, `perspective` ou `overflow` em ancestral de `position: fixed`**; use as propriedades `translate` e `scale`, não `transform`.
- Ordem de foco = ordem visual: skip link primeiro; menu lateral/topo antes do conteúdo no DOM; barra de abas depois. `aria-current="page"` no item ativo; `<nav aria-label>`.
- Botão só com símbolo exige `aria-label`. Tooltip nunca é o único lugar de uma informação.
- Respeitar `prefers-reduced-motion` (já existe em `globals.css`); sem animação nova em listas longas, em impressão ou na Ficha Técnica.
- `<input disabled>` não é forma de mostrar valor calculado; use estado somente leitura (`<output>`/texto rotulado).

## 6. Evitar estética genérica
Não introduza: `backdrop-filter`/vidro fosco, gradientes em cartões e listas, brilho fora do herói e da marca, roxo/azul "SaaS", avatares (o do usuário ficou de fora), ilustrações/mascotes, "cards de KPI" para preencher espaço, ícone em tudo, maiúsculas espaçadas como rótulo, "pílula" em tudo, emojis em texto de sistema, textos como "Oops!". Toda decisão visual precisa de uma justificativa ligada ao produto/usuário (DESIGN-SYSTEM.md §2). "Está em alta" não é justificativa.

## 6.1 Movimento
120 ms (micro), 200 ms (componente), 260 ms (overlay), curva `cubic-bezier(.2,.8,.2,1)`. Sem animação de entrada de página ou lista. `prefers-reduced-motion: reduce` desliga tudo. Nunca em `@media print` nem na Ficha Técnica.

## 6.2 Fora do escopo do redesign (lista "PRECISA DE LÓGICA")
Paginação e ordenação de tabela, filtro da Agenda, atividade recente, totais, mensagem de sucesso após salvar, recuperação de erro nos formulários, busca nos seletores (a menos que o Pedro aprove à parte), índice do formulário com item ativo, total ao vivo na barra de salvar, agrupamento por semana, valor do evento na Home, avatar, qualquer query ou Server Action nova (DESIGN-SYSTEM.md §19). Se uma melhoria visual depender de um desses, **pare e liste**; não implemente.

## 7. Textos de interface
Português do Brasil, verbo + objeto nos botões ("Gerar orçamento"), capitalização de frase, mensagens que dizem o que corrigir. Vocabulário técnico (docs, "Máquina de Estados", nomes de arquivo) não vai para a tela. **Não reescreva texto que expressa regra de negócio** sem confirmação (ex.: "Ordens de Ação enviadas… não atualizam mensagens já enviadas", avisos de itens fora do cálculo).

---

# Separar visual de lógica

Sempre que uma alteração visual tocar código de negócio:

1. **Identifique** o que é visual (classes, estrutura JSX, textos, estados de apresentação, ordem de elementos) e o que é lógica (cálculo, validação, action, query, regra, formato de dado enviado).
2. **Faça só a parte visual** — em commit/etapa separada, descrita como visual.
3. **Pare e peça confirmação** antes de qualquer mudança lógica. Descreva: o que mudaria, por que a mudança visual precisa disso, qual regra/arquivo é afetado e uma alternativa puramente visual, se existir.
4. Só implemente a parte lógica **após resposta explícita**; aprovação de uma mudança não vale para as seguintes.
5. Ao final, informe separadamente: "Alterações visuais" e "Alterações lógicas (confirmadas por você)". Se não houve lógica, diga que não houve.

Exemplos de **lógica** (exigem confirmação): trocar `throw` por retorno `{erro, valores}` numa action; mudar o que um formulário envia; criar hook que dispara cálculo; mudar ordem/forma de validação; adicionar/remover campo; trocar nome por id num seletor; alterar filtro/ordem de uma query; definir `TZ`.

Exemplos de **visual** (podem ser feitos direto): classes, tokens, espaçamento, tipografia, ícones, estrutura semântica de HTML, `aria-*`, estados de loading/vazio/erro **de apresentação**, textos que não são regra, componentes que apenas embrulham o que já existe.

---

# DESIGN SAFETY BOUNDARIES

Estas fronteiras valem para **toda** tarefa de UI. Violá-las exige pedido explícito do Pedro, naquela tarefa; permissão anterior não se estende.

## O que o trabalho visual NÃO pode alterar

| # | Fronteira | Onde fica | Regra |
|---|---|---|---|
| 1 | **Regras de negócio** | `docs/REGRAS_NEGOCIO.md`, `docs/DECISOES.md` | Conflito entre visual e regra ⇒ explicar o conflito; nunca alterar a regra em silêncio |
| 2 | **Cálculos financeiros** | `src/lib/margem-orcamento.ts`, `orcamentos.ts` (receita/margem), `custo-preparo.ts` | Nenhuma alteração. Mostrar valores como o servidor entrega |
| 3 | **Dimensionamento** | `src/lib/dimensionamento-cardapio.ts`, `hierarquia-proteina.ts`, `debug-calculo-cardapio.ts` | Nenhuma alteração |
| 4 | **Precificação** | `src/lib/precificacao-*.ts`, `pacote-fixo.ts`, constantes (garçom, taxa, markup, consumíveis) | Nenhuma alteração; não mover/duplicar fórmula para o cliente; não alterar constantes |
| 5 | **APIs e rotas** | `src/app/api/**`, `src/lib/api-auth.ts`, `cron-auth.ts`, `rate-limit.ts` | Não alterar contrato, status, autenticação nem criar rota para "facilitar" a UI |
| 6 | **Server Actions** | `src/app/actions/**` | Não alterar assinatura, validação, retorno nem efeitos. Qualquer mudança é lógica (ver acima) |
| 7 | **Banco de dados** | `src/db/**`, `drizzle/`, `database/`, `docs/BANCO.md` | Nenhuma migration, coluna, query ou script. Alteração de banco segue a skill `alterar-banco` e **para para mostrar o SQL antes de produção** |
| 8 | **Autenticação/sessão** | `usuario-atual.ts`, `login`, `actions/usuario.ts` | Manter o fluxo "quem está usando?"; sem senha/fluxo novo sem decisão. O layout raiz **não ganha consulta nova ao banco**; "Trocar usuário" reaproveita a action existente |
| 9 | **Automação WhatsApp, crons, ordens de ação** | `automacao-whatsapp.ts`, `ordem-acao.ts`, `whatsapp-worker/`, `api/cron/**` | Não alterar; só a apresentação do indicador/modal |
| 10 | **Deploy e smoke test** | `scripts/deploy-oracle.sh` e relacionados | Não alterar. `loading.tsx` novo muda respostas das rotas protegidas e o smoke aceita só 307 ou 200 com `NEXT_REDIRECT`: não criar `loading.tsx` sem revisar o smoke com o Pedro. Página protegida sem sessão: 307 ou 200 com `NEXT_REDIRECT` e **sem `<h1>`**; o shell (menu, abas, topo), o esqueleto e a marca **não usam `<h1>`**; `/login` continua **sem** o shell. **Nunca fazer deploy** sem pedido. Build válido só no `ender`, a partir de `git archive HEAD` já commitado |
| 11 | **Dados reais** | Banco de produção | Nunca apagar/alterar dados para "testar" a interface |

## O que o formulário NÃO pode perder

- `name=` dos inputs e a **ordem** e **tipo** dos dados enviados em: orçamento (Passo 2), confirmação (Passo 3), evento, preparo, composição, passos (`passos` em JSON), decisões operacionais.
- Regra de **preço congelado** (Passo 2 → 3): o Passo 3 não recalcula nem permite editar preço do churrasco.
- Cardápio do evento vindo de orçamento continua somente leitura.
- **Itens fora do cálculo** continuam sempre visíveis; **falha de cálculo** continua fail-hard (sem valor parcial exibido como final).
- Exclusão de evento continua hard delete **sem restrição nova** (REGRAS §6): só o componente visual da confirmação pode mudar.
- Opções e valores legados de `OPCOES_POR_CAMPO` (decisões operacionais) e as restrições/categorias de preparo.
- Peso médio obrigatório para unidade = "Unidade"; porção máxima em g/ml.

## Impressão

- Ficha Técnica (`agenda/[id]/fichas-tecnicas`) e o bloco `@media print` de `globals.css`: já houve dois bugs em produção (página extra em branco, fundo preto). **Não alterar.** Com o redesign, o shell mora no layout raiz e aparece na Ficha em tela; portanto: menu, topo, abas e barra de salvar com `display: none` em `@media print`, contêiner do shell em `display: block` na impressão, fundo branco; a folha da Ficha (tela e impressa) fica idêntica à de hoje.
- A Ficha usa `font-display` (Fraunces) e herda Archivo do `body`: **não reaproveite `--font-display` nem `--font-sans`** e mantenha `body:has(.sem-animacao)` com Archivo. Estilos globais novos (raio, sombra, fundo, movimento, fonte) não podem vazar para a Ficha nem para a impressão.
- **Não use `window.print()` por automação.** Verifique comparando o CSS computado em emulação de mídia `print` e entregue ao Pedro as instruções para imprimir um PDF real (1 e N preparos) e comparar antes/depois.

## Dependências e escopo

- Sem nova dependência de runtime sem pedir. Sem reescrever o que não foi pedido ("já que estou aqui"). Mudança pequena em arquivo grande: editar o trecho, não reformatar o arquivo.
- Não ler nem processar binários de `public/icons|images|splash` (CLAUDE.md).

---

# Validação antes de concluir

Sempre que apropriado (CLAUDE.md): lint, TypeScript, testes e build; use o agente `verificador`. Para UI, além disso:

- [ ] Funciona em 360–390 px e em 1280 px (ou diga que **não** foi verificado).
- [ ] Navegação só por teclado: foco visível, ordem lógica, modal prende e devolve foco.
- [ ] Contraste das cores novas calculado.
- [ ] Nenhum `name=`/payload de formulário mudou (comparar antes/depois quando o formulário foi tocado).
- [ ] Nenhum arquivo das fronteiras de segurança acima foi modificado (`git diff --stat`).
- [ ] Sem estilo duplicado: nenhuma string de classe nova copiada de outro componente.
- [ ] Tema escuro conferido em formulário, alerta, tabela, modal e estados vazio/erro/carregamento.
- [ ] Larguras 360, 390, 768 e 1280 px; sem rolagem horizontal da página em 360 px; barra de abas não cobre botão de envio nem o fim do formulário.
- [ ] Smoke de leitura: página protegida sem sessão = 307 ou 200 com `NEXT_REDIRECT` e sem `<h1>`; `/login` sem shell.
- [ ] Ficha Técnica: CSS computado em mídia `print` igual ao de antes; shell com `display: none`.
- [ ] Build **no `ender`** (a partir de `git archive HEAD` commitado). Dev server local com `npx next dev --webpack`; encerrar por PID. Zero escrita no banco de produção; screenshots sem nome, telefone ou endereço reais.

Se não for possível executar alguma validação, diga isso. **Não diga que algo foi testado se não foi.**

---

# Comunicação ao terminar

Informe, de forma objetiva:

1. **Alterações visuais** (o quê e onde);
2. **Alterações lógicas** — "nenhuma", ou a lista com a confirmação do Pedro;
3. arquivos modificados;
4. validações executadas e **não** executadas;
5. pendências e itens **[confirmar]** do DESIGN-SYSTEM.md que a tarefa tocou.

---

# Quando parar e perguntar

- O DESIGN-SYSTEM.md marca o ponto como **[confirmar]** ou não o cobre.
- A mudança visual exige tocar em qualquer fronteira de segurança.
- A mudança altera texto que expressa regra de negócio.
- A tarefa conflita com `docs/REGRAS_NEGOCIO.md` ou `docs/DECISOES.md`.
- Há risco para a impressão da Ficha Técnica ou para o deploy.
