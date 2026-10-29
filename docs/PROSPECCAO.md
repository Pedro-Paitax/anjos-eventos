# Prospecção comercial — como usar e como funciona

Módulo `/prospeccao`: encontrar, documentar, qualificar e abordar potenciais
parceiros (cervejarias, bares/restaurantes, espaços de eventos e outros) para
experiências com parrilla e fogo ao vivo. Mercado inicial: Curitiba e RMC.

**Estado (2026-10-28):** código pronto e testado na branch `automacao-deploy`.
Migrações 0008 e 0009 aplicadas em produção em 2026-10-28; Gemini ativo (chave no servidor).
e app no ar (deploy `2761330`).

---

## Fluxo comercial

1. **Cadastrar** (`Novo lead`) ou **importar CSV** (`Importar CSV`). Só dados
   públicos e comerciais; o que não se sabe fica em branco.
2. **Registrar fontes** (página do lead → Evidências): fonte, URL, data da
   consulta, o fato que a fonte sustenta, natureza (fato ou inferência),
   confiança e verificação. Uma evidência pode sustentar um campo do cadastro
   (ex.: telefone); campo sem evidência verificada aparece como "sem fonte
   verificada".
3. **Deduplicar**: o cadastro e a importação avisam sobre duplicatas. A
   `Fila de pesquisa` lista pares suspeitos já na base.
4. **Qualificar** (página do lead → Avaliar): nota por dimensão, com
   justificativa, evidências e confiança. Nota em branco = desconhecida.
5. **Gerar mensagem** (página do lead → Mensagens): escolher canal e
   objetivo; cada geração é uma nova versão. Editar, marcar os fatos
   verificados usados, aprovar.
6. **Abrir o canal** (WhatsApp `wa.me` com o texto, perfil do Instagram com o
   texto copiado, ou rascunho de e-mail) e enviar **pelo app, à mão**.
7. **Confirmar o envio** (caixa "Confirmo que enviei…" + botão). Só aqui a
   mensagem conta como enviada e o lead vira "Contatado".
8. **Registrar o resultado**: resposta, reunião, proposta, parceria fechada,
   sem interesse ou anotação, com a próxima ação.
9. **Acompanhar** em `Indicadores` (por categoria, prioridade, município e
   origem) e ajustar onde concentrar o esforço.

## Regras (não alterar sem decisão)

- **Nada é enviado automaticamente.** Gerar ≠ aprovar ≠ enviar. Abrir o link
  do canal registra só "canal aberto". Enviada = confirmação explícita.
- **Editar uma mensagem aprovada a devolve para revisão** (a aprovação vale
  para o texto aprovado).
- **Não contatar**: exige motivo; descarta mensagens pendentes e bloqueia
  gerar, aprovar, abrir canal e confirmar envio (checado também no SQL).
  Remover o bloqueio exige justificativa e fica no histórico.
- **Deduplicação nunca une registros.** "Forte" (mesmo domínio, telefone,
  Instagram ou e-mail) bloqueia; "possível" (nome igual/parecido no mesmo
  município) pede confirmação manual.
- **Inferência não pode ser marcada como verificada.** Só fato verificado pode
  personalizar mensagem.
- **Sem DELETE na interface.** Evidência errada vira "divergente"; lead
  duplicado vira "Sem interesse" com anotação apontando o registro principal.

## Pontuação (src/lib/prospeccao-pontuacao.ts)

| Dimensão | Máx. |
|---|---|
| Compatibilidade com parrilla / fogo ao vivo | 30 |
| Sinais de demanda por eventos e experiências | 25 |
| Viabilidade operacional aparente | 20 |
| Potencial comercial e de recorrência | 15 |
| Canal comercial apropriado | 10 |

Faixas: A 80–100 · B 60–79 · C 40–59 · Baixa < 40.

- Dimensão **desconhecida não vale zero**: a pontuação mostra o valor atual e
  o máximo possível ("63, até 83") e fica **provisória**.
- Completude < 50% dos pesos → prioridade **indefinida** (pesquisar mais, não
  é lead ruim). "Baixa" só quando nem o máximo possível chega a 40.
- Nota > 0 sem evidência só é aceita com confiança baixa.
- Pesos ficam no código; cada avaliação guarda pontos e máximo no JSON, então
  mudar pesos não reescreve avaliações antigas. Reavaliar cria nova linha
  (histórico preservado).
- Avaliar move o status só na fase de pesquisa: A/B/C → Qualificado;
  Baixa → Prioridade baixa; Indefinida → Em pesquisa.

## Status do lead

Novo → Em pesquisa → A verificar → Qualificado / Prioridade baixa → Pronto
para contato → Contatado (sem resposta) → Em conversa → Reunião/proposta →
Convertido. Saídas: Sem interesse; Não contatar (bloqueio).

