# Etapa 4: FormData do orçamento (churrasco) lido no navegador, antes × depois

Método: Chrome headless (CDP) sobre dois builds do ender, "antes" = `da5094e` (fim da Etapa 3) e "depois" = `681e219` (Etapa 4), em `/agenda/novo?empresa=1`, com dados fictícios, em 1280 e 390 px. Os campos foram preenchidos pela interface (valores digitados com evento `input`, itens do cardápio escolhidos no modal "Adicionar ao cardápio", caixa "Região Metropolitana" marcada) e o resultado lido com `new FormData(form)` **sem enviar** (nenhum envio; a action da prévia é vazia). Comparados: lista `name=valor` na ordem do formulário e lista `elemento:tipo:name` de todos os controles nomeados.

Resultado (1280 e 390 px): **19 entradas, idênticas em names, ordem e valores; 19 controles, idênticos em tag, tipo, name e ordem.** A única diferença bruta é o campo interno `$ACTION_ID_<hash>`, que o Next gera por build (o nome muda a cada build; o campo existe nos dois).

```
$ACTION_ID_<hash>=
empresaId=1
usarPrecoFixoModelo=false
regiaoMetropolitanaCuritiba=true
clienteNome=Cliente Fictício Ação
qtdAdultos=40
qtdCriancasAte5=3
qtdCriancas5a10=7
cardapioCarnes=Carnes item 1
cardapioCarnes=Carnes item 3
cardapioSaladas=Saladas item 2
cardapioSobremesa=Sobremesa item 1
preparoIds=21
preparoIds=23
preparoIds=32
preparoIds=51
precoPessoa=85.5
valorGarcom=120
qtdGarcons=4
```

**Limites:** o cardápio pré-montado (`obterItensCardapioModeloAction`) e o cálculo de preço sugerido chamam o servidor/banco e não foram exercitados (na prévia a action de preço devolve erro); o preço foi digitado à mão. A comparação cobre o formulário do churrasco, não o genérico (`/agenda/novo?empresa=2`), cujo marcado não mudou nesta etapa.

## Complemento: cardápio pré-montado selecionado e preço vindo do modelo

A primeira comparação (acima) digitou o preço à mão e não escolheu um cardápio pré-montado. Este complemento cobre esse caminho, também com `new FormData(form)` lido no navegador e **sem enviar**, em 1280 e 390 px, no fim da Etapa 3 (`da5094e`) × fim da Etapa 4 (`ab2d0d9`).

- **O `<select id="cardapioModeloBase">` não tem `name`.** Ele não vai no FormData: não existe `cardapioModeloId` no payload. O que grava são `precoPessoa` e `usarPrecoFixoModelo` (campo oculto), mais os itens (`cardapio<Categoria>` e `preparoIds`).
- **Modelo A (preço fixo):** a escolha pela interface dispara `aplicarTemplate`; os itens do modelo entram no seletor e o preço é pré-preenchido. Resultado: `usarPrecoFixoModelo=true`, `precoPessoa=95`, `cardapioCarnes=Carnes item 1`, `cardapioCarnes=Carnes item 3`, `cardapioSaladas=Saladas item 2`, `preparoIds=21,23,32`.
- **Modelo B (sem preço fixo):** `usarPrecoFixoModelo=false`, mesmos itens, `precoPessoa` vazio (o cálculo sugerido não roda na prévia).
- Antes × depois: 17 entradas e 17 controles, **idênticos** em names, ordem e valores nos dois modelos e nas duas larguras (exceto o `$ACTION_ID_<hash>`, que muda a cada build).

**Os valores são fictícios.** O "95" é o `precoFixoPorPessoa` inventado para a prévia (modelo "Modelo A (preço fixo)", `id` 1); os ids 21, 23 e 32 e os nomes dos itens também. Em produção esses números vêm do banco. Na prévia, a action `obterItensCardapioModeloAction` foi trocada (só no build da prévia, fora do repositório) por uma que devolve esses três ids.
