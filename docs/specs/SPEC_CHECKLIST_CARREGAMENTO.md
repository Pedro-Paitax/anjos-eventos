# SPEC — Checklist de carregamento do Senhor Churrasco

> Decisões do Pedro em 21/11/2026. Destinatário: Claude Code no repositório `anjos-eventos`.
> Base do código conferida: `master` `c2a600b` (`src/db/schema/preparos.ts`, `src/db/schema/insumos.ts`, `src/db/schema/operacional.ts`, `src/lib/decisoes-operacionais-opcoes.ts`, `src/lib/lista-compras-pdf.ts`, `src/lib/automacao-whatsapp.ts`).
> Protótipo visual aprovado pelo Pedro: `docs/specs/checklist-carregamento-exemplo.pdf`, gerado por `docs/specs/prototipo-checklist-pdf.mjs` (pdf-lib, Helvetica, dados fictícios). **O PDF real deve ficar igual ao protótipo.**

## 1. Escopo

- **C1** Só para eventos do **Senhor Churrasco**.
- **C2** Sai em **PDF por evento**. A tela touch ainda não existe; o modelo de dados deve servir para ela depois.
- **C3** Na tela do evento ficam dois botões: **"Emitir checklist (PDF)"** e **"Enviar no WhatsApp"**. O envio vai para os **números da família** (`FAMILIA_WHATSAPP_NUMEROS`, como em `src/lib/automacao-whatsapp.ts`). É só pelo botão, sem cron (decisão de 05/11).
- **C4** Confere **só presença** (marcou = foi). Não há quantidade nesta versão.
- **C5** **Sem conferência da volta.**
- **C6** Um carro leva tudo; o veículo vem das Decisões Operacionais e aparece no cabeçalho.
- **C7** Tudo sai do **depósito com cozinha embutida**. Nesta versão não há local de armazenamento (seção 7).
- **C8** Não há caixa térmica nem cooler.

## 2. Formato do PDF (aprovado no protótipo)

- **A4, duas colunas.** Cada categoria fica inteira numa coluna. Se uma categoria for maior que a coluna, continua na seguinte com "(cont.)".
- **Cabeçalho:**
  - Faixa laranja (`#f2753f`) e "BUFFET SENHOR CHURRASCO" em cinza.
  - Título "Checklist de carregamento".
  - **Caixa de destaque no canto superior direito** com o **horário de chegada da equipe** em 24 pt e o **tipo do evento**.
  - Grade com cliente, data, convidados (adultos e crianças), veículo e local.
  - Bloco "Observações do evento", com fundo cinza e faixa laranja.
- **Categorias:** título em maiúsculas e negrito, com uma linha embaixo. Um item por linha, com um **quadrado à esquerda** para marcar à caneta. As linhas têm 17 pt.
- **Subgrupos:** em Temperos ("Fixos", "Buffet" e "Do cardápio"), em Louças e servir ("Sempre" e "Do cardápio") e em Comida ("Carnes", "Saladas" e "Outros").
- **Origem em cinza à direita** quando o item vem do cardápio ou de uma regra. Ex.: "Saladeiras · Mix, Vinagrete, Maionese"; "Espátula de bolo · casamento".
- **Pegadores:** a linha mostra a conta, por exemplo "Pegadores / colheres (30) · 2 x 15 preparos". É só informação; a conferência continua sendo de presença.
- Categoria sem item no evento não aparece.
- **No fim:** um aviso em caixa tracejada com as fichas sem itens de carga (C21).
- **Rodapé:** data e hora de geração e "Página X de Y".
- **Ordem das categorias:** Talheres de serviço, Churrasco, Limpeza, Temperos, Louças e servir, Bebidas, Equipamentos, Descartáveis, Pratos, Talheres dos convidados, Taças e copos, Equipe, Comida.
- Caracteres fora do WinAnsi seguem o padrão de `paraWinAnsi` em `src/lib/lista-compras-pdf.ts`.

## 3. Categorias fixas (vão em todo evento)

**TALHERES DE SERVIÇO**
- Pegadores ou colheres: **2 por preparo do cardápio** (C9), além dos que ficam na cozinha
- Chaira, pedra ou afiador
- Facas de carne
- Faca do chef
- Faca de serrinha
- Espátula de bolo: **só em casamento** (é para a foto; o bolo se corta com faca) (C10)

**LIMPEZA**
- Pano de prato
- Perflex
- Esponjas
- Bombril
- Detergente ou sabão
- Pasta ou limpa-alumínio
- Fósforo
- Álcool e borrifador de álcool
- Pano de polimento
- Sacos de lixo
- Papel-filme
- Rolo de sacolinha
- **Não vão:** papel-alumínio, papel-toalha (C11)

