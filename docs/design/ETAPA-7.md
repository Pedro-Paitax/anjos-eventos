# Etapa 7: `Seletor` (Radix) e Equipe nas Decisões Operacionais

Branch `redesign-ui-3`, criada a partir da `redesign-ui-2` (a `master` não contém a `redesign-ui-2`; conferido com `git branch --contains`). Nenhuma action, lib de regra, API ou schema alterado; Ficha Técnica e `@media print` intocadas; sem `loading.tsx` novo, sem `<h1>` no shell; nenhuma escrita em banco; sem deploy.

## Parte A: Seletor

**Compatibilidade (branch descartável, já apagada; build no `ender` a partir de `git archive`):** Next 16.3.4, React 19.2.8, Tailwind 4.3.3.
- `@radix-ui/react-select` 2.3.8 (peer React `^19` aceito): `npm install` ok, `tsc` ok, `next build` ok (`BUILD=0`), o SSR devolve `button[role=combobox]`.
- Componente do shadcn (`select.json` do registro `new-york-v4`, copiado à mão): só compila com o pacote agregado `radix-ui`, `lucide-react`, classes de `tw-animate-css` e tokens (`bg-popover`, `border-input`) que **não existem** neste projeto. Compila (`BUILD=0` depois de instalar `radix-ui` e `lucide-react`), mas é só um invólucro do Radix. **Decisão: Radix direto** (`@radix-ui/react-select` 2.3.8, versão exata) e componente próprio com tokens Brasa. `shadcn init` nunca foi rodado e não há componente do shadcn no repositório. O único diff em estilo é **aditivo** em `globals.css` (+85 linhas: `.seletor-*` e a animação), sem reescrever nada.

**Componente:** `src/components/seletor.tsx` (`name`, `defaultValue` ou `value`+`onChange`, `opcoes`, `required`, `disabled`, `placeholder` "Selecione…", `id`, `aria-*`, `className` só de layout). 20 `<select>` trocados em 12 arquivos (colaborador, insumo, preparo e composição, evento churrasco e genérico, orçamento, decisões, simulador, 3 listas). `OPCOES_STATUS_EVENTO` foi para `formulario-evento.tsx` (a lista estava repetida nos dois formulários de evento).

**Payload no navegador (Chrome headless por CDP, `new FormData(form)` sem enviar, dois builds do `ender`: antes = `e757b3a`, depois = HEAD, dados fictícios).** Para cada formulário: leitura inicial e leitura depois de escolher, **pelo teclado**, a última opção de cada select (a primeira na composição). Resultado: **18 casos, 26 formulários×fases, 277 entradas e 323 controles, 0 diferenças** (mesmos names, valores e ordem). Cobre colaborador (novo, existente), insumo, preparo (novo, existente com 2 linhas de composição), evento genérico e churrasco (novo, existente), orçamento churrasco, decisões (vazio, com "(valor antigo)", sem garçom ativo) e as três listas. "Sem seleção" continua `""`; "Kombi antiga (valor antigo)" é mantido e reenviado. Limites: o orçamento genérico e o "confirmar evento" não têm select; o que depende de actions de servidor não foi exercitado.

**Teclado (CDP, eventos reais):** Enter abre e leva o foco ao item; ↑/↓, Home, End; digitar "O" foca o item que começa com O; Enter seleciona, fecha e devolve o foco ao gatilho; Esc fecha, mantém o valor e devolve o foco. Dentro do `Modal`: o 1º Esc fecha só a lista, o 2º fecha o modal (o `Modal` escuta o `document`; o painel chama `stopPropagation` no Esc). **Tab com a lista aberta** mantém a lista aberta e move o foco para um elemento sem rótulo (o Radix impede o Tab e o `Modal` ainda desloca o foco): diferente do select nativo, que fecha. Não corrigido.

**Reset:** depois do envio (o React 19 reseta o formulário) o select volta ao `defaultValue` (colaborador: "garcom" → "copeira"). **`required`:** a linha de composição vazia deixa o formulário inválido ("Preencha este campo.").

**Alvos:** gatilho 48 px, item 44 px. **Camadas:** painel com `z-index: 60` (`--z-popover`), acima do modal (50) e da barra de salvar (20); `elementFromPoint` sobre o painel dentro do modal acerta o painel.

**Visual:** raio, borda, elevação e destaque por token (`brasa` a 16 %; sem azul), ✓ no marcado, seta. **Contraste calculado (WCAG):** texto sobre painel 13,30; sobre item destacado 10,38; ✓ sobre painel 7,35 e sobre destaque 5,74; anel de foco sobre destaque 7,49; placeholder e seta sobre campo 8,49; borda do gatilho 4,72 (mínimo 3). A borda do painel (`borda-forte`) tem 1,67 sobre `elevada`: é decorativa, o painel se separa pela sombra e o texto é o rótulo. **Movimento:** com `prefers-reduced-motion: reduce` a animação é `none`; sem preferência, `fade-in` de 120 ms (medido).

