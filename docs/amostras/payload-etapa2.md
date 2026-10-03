# Etapa 2 — comparação do payload do FormData (antes × depois)

Método: em cada tela com formulário, o navegador preencheu os campos nomeados com valores de exemplo
(texto `x_<name>`, número 7, hora 10:30, data 2026-12-01, selects no 1º valor não vazio, checkboxes marcados) e leu
`new FormData(form)` **sem enviar**. "Antes" = commit da Etapa 1; "depois" = Etapa 2 (Campo/BotaoEnviar/Alerta/Painel).
Comparados: lista ordenada `name=valor` e lista ordenada `elemento:tipo:name`.

| Tela | Forms | Campos | Payload | Ordem/tipo/names |
|---|---|---|---|---|
| /colaboradores/novo | 1 | 8 | idêntico | idênticos |
| /colaboradores/4 | 1 | 8 | idêntico | idênticos |
| /insumos/127 | 1 | 8 | idêntico | idênticos |
| /cardapios-modelo/novo | 1 | 6 | idêntico | idênticos |
| /cardapios-modelo/4 | 1 | 20 | idêntico | idênticos |
| /preparos/novo | 1 | 18 | idêntico | idênticos |
| /preparos/56 | 1 | 26 | idêntico | idênticos |
| /agenda/novo?empresa=1 | 1 | 11 | idêntico | idênticos |
| /agenda/novo?empresa=2 | 1 | 7 | idêntico | idênticos |
| /agenda/novo?empresa=3 | 1 | 7 | idêntico | idênticos |
| /agenda/14 (evento + decisões) | 2 | 30 e 14 | idêntico | idênticos |

Exemplo (`/colaboradores/4`): `nome=x_nome`, `funcao=copeira`, `telefoneWhatsapp=5541999999999`, `ativo=on`
(+ campos internos `$ACTION_*` do React, também idênticos).
Exemplo (`/agenda/novo?empresa=2`): `empresaId=2`, `clienteNome`, `qtdAdultos`, `qtdCriancasAte5`, `qtdCriancas5a10`, `valorNegociado`.

**Não capturado:** `formulario-confirmar-evento` (Passo 3) — o único orçamento existente (/orcamentos/8) não exibe o
formulário e não criei dados. A mudança nesse arquivo é só estrutural (Campo no lugar de div+label+input; BotaoEnviar).