**TEMPEROS**
- Fixos: sal de parrilla, sal grosso, sal temperado, sal comum, óleo, azeite, alho triturado, alho
- Buffet: azeite para o buffet, vinagre para o buffet, sal para o buffet
- Do cardápio: os temperos de cada preparo, **tirados das fichas técnicas** (C12). Os que já estão nos fixos não se repetem.

**LOUÇAS E SERVIR**
- Sempre: bowls de reposição, travessas de inox, tábuas de carne, tábuas de salada, tábuas padrão, louças de cerâmica
- Do cardápio: os recipientes marcados nas fichas (seção 5)

**DESCARTÁVEIS** (C13)
- Copos, pratinhos, garfinhos, guardanapos, luvas descartáveis

**CHURRASCO** (C14, todo evento)
- Cano com espetos
- Parrilla pequena (a que abre e fecha)
- Carvão
- Álcool etanol (acendedor; o fósforo está em Limpeza)
- **Não vão:** grelhas, luva de churrasco

**EQUIPE** (C15)
- Uniformes

## 4. Categorias que vêm das Decisões Operacionais do evento

- **C16** **PRATOS**, **TALHERES DOS CONVIDADOS** e **TAÇAS E COPOS**: uma categoria para cada, com o que estiver marcado em `decisoes_operacionais_evento` (modelo de prato, sousplat, tipo de talher, copo ou taça, taça furta-cor e de champanhe). A quantidade de taças, quando existir, aparece em cinza à direita.
- Decisão não preenchida: a categoria sai com o aviso "a definir" em vez de sumir.
- Nada mais do contrato muda o carregamento, por enquanto.
- **C17** Gás, fogão, extensão e churrasqueira do local: o local avisa e vai nas observações do evento, que saem no cabeçalho do PDF.

## 5. Itens que vêm das fichas técnicas

- **C18** O campo de texto livre `preparos.apresentacao_utensilio` (os antigos "Requisitos de Logística") hoje mistura recipiente de servir e equipamento de preparo, e nem toda ficha está preenchida.
- **C19** Aprovado: criar uma **lista de itens de carga** para marcar em cada ficha (relação N:N preparo ↔ item). A lista inicial leva **todos os itens citados pelo Pedro**:
  - Louças e servir: saladeiras, bowls, travessas de inox, tábuas de carne, tábuas de salada, tábuas padrão, louças de cerâmica, rechauds, travessas de lasanha, formas, taças de vidro grandes (para comida), barca de boas-vindas
  - Bebidas: jarras grandes, jarras pequenas, suqueiras, aquários de ponche, vasos para suco, taças ou copos
  - Equipamentos: mixer, processador, liquidificador, cabrita (cortador de legumes)
- Cada item marcado em qualquer ficha do cardápio entra **uma vez** na categoria dele, com os preparos de origem em cinza.
- **C20** O texto livre atual **não é apagado nem migrado automaticamente**: aparece na tela da ficha, ao lado da lista de marcar, como referência para o Pedro marcar os itens.
- **C21** Ficha sem itens marcados não trava a emissão. O PDF lista no fim: "Fichas sem itens de carga: …".
- O Pedro pode acrescentar itens à lista depois (cadastro em tabela, não constante no código).

## 6. Comida

- **C22** Categoria **COMIDA**: uma linha por preparo do cardápio confirmado do evento. Subgrupos: **Carnes** (categoria `Carnes`), **Saladas** (`Saladas`) e **Outros** (as demais categorias).
- **C24** Não há regra de caixa própria no sistema: a família organiza as caixas internamente.

## 7. Fora desta versão

- Quantidades, conferência da volta, tela touch.
- **Local de armazenamento** (planejado, aprovado pelo Pedro): quando ele organizar a cozinha, haverá um campo opcional `local` em cada item, e o PDF mostrará o local em cinza ao lado do item. **Desenhar as tabelas de itens agora de forma que esse campo entre depois só com um ADD COLUMN.**

## 8. Pontos de implementação que precisam do Pedro (levar a ele, não decidir sozinho)

1. **Como achar os temperos nas fichas (C12).** A tabela `insumos` não tem categoria. Proposta: uma coluna booleana nova `eh_tempero` em `insumos`, e uma lista dos candidatos (nomes com sal, pimenta, páprica, orégano, cominho, noz-moscada, mostarda, etc.) para o Pedro aprovar antes do UPDATE.
2. **Casamento (C10).** `eventos.tipo_evento` é texto livre. Proposta: casamento = `tipo_evento` contém "casamento", sem diferenciar maiúsculas e acentos. Mostrar ao Pedro os valores distintos que existem hoje no banco.
3. **Carga inicial dos itens de carga.** Depois da migração, ler o `apresentacao_utensilio` de todas as fichas e propor ao Pedro, ficha por ficha, quais itens marcar. Só gravar o que ele aprovar.