**Celular (390 px, emulação com toque):** o painel abre para cima quando falta espaço embaixo, fica acima da barra de abas (z 60 contra 30) e não se esconde atrás dela; `max-height` pela altura disponível. Capturas: `capturas/etapa7-seletor-modal-1280.png`, `etapa7-seletor-390.png`.

## Parte B: Equipe

`FormularioDecisoesOperacionais` (mesmo `<form>`, `name="colaboradorIds"`, mesma action; nova prop opcional `garconsNecessarios`, passada pela página com `evento.qtd_garcons`):
- contagem por função ("Garçons: 0 de 4 alocados", `aria-live`; ícone + texto + cor; copeira e assador com mínimo 1, como na regra de `pendencias-evento`, que não foi tocada);
- colaboradores como cartões selecionáveis (56 px; marcado = borda e fundo `brasa` + ✓; foco no anel);
- sem ativo suficiente: "Nenhum ativo cadastrado." ou "Só há N ativos cadastrados; faltam M para o mínimo." com link para `/colaboradores` (44 px);
- barra de salvar fixa (mesmo desenho da do orçamento), com "Decisões salvas." dentro dela.

A contagem lê as caixas marcadas no DOM (`onChange` e `onReset` do form), então as caixas continuam sem estado próprio. Verificado no navegador: a contagem atualiza ao marcar e desmarcar; `FormData` de `colaboradorIds` na ordem do DOM (3,1,2); payload das decisões idêntico (ver Parte A). Capturas: `etapa7-equipe-1280.png`, `etapa7-equipe-390.png`, `etapa7-pendencias-1280.png`.

**Modal "Resolver pendências":** cada item vai para `/agenda/<id>#<campo>` (`equipe-<função>` = 1ª caixa do grupo; `veiculo`, `modeloPrato`… = gatilho do select, que mantém o `id`) e o foco vai ao campo: `FocoPorAncora` (ao abrir a página com `#`) e `focarAncora` (no clique, na mesma página). Itens sem colaborador ativo continuam indo para `/colaboradores`. Verificado: os `href`s do modal e o foco ao abrir `/harness#equipe-garcom` (input) e `#veiculo` (gatilho). **Não verificado:** o clique do modal na página real do evento (precisa de banco).

### Proposta: edição inline nas pendências (NÃO implementada)

A action `salvarDecisoesOperacionaisAction` **substitui tudo** (equipe inteira e todos os campos), então editar um item sozinho a partir da Home sobrescreveria o resto. Para o modal editar dentro da Home, a Home precisaria, **por evento com pendência**, de: colaboradores ativos (`listarColaboradoresAtivos`, já existe), equipe atual (`listarEquipeEvento`), decisões atuais (`obterDecisoes`) e `qtd_garcons`. Desenho mais simples: o modal renderiza o mesmo `FormularioDecisoesOperacionais` com esses dados, sem action nova; exige só uma query em lote nova para a Home.

**PRECISA DE LÓGICA:**
1. query em lote de equipe e decisões por evento para a Home (hoje só há contagens por função);
2. se for salvar **um campo por vez**, uma action de atualização parcial (a atual não serve);
3. revalidação da Home e do evento depois de salvar (a action atual já chama `revalidatePath` nos dois);
4. decidir se o mínimo de copeira e assador (1) deve ser exportado de `pendencias-evento`, para a tela não repetir o número.

## Validação (HEAD, no `ender`, a partir de `git archive`)

`tsc --noEmit` limpo (a única mensagem, `LayoutProps` no `layout.tsx`, já existia: o tipo vem do `next build`); `eslint` limpo; `vitest run`: 119 passaram, 12 pulados; `next build` sem rede (proxy morto, fontes locais): `BUILD=0`, standalone gerado. Smoke de leitura do build (sem banco): `/login`, `/`, `/agenda`, `/agenda/1`, `/colaboradores` respondem 200 (redirecionamento transmitido em streaming) sem `<h1>`; `/api/whatsapp/status` 401.

## O que não foi verificado

- Aparelho real (iOS/Android): teclado virtual com o painel aberto, área segura, zoom em campo de 16 px. A emulação com toque do Chrome não prova isso.
- Leitor de tela (anúncio da lista, do ✓ e do `aria-live` da contagem).
- Telas reais com banco: a criação de um banco de teste no Postgres do `ender` foi negada, então tudo foi feito num harness descartável com os componentes reais e dados fictícios (fora do repositório). Ficam sem verificação o evento real com equipe, o modal de pendências na Home e o clique do modal na página do evento.
- Safari e Firefox (só Chrome).
- Tab com a lista aberta (comportamento descrito acima).
- Larguras 360 e 768 px do `Seletor` e da Equipe (só 390 e 1280).