Automáticos: envio confirmado → Contatado; resposta → Em conversa; reunião ou
proposta → Reunião/proposta; parceria → Convertido; sem interesse → Sem
interesse. Só avançam (não fazem o funil voltar). "Contatado" e "Não
contatar" não são escolhidos à mão.

Estados da mensagem: Aguardando revisão → Aprovada → Canal aberto → Enviada
→ Respondida; Descartada a partir de qualquer estado não final.

## Indicadores (src/lib/prospeccao-metricas.ts)

- Contatado = lead com ao menos um **envio confirmado**.
- Taxa de resposta = leads contatados que responderam ÷ leads contatados;
  sem contatados mostra "—"; com menos de 20 contatados marca "amostra
  pequena". Resposta sem envio confirmado não entra na taxa.
- Mensagens aprovadas/enviadas contam o evento (data de aprovação/envio), não
  o estado atual.
- Período: desde o início (não há filtro de período ainda).

## CSV

Importação: `/prospeccao/importar`, colunas listadas na própria tela
(`nome_comercial` e `categoria` obrigatórias), `,` ou `;`, até 500 linhas.
Duas etapas (analisar → importar), tudo ou nada, reanalisa ao importar.
Colunas `fonte_*` viram evidência (verificada só com `fonte_verificada=sim`).

Exportação: `Exportar CSV` (`;` + BOM, abre no Excel em pt-BR).

## Geração por IA — Gemini (Free Tier)

Decisão do Pedro em 2026-10-28: Gemini API em projeto **Free Tier, sem
faturamento**. Código em `src/lib/prospeccao-ia.ts`; ativo só quando
`GEMINI_API_KEY` existe no servidor. Sem a chave, tudo funciona como antes
(modelo local honesto, `src/lib/prospeccao-mensagem.ts`, `gerador = modelo_local`).

Como funciona:
- Na página do lead → Mensagens, "Gerar com: IA (Gemini)" ou "Modelo sem IA".
  A mensagem gerada nasce **aguardando revisão**, como qualquer outra: nada é
  enviado; aprovar e confirmar o envio continuam manuais.
- Modelo padrão `gemini-3.5-flash-lite` (estável, "Free of charge" no Free Tier,
  sem data de desligamento; a família 2.5 está com acesso restrito a quem já
  usava e os *preview* têm limites menores — docs do Gemini consultadas em
  2026-10-28). Trocável por `GEMINI_MODEL`, sem mexer no código.
- Interactions API (`POST /v1beta/interactions`, recomendada pelo Google desde
  06/2026), chamada com `fetch` (sem dependência nova), chave só no header
  `x-goog-api-key`, `store: false`, timeout de 30 s.
- **Privacidade (Free Tier: o Google usa o conteúdo para melhorar produtos):**
  o pedido leva só nome, categoria, segmento e município do estabelecimento,
  o objetivo e os **fatos verificados**. Não vão: telefone, e-mail, Instagram,
  responsável comercial, observações/limitações internas nem o nome de quem
  envia (o modelo escreve `[REMETENTE]`, trocado no servidor).
- Proteções: resposta em JSON com esquema; mensagem que cita fato não enviado é
  **descartada** (pode conter invenção); tamanho máximo por canal; e-mail exige
  assunto. Os fatos que a IA declara usar ficam em `fatos_usados` — o revisor
  confere no texto antes de aprovar.
- Limites: por **projeto** (não por chave), visíveis em AI Studio → Rate limit;
  o diário zera à meia-noite do Pacífico. Estourou → HTTP 429 → aviso na tela
  ("gere sem IA ou tente mais tarde"); nada é gravado. No Free Tier, sem
  faturamento, não há cobrança.
- Gravar `gerador = 'gemini'` exige a migração `drizzle/0009_lead_mensagens_gerador_gemini.sql`.
  Sem ela, a tela avisa e nada é gravado.

Ativação: ver "Ativação do Gemini" em `docs/DECISOES.md` (seção de 2026-10-28).

Registro da opção apresentada antes (não escolhida): SDK oficial `@anthropic-ai/sdk` (dependência nova) +
chave `ANTHROPIC_API_KEY` só no servidor (`ecosystem.config.js`), chamada numa
Server Action, recebendo apenas fatos verificados e gravando `gerador =
anthropic` e o modelo. Custo estimado por mensagem (~1.500 tokens de entrada,
~300 de saída, preços de tabela em 2026-10): Claude Opus 5.5 ≈ US$ 0,012;
Claude Haiku 5.5 ≈ US$ 0,0003. Para 50 leads × 3 versões: ≈ US$ 1,80 (Opus)
ou ≈ US$ 0,05 (Haiku). A coluna `gerador` já aceita `anthropic`.
