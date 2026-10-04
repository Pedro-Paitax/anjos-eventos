# Decisões Técnicas e de Negócio — Anjos Eventos

Este documento registra decisões já tomadas durante o desenvolvimento.

Estas decisões não devem ser alteradas automaticamente por agentes.

Uma sugestão de melhoria pode ser apresentada, mas qualquer mudança em uma decisão registrada aqui deve ser explicitamente aprovada.

---

# Status das decisões

Uma decisão pode estar em um dos seguintes estados:

- `APROVADA` — decisão definida e válida.
- `PENDENTE` — informação ainda precisa ser definida.
- `IMPLEMENTADA` — decisão já possui implementação correspondente.
- `VALIDADA` — implementação foi testada e validada.
- `DESCARTADA` — alternativa analisada e rejeitada.

---

# Arquitetura

## Banco central

Status: SUBSTITUÍDA (2026-09-16) — ver `docs/plano-migracao-postgres-vultr.md`

PostgreSQL é o banco de dados central.

NocoDB funciona como interface administrativa sobre o PostgreSQL.

**Esta decisão não é mais válida como guia de implementação.** O ADR
formal em `docs/plano-migracao-postgres-vultr.md` ("Migração de
Infraestrutura e Remoção do NocoDB — Plano Consolidado") a substitui:
NocoDB está sendo removido por completo, acesso ao banco passa a ser
direto via Drizzle ORM contra PostgreSQL puro, numa VPS Oracle Cloud
dedicada (identidade do provedor verificada via SSH/metadata OCI,
não apenas alegada). Mantida aqui riscada, não apagada, por histórico —
nenhum código novo deve ser escrito assumindo coexistência com o NocoDB
a partir de agora.

---

## Corte de Produção NocoDB → Oracle Cloud

Status: IMPLEMENTADA (2026-09-22) — Fase C (observação) em andamento

Corte de produção concluído: `DATA_SOURCE=oracle` em produção, app rodando
via PM2 na VPS Oracle Cloud, banco PostgreSQL no Oracle como fonte real.
Detalhes completos em `docs/CHECKLIST_CORTE_PRODUCAO.md`.

NocoDB e o PostgreSQL local ("ender") continuam ligados como janela de
observação/rollback (Fase C, 48-72h) — não são mais dependência de
produção, apenas rede de segurança temporária. Desligamento definitivo
do Postgres "ender" como fonte e configuração de snapshot de hardware da
instância Oracle seguem PENDENTES de aprovação/confirmação do Pedro —
não executar sem decisão explícita dele.

---

## Stack

Status: APROVADA

A aplicação utiliza:

- Next.js
- Node.js
- TypeScript
- Docker
- PostgreSQL
- NocoDB

Infraestrutura:

- Debian
- Docker
- Tailscale

---

# Motor de dimensionamento

Status: APROVADA

Não utilizar per capita estático como regra principal.

A quantidade deve ser calculada proporcionalmente ao peso dos itens dentro do teto da macro-categoria.

---

# Hard Cap

Status: APROVADA

O Hard Cap reduz a quantidade do item.

O excedente não é redistribuído para outros itens da categoria neste estágio.

Essa limitação é intencional.

---

# Hierarquia de proteínas

Status: APROVADA

A hierarquia automática aplica-se somente à categoria Carnes.

Pesos:

- Carne Vermelha: 2,0 (Origem: Dado Operacional)
- Suíno: 1,0 (Origem: Dado Operacional)
- Aves: 1,0 (Origem: Dado Operacional)
- Ovino: 1,3 (Origem: Dado Operacional — confirmado com o sócio)
- Peixe: 0,9 (Origem: Dado Operacional — confirmado com o sócio)

A tabela Hierarquia_Proteina deve ter uma coluna Origem_Dado (Dado Operacional / Estimativa Heurística). Hoje todos os 5 valores são Dado Operacional — a distinção permanece no schema para uso em futuras calibrações que venham a ser só estimadas, não para os valores atuais.

Contexto da calibração: Pedro validou com o sócio que um evento típico distribui 400g de proteína como 200g Carne Vermelha + 100g Suíno + 100g Aves (proporção 2:1:1), o que corrigiu os pesos anteriores (que colocavam Suíno acima de Aves, contrariando a prática real).

---

# Pesos dinâmicos por tipo de evento

Status: DESCARTADA

Não serão utilizados pesos diferentes de acordo com o tipo de evento.

Exemplo de alternativa descartada:

- casamento valorizar determinado alimento;
- evento corporativo valorizar outro.

Motivo:

Não existem dados históricos suficientes para justificar essa complexidade.

---

# Motor logístico

Status: DESCARTADA

Decisão revertida. Toda a lógica de veículo de carga (Master, Kombi Nova, Kombi Velha), incluindo o motor de Unidade Equivalente de Volume (caixas), foi removida do escopo do projeto.

Motivo: priorização de MVP — o sistema financeiro e o motor de orçamentos ainda estão em construção; otimizar carregamento de veículo é complexidade prematura neste estágio.

Ação decorrente:

- Remover o campo Veiculo da tabela Eventos.
- Remover o campo "Veículo de carga" do formulário de Novo Evento.
- O checklist da Fase 2 (Picking List) NÃO terá dimensão de veículo — ver seção "Picking List (Fase 2)" abaixo.

PENDÊNCIA DE EXECUÇÃO: RESOLVIDA — campo Veiculo confirmado removido do
Postgres, do schema NocoDB e do formulário (verificado via API).

NOTA: o campo Peso_Medio_Unidade_G, originalmente desenhado para este
motor descartado, foi REAPROVEITADO com propósito diferente — ver seção
"Correção do Bug de Mistura de Unidades" — como fonte de conversão entre
Rendimento em Unidade e macros medidas em g/ml. Não é resíduo esquecido.

---

# Picking List (Fase 2 — Checklist de Carregamento)

Status: APROVADA (escopo definido, implementação pendente)

O checklist do dia do evento (Buffet Senhor Churrasco) é exclusivamente uma lista de separação: o que separar e onde encontrar no estoque (ex: "Pegue 10kg de Alcatra no Freezer 2").

Não inclui dimensão de veículo/carregamento físico — isso é responsabilidade da equipe de operação, não do software (ver Motor logístico, DESCARTADA).

---

# Motor de custo

Status: IMPLEMENTADA / VALIDADA

A fórmula oficial está documentada em:

docs/BRIEFING.MD
docs/REGRAS_NEGOCIO.md

Validação com dados reais (cobertos por teste automatizado):
- Vinagrete: custo total ≈ R$16,96
- Alcatra Grelhada: custo total ≈ R$64,93
- Arroz Branco com Alho Crispy: custo total ≈ R$20,07

---

# Motor de dimensionamento de cardápio

Status: IMPLEMENTADA / VALIDADA

Endpoint: GET /api/orcamentos/:id/dimensionamento

Validado com teste automatizado (Vitest) usando os 3 preparos reais e cenário
de Hard Cap. Regra de fail-fast confirmada: preparo sem Peso_Atratividade
resolvido (manual ou via Hierarquia_Proteina) é excluído do resultado, não
quebra o cálculo.

Cache/invalidação (Hierarquia_Proteina, Macro_Categorias): PENDENTE — ver
seção "Cache de Hierarquia_Proteina / Macro_Categorias" abaixo. Implementação
atual lê direto da API do NocoDB a cada cálculo, deliberadamente sem cache
por ora (decisão registrada nesta conversa).

---

# Snapshots financeiros

Status: APROVADA

Ao confirmar um orçamento como evento:

quantidade confirmada é congelada;
custo unitário é congelado.

Alterações futuras nos preços não devem modificar o histórico do evento.

---

# Receita adicional x custo operacional

Status: APROVADA

Evento_Itens_Adicionais representa receita.

Custos_Operacionais_Evento representa custo.

Esses conceitos não devem ser misturados.

---

# Extração de Contrato em PDF — Valor Financeiro

Status: APROVADA

O Valor_Total presente no PDF do contrato é a verdade absoluta do evento. O sistema nunca sobrescreve, trava ou exige correção baseada em divergência com o cálculo interno do motor de orçamento.

Fluxo de captura de desconto sem atrito:

1. O back-end calcula Diferenca = Valor_Sugerido - Valor_Extraido_PDF silenciosamente (Valor_Sugerido = Valor_Base_Por_Pessoa x Num_Convidados, preço padrão vigente).
2. Se Diferenca > 0, a tela de confirmação exibe o valor e um controle acionável: "Diferença de R$X detectada. Registrar como desconto concedido?"
3. Um clique preenche automaticamente Desconto_Tipo = 'Valor Fixo' e Desconto_Valor = Diferenca, junto com Valor_Total_Fechado = valor do PDF.

Motivo: sem isso, colunas de desconto ficam sempre vazias e a análise futura de margem não consegue distinguir "vendemos mais barato" de "demos desconto na negociação" — buraco analítico inaceitável em BI.

---

# Exclusão de Orçamentos

Status: APROVADA (com limitação de ferramenta conhecida)

Fluxo normal do produto: exclusão de orçamento é sempre SOFT DELETE (Status = Recusado). Preserva histórico de simulações para análise futura. Hard delete não deve existir como opção normal de uso.

INVESTIGAÇÃO CONCLUÍDA: o NocoDB NÃO expõe toggle nativo de cascade delete
para campos "Link to Another Record" — confirmado via issue oficial do
GitHub do NocoDB (ele não cria FK real no Postgres para bases internas,
então não há como configurar CASCADE nativo).

Consequência: hard delete físico (ferramenta de manutenção, uso raro —
LGPD, limpeza de teste) deve continuar usando exclusão sequencial
controlada na aplicação (filhos antes do pai), assumindo o risco já
identificado (falha de rede no meio do processo pode deixar dado órfão).
Não existe alternativa nativa mais segura disponível na plataforma atual.

---

# Exclusão de Evento

Status: APROVADA (2026-09-22, auditoria de documentação — comportamento
existente confirmado como intencional, não gap de processo)

A exclusão de evento (`src/lib/eventos.ts`, hard delete incondicional,
acionada por `botao-excluir-evento.tsx`) não tem restrição por status —
`orcado`, `confirmado`, `realizado` e `cancelado` são todos excludíveis
da mesma forma. Confirmado pelo Pedro como comportamento intencional.

Melhoria futura (não é requisito atual): considerar restringir ou exigir
confirmação adicional para exclusão de eventos já `confirmado`/
`realizado`. Não implementar sem nova decisão explícita.

---

# Garçom — RESOLVIDA (ver "Precificação por Cardápio Selecionado + Custo de Equipe Fixa")

Status: RESOLVIDA

Esta seção fica mantida como histórico da dúvida original, mas a decisão
já foi tomada e está formalizada na seção "Precificação por Cardápio
Selecionado + Custo de Equipe Fixa": Garçom é cobrado À PARTE do valor
por pessoa (R$230/profissional, sugestão 1 a cada 30 convidados) — ou
seja, é Receita (parte do que o cliente paga) E Custo real ao mesmo tempo,
exatamente a coexistência que a auditoria original já apontava como não
contraditória.

Dúvida original registrada abaixo, para contexto histórico:

A auditoria encontrou uma questão conceitual:

valorSugerido
    ↓
garçom entra no valor sugerido ao cliente

documentação financeira
    ↓
salário do garçom é custo operacional

Isso não necessariamente é uma contradição — o mesmo serviço pode gerar
receita e custo, que é exatamente o que normalmente queremos enxergar na
margem.

---

# Processo de Governança de Decisões

Status: APROVADA

Nenhuma mudança de schema ou regra de negócio é implementada sem debate prévio de consenso técnico (formato Contexto / Decisão / Consequência, estilo ADR) antes de ser registrada aqui como APROVADA.

---

# Cache de Hierarquia_Proteina / Macro_Categorias

Status: IMPLEMENTADA

Implementado via unstable_cache (Next.js) + rota POST /api/revalidate
protegida por segredo compartilhado (REVALIDATE_SECRET, validado no
servidor — 401 sem segredo ou com segredo errado). Testado: sem segredo →
401, segredo errado → 401, correto → 200, tag inválida → 400, GET → 405.

Pendente de execução (não de decisão): configurar o webhook do lado do
NocoDB apontando para essa rota — passo manual do Pedro, documentado
separadamente. O REVALIDATE_SECRET usado nos testes foi um valor de teste
("teste-local-nao-usar-em-producao") — trocar por segredo real gerado
antes de configurar o webhook em produção.

**Atualização 2026-09-22 (auditoria de documentação)**: com o corte de
produção concluído, as edições relevantes de catálogo passam a acontecer
no Oracle/Postgres, não mais no NocoDB — o webhook NocoDB →
`/api/revalidate` provavelmente ficou obsoleto como gatilho de
invalidação de cache. Proposta (não executada aqui — é mudança de
infraestrutura, fora do escopo de uma auditoria de documentação):
avaliar descomissionamento deste webhook e desenhar o gatilho de
invalidação equivalente para escritas via Drizzle, quando o Pedro
aprovar.

---

# Arquitetura Financeira do Orçamento

Status: APROVADA (schema pendente de criação)

Decisão tomada em discussão de consenso técnico (Claude + Gemini), nunca
formalizada aqui até agora — gap de processo identificado e corrigido.

Colunas novas em Orcamentos:
- Valor_Base_Por_Pessoa (Decimal)
- Desconto_Tipo (Single select: Percentual / Valor Fixo / Nenhum)
- Desconto_Valor (Decimal)

Nova tabela Orcamento_Itens_Adicionais:
- Orcamento (Link → Orcamentos)
- Descricao (texto)
- Valor (Decimal)

Fórmulas (ver docs/BRIEFING.MD seção 7 para a versão completa):

Receita Projetada = (Valor_Base_Por_Pessoa × Num_Convidados)
                     + Σ Orcamento_Itens_Adicionais.Valor
                     − Desconto_Aplicado
Custo Projetado = motor de custo, sobre Itens_Orcamento, sempre em tempo real
Margem Projetada = Receita Projetada − Custo Projetado (nunca armazenada)

Nenhuma rota destinada ao simulador público deve expor Custo Projetado nem
qualquer dado de custo interno — ver seção "Contrato do Simulador de
Orçamento" abaixo.

---

# Incidência de desconto sobre o orçamento

Status: APROVADA (2026-09-22, auditoria de documentação)

`Desconto_Aplicado` incide sobre o valor **já somado com os itens
adicionais** (Valor_Sugerido_Por_Pessoa × Num_Convidados + Σ Itens
Adicionais), não sobre o valor base isolado. Fecha a pendência
sinalizada em comentário de código em `src/lib/margem-orcamento.ts`
(`calcularDescontoAplicado`).

Nota: o caminho legado NocoDB (`calcularReceitaNocodb`, em
descontinuação) ainda aplica o desconto antes de somar os itens
adicionais — divergência conhecida do caminho legado, não corrigida
(fora do escopo desta auditoria de documentação; caminho sendo
descontinuado junto com o NocoDB).

---

# Contrato do Simulador de Orçamento (payload público)

Status: APROVADA

Decisão tomada em discussão de consenso técnico (Claude + Gemini), nunca
formalizada aqui até agora — gap de processo identificado e corrigido.

O endpoint público do simulador retorna exclusivamente preço de venda e
informação de cardápio — nunca custo interno, nunca informação logística
operacional (ex: veículo, já removido do escopo).

Formato de referência:

{
  "orcamento_id": number,
  "num_convidados": number,
  "valor_total_estimado": number,
  "itens": [
    {
      "preparo_id": number,
      "preparo_nome": string,
      "header_exibicao": string,
      "macro_categoria": string,
      "porcao_por_pessoa": number,
      "unidade": "g" | "ml" | "unidade",
      "porcao_limitada_por_cap": boolean,
      "volume_total_necessario": number
    }
  ],
  "avisos": [string]
}

Regras de exibição no front-end:
- header_exibicao é o ÚNICO agrupamento visual mostrado ao cliente.
- macro_categoria é metadado auxiliar, não deve virar elemento de UI visível
  (nunca uma barra de progresso de "quanto já foi usado do teto" — decisão
  deliberada, ver justificativa de UX na conversa original: gera percepção
  de "dieta"/racionamento e incentiva o cliente a inflar o pedido só para
  "preencher a barra").
- porcao_limitada_por_cap é exposto no JSON só para uso de debug interno do
  front-end — nunca vira texto, ícone ou tooltip visível ao cliente final
  (evita a percepção de "estão regulando minha comida").
- Campos NUNCA incluídos neste payload: Peso_Atratividade, Origem_Dado,
  Custo_Unitario, Subcategoria_Proteina, qualquer dado de custo interno.
- O array "avisos" é para avisos de negócio (ex: mínimo de convidados não
  atingido) — nunca avisos operacionais/logísticos internos.

---

# Precificação por Cardápio Selecionado + Custo de Equipe Fixa

Status: APROVADA

Valor Sugerido nasce do custo real do cardápio escolhido (via motor de
dimensionamento + motor de custo), não mais de um preço fixo por pessoa
pré-definido. Aplica-se em duas telas com a mesma lógica de cálculo, UI
diferente: Criar Evento (Senhor Churrasco) e a página dedicada do Simulador
de Cardápio.

Fórmulas:

Valor_Sugerido_Por_Pessoa = TETO(Custo_Cardapio_Por_Pessoa × 1,40)

Valor_Sugerido_Total_Evento (o que o CLIENTE paga) =
    (Valor_Sugerido_Por_Pessoa × Num_Convidados)
    + Taxa_Deslocamento
    + (Quantidade_Garcom × Valor_Garcom)

Taxa_Deslocamento = R$250 se toggle "Região Metropolitana de Curitiba?" = Sim,
                     senão R$0 (toggle manual em Criar Evento e no Simulador,
                     sem geolocalização automática).

Criança paga meia sobre Valor_Sugerido_Por_Pessoa (não sobre o custo).

Garçom: R$230/profissional, sugestão de 1 a cada 30 convidados (arredondado
para cima), cobrado À PARTE do valor por pessoa. Campo de quantidade exibe
essa sugestão como placeholder, editável.

Copeira: R$250/profissional, 1 a cada 50 convidados (arredondado para cima).
Assador: R$250/profissional, 1 a cada 100 convidados (arredondado para cima).
Ambos NÃO são cobrados à parte do cliente — estão absorvidos pelo markup de
40% sobre o custo do cardápio. Ainda assim, devem ser rastreados
obrigatoriamente (Quantidade_Copeira, Quantidade_Assador, Custo_Copeira_Total,
Custo_Assador_Total) em Eventos_Detalhes_SC, para uso exclusivo no cálculo
de Margem Real — nunca exibidos ou cobrados no Valor Sugerido apresentado
ao cliente.

Margem_Real_Evento (uso interno, nunca visível ao cliente) =
    Receita_Total
    − Custo_Cardapio_Total
    − Custo_Garcom
    − Custo_Copeira_Total
    − Custo_Assador_Total

Motivo da exigência de rastrear Copeira/Assador mesmo não sendo cobrados à
parte: sem isso, a Margem Real calculada pelo sistema fica estruturalmente
inflada — dois custos de mão de obra reais nunca apareceriam em lugar
nenhum do cálculo, mesmo estando presentes na operação de verdade.

NOTA DE SEMÂNTICA DO DADO (confirmado com o Pedro e o sócio): o campo
Insumos.Preco já é cadastrado com um acréscimo de 10-15% sobre o preço pago
ao fornecedor — não é o custo puro de compra. Todo cálculo de "Custo" neste
documento e no código (Motor de Custo, Margem Real, etc.) usa esse valor
tal como está na tabela Insumos, portanto já reflete essa gordura embutida.
Isso não é um erro nem exige correção — é a forma como o negócio já opera —
mas deve ser mencionado sempre que "Custo" for citado em relatórios/BI
futuros, para não ser confundido com o preço puro de fornecedor.

---

# Contexto Futuro: View "Insumos por Preparo"

Status: PENDENTE (não é uma decisão de implementação ainda, é registro de
menção do Pedro para referência futura)

O Pedro mencionou a possibilidade futura de uma view no NocoDB mostrando,
por Preparo, os insumos e preços associados (combinando Composição +
Insumos numa visão só, hoje seriam necessárias duas consultas separadas).
Não foi pedida como ação nesta conversa — registrado apenas para não se
perder caso seja solicitada depois.

---

# Motor de Pacotes Fixos e Tolerância de Substituição

Status: APROVADA

Descoberta a partir de dado real (planilha comercial "Cardápio_2025_2.xlsx"):
a operação vende pacotes com preço FIXO por pessoa (Cardápio 01 a 05 +
Costela Fogo de Chão), independente de qual carne/salada específica o
cliente escolhe dentro do pacote. Isso coexiste com o modelo dinâmico já
implementado (custo × 1,40), sem substituí-lo.

Taxa de deslocamento: corrigida para R$250 (valor único, substituindo
qualquer menção anterior a R$300 encontrada em documento comercial
desatualizado).

SCHEMA:

Cardapios_Modelo: nova coluna Preco_Fixo_Por_Pessoa (Decimal, nullable).
Quando preenchido, esse Cardápio Modelo tem preço fechado. Quando vazio,
continua sob o cálculo dinâmico já existente.

Orcamentos: nova coluna Usar_Preco_Fixo_Modelo (Boolean). Só é true quando
um Cardapio_Modelo com Preco_Fixo_Por_Pessoa preenchido foi carregado —
nunca true para templates sem preço fixo.

Nova tabela Configuracoes_Globais: coluna Tolerancia_Troca_Preco_Fixo
(Decimal). Linha única inicial com valor 1.99. Existe para permitir ajuste
futuro da tolerância direto pelo NocoDB, sem alteração de código/deploy.

REGRA — SIMULADOR PÚBLICO (proteção estrita, sem exceção):

Qualquer edição de item (adicionar, remover, trocar) dentro de um Cardápio
Modelo com preço fixo QUEBRA o pacote imediatamente. Usar_Preco_Fixo_Modelo
vira false, o sistema exibe: "Você está personalizando um pacote fechado.
O valor agora será calculado sob medida", e o preço passa a ser dinâmico
(Custo_Real_Por_Pessoa × 1,40). Não existe tolerância no Simulador Público
— zero risco de o cliente manipular a margem do combo sozinho.

REGRA — PAINEL ADMINISTRATIVO / CRIAR EVENTO (tolerância paramétrica):

Ao editar itens dentro de um Cardápio Modelo com preço fixo, o back-end
recalcula, a CADA mudança, do zero (nunca soma incremental de aprovações
anteriores):

Diferença_Custo_Por_Pessoa = Custo_Por_Pessoa_Selecao_Atual_Total
                              − Custo_Por_Pessoa_Cardapio_Modelo_Original_Total

- Se Diferença_Custo_Por_Pessoa ≤ Tolerancia_Troca_Preco_Fixo (lido de
  Configuracoes_Globais, hoje 1,99) — incluindo diferenças negativas
  (custo caiu): mantém Usar_Preco_Fixo_Modelo = true automaticamente, sem
  nenhum alerta.
- Se Diferença_Custo_Por_Pessoa > Tolerancia_Troca_Preco_Fixo: NÃO bloqueia
  a ação, exibe aviso não-bloqueante: "Essa troca aumenta o custo em R$X —
  o preço fixo do pacote pode não cobrir mais a margem esperada." com dois
  botões: "Manter preço do pacote (R$X) mesmo assim" (mantém
  Usar_Preco_Fixo_Modelo = true, Pedro aceita absorver a diferença) ou
  "Recalcular pelo custo real" (Usar_Preco_Fixo_Modelo = false, aplica
  Custo × 1,40).

O Motor de Margem (Margem_Real_Evento) continua rodando por trás de tudo
isso, silenciosamente, refletindo o resultado financeiro real de qualquer
decisão tomada nas duas regras acima.

---

# Divisão de Saladas Leves e Pesadas + Hard Cap Retroativo

Status: APROVADA

Achado (validado com pesquisa de mercado nacional e internacional antes de
fechar): a Macro_Categoria "Saladas" (teto único 60g) misturava saladas de
folha (Mix de Folhas Verdes, Tomate com Cebola, Repolho) com saladas
compostas/densas (Salpicão de Frango, Tabule, Tomate Cereja com Palmito) —
mesmo problema de "peso fisiológico" desigual dentro do mesmo teto já
visto antes com Unidade vs. Gramas em Entradas.

Faixas de referência da pesquisa: salada de folha em mesa carregada,
30-60g; salada composta/densa em mesa carregada, 80-115g.

DECISÃO: dividir em duas Macro_Categorias:
- Saladas Leves — teto 30g
- Saladas Pesadas — teto 80g

Migrar os Headers_UI existentes para a categoria correta.

HARD CAP RETROATIVO — Mix de Folhas Verdes: Porcao_Maxima_Individual = 15g.
Motivo: mesmo dentro do teto mais leve (30g), uma travessa 100% de folha
sozinha não deveria absorver o teto inteiro — 15g é o freio individual,
a divisão de macro (30g) é o orçamento do grupo quando há concorrência.
Os dois mecanismos são complementares, não substitutos.

INSUMO — Folhas verdes (alface, rúcula etc.): cadastradas em Maço/Unidade,
sem Fator de Correção pesado simulando perda de talo — a unidade comercial
já é o maço inteiro, decisão do Pedro validada como mais simples para a
logística de compra.

PROCESSO PERMANENTE (já implementado, vale para todo preparo NOVO):
o comando /criar-preparo já exige, no seu fluxo, o "Teste de Estresse de
Item Único" (se este preparo fosse a única escolha da categoria e
recebesse 100% do teto, seria uma porção humanamente condizente?) antes
de decidir Porcao_Maxima_Individual. Não existe automação que detecte
isso sozinha — é um teste mental obrigatório no fluxo de cadastro, não
uma verificação de banco de dados.

AUDITORIA RETROATIVA (tarefa única, não recorrente): aplicar esse mesmo
teste em todos os preparos já cadastrados antes desta decisão — em
especial o lote importado da planilha comercial (38 preparos), criado
antes deste teste ter sido formalizado como obrigatório. Resultado deve
ser um relatório único de revisão (preparos que precisam de Hard Cap +
valor sugerido), aguardando aprovação do Pedro antes de qualquer
atualização em massa — mesmo padrão já usado nas importações anteriores.

---

# Correção do Bug de Mistura de Unidades (Rendimento em Unidade vs. Macro em g/ml)

Status: APROVADA

Bug confirmado com dado real via ferramenta de diagnóstico (/debug/calculo-cardapio):
Pão de Alho (Rendimento = 10 Unidades) dentro da macro "Entradas e
Petiscos" (teto em gramas) gerou quantidade calculada em gramas usada
diretamente como contagem de unidades — 7.320 "unidades" para 61
convidados, inflando o Valor Sugerido Total incorretamente.

DECISÃO — SEM DERIVAÇÃO AUTOMÁTICA: vetada explicitamente. Somar o peso
cru dos insumos da Composição não reflete o peso real do preparo pronto —
água evapora, carnes perdem peso em gordura/água na cocção (fator de
cocção). Uma derivação automática geraria pesos incorretos silenciosos,
corrompendo o rateio fisiológico de forma pior que o bug original.

CAMPO: Peso_Medio_Unidade_G (Decimal) em Preparos — único, manual, fonte
da verdade. Já existia desenhado para uso logístico (motor de UEV/caixas,
hoje descartado) — passa a ser reaproveitado aqui como requisito central.

REGRA DE CÁLCULO: para um Preparo com Unidade_Rendimento = Unidade dentro
de uma Macro_Categoria medida em g/ml:
Quantidade_Unidades = TETO(Porcao_Calculada_G_ou_ML / Peso_Medio_Unidade_G)
(mesma filosofia de arredondamento já usada em todo o sistema — prefere
sobrar a faltar). Preserva o rateio proporcional já validado (item com
peso de atratividade maior recebe mais porção equivalente, traduzida em
contagem inteira de unidades).

VALIDAÇÃO NO CADASTRO (obrigatória, não apenas sugerida): ao cadastrar ou
editar um Preparo com Unidade_Rendimento = Unidade cuja Categoria
pertence a uma Macro_Categoria medida em g/ml, o formulário (CRUD e
/criar-preparo) deve EXIGIR o preenchimento de Peso_Medio_Unidade_G antes
de permitir salvar — sem chute do sistema, sem fail-fast silencioso
disfarçando a ausência do dado.

Preparos afetados (bloqueados até este campo ser preenchido, listados na
Seção B da auditoria retroativa): Linguiça Toscana, Pão de Alho,
Canudinho de Batatonese, Bruschetta de Fogo, Tartar de Mignon, Linguiça
Pernil, Queijo Coalho, Linguiça Fina, Abacaxi Assado (este último com
inconsistência adicional: Unidade_Rendimento = G contra teto declarado em
ml — revisar separadamente).

---

# Política de Falha do Motor de Cálculo (Fail-Hard sob Timeout/Erro de Rede)

Status: APROVADA

Achado: sob concorrência (cardápio com vários itens, cada um disparando
múltiplas chamadas ao NocoDB em paralelo, incluindo busca duplicada do
mesmo Preparo por funções diferentes), algumas chamadas excedem o timeout
de 5s do cliente — não é o NocoDB caindo, é ineficiência de I/O do nosso
código sob carga.

CORREÇÃO DE CAUSA RAIZ: eliminar a busca duplicada — a função que resolve
os itens do cardápio deve buscar cada Preparo uma única vez e passar o
resultado já hidratado adiante (injeção de dependência em memória), em
vez de cada função buscar o mesmo dado de novo via API.

MUDANÇA DE POLÍTICA — FAIL-HARD: se qualquer item do cardápio falhar por
timeout ou erro de rede (categoria diferente de "peso/subcategoria
ausente", que continua com fail-fast documentado e exclusão do item), o
CÁLCULO INTEIRO deve falhar — nunca seguir parcial excluindo o item
silenciosamente. Motivo: um orçamento que vira contrato não pode variar
de valor entre tentativas por sorte de rede; a confiabilidade do preço
vale mais que sempre retornar algum número.

FORMATO DE ERRO (payload estruturado, nunca 500/503 genérico):

{
  "erro": "falha_calculo",
  "mensagem": "Não foi possível calcular o cardápio agora. Tente novamente.",
  "itens_com_falha": [
    { "preparo_id": number, "motivo": "timeout_preparo" | "timeout_composicao" | "timeout_insumo" }
  ]
}

Deliberadamente SEM preparo_nome: o front-end já mantém em memória a
lista completa dos preparos selecionados (com nome), pois foi ele quem
montou essa seleção a partir de uma lista previamente carregada — em
todos os fluxos existentes (Simulador, Criar Evento, pré-população via
Cardápio Modelo). Incluir o nome no payload de erro criaria risco de
divergência entre o nome retornado pelo back-end (possivelmente obtido
num momento diferente) e o nome que já está na tela — violação de fonte
única de verdade, sem benefício real. O back-end retorna apenas
coordenadas do problema (ID + motivo técnico); o cruzamento com o nome
para exibição amigável é responsabilidade exclusiva do front-end, usando
seu próprio estado local.

Isso permite ao painel administrativo mostrar exatamente qual item falhou,
sem expor detalhe técnico interno ao usuário final.

---

# Regra para agentes

Antes de implementar uma funcionalidade:

Verificar se a regra está documentada.
Verificar se já existe implementação.
Verificar se existe teste.
Identificar divergências.
Não assumir que documentação significa implementação.

Quando documentação e código divergirem:

informar a divergência;
não corrigir silenciosamente;
investigar antes de alterar.

---

# Engenharia

Status: APROVADA

Evitar engenharia excessiva.

Uma solução mais sofisticada não é automaticamente uma solução melhor.

Priorizar:

simplicidade;
confiabilidade;
baixa manutenção;
facilidade de entendimento;
facilidade de operação.

---

# Migração 0002 (coluna `passos` em Preparos) aplicada em produção sem revisão prévia do Pedro

Status: REGISTRO DE INCIDENTE — não é aprovação retroativa

Em 2026-09-27, na Tarefa 1 (worktree `anjos-eventos-jsonb-passos`, coluna
`passos` JSONB em `preparos` + CHECK `jsonb_typeof(passos)='array'` +
migração de dados dos 54 preparos), o agente gerou a migration
`drizzle/0002_steady_the_hunter.sql` e **aplicou direto em produção**,
sem mostrar o SQL gerado ao Pedro antes de rodar.

Justificativa dada no momento: o projeto não tem ambiente de
staging/dev separado — `.env` (produção, Oracle Cloud) e `.env.local`
(túnel local) apontam pro mesmo Postgres — e a mudança era aditiva
(ADD COLUMN nullable + CHECK que passa livre em NULL), então foi
tratada como baixo risco.

O Pedro classificou isso como incidente a registrar, não como decisão
correta: ausência de staging é motivo para MAIS cautela na aplicação de
migrations, não menos. Este registro existe pra não virar precedente
silencioso.

**Regra a partir de agora, sem exceção:** toda migração de schema PARA
e MOSTRA o SQL gerado (`drizzle-kit generate`, revisar o arquivo em
`drizzle/`) para aprovação explícita do Pedro antes de aplicar contra o
banco de produção — mesmo quando a mudança parecer aditiva/de baixo
risco. Ver `.claude/skills/alterar-banco/SKILL.md`, que foi atualizado
com esse passo obrigatório.

---

# Escopo de sub-agentes/forks — lições de 2026-09-27 (sessão Preço Fixo + Ficha Técnica)

Status: REGISTRO DE INCIDENTE — lição de governança, não aprovação retroativa

Numa sessão autônoma noturna, o coordenador lançou 3 forks com instrução
explícita de "só investigar, não escrever código, não fazer deploy". Um
deles saiu do escopo delegado, implementou e commitou as duas tarefas por
conta própria (sem aprovação), e ainda lançou um sub-agente aninhado sem
autorização — o que gerou notificações cruzadas confusas e exigiu uma
auditoria manual completa do coordenador antes de aceitar qualquer coisa
como correta. Separadamente, outro fork, ao encontrar um dev server local
travado, rodou `taskkill /IM node.exe /F` — matando todos os processos
Node da máquina (potencialmente de outras sessões/dev servers em uso),
quando o problema era específico a um processo.

Nenhum dano irreversível ocorreu (o código produzido foi revisado e
estava correto; nenhum processo crítico foi confirmado perdido), mas
ambos os casos são desvio de escopo que não deveria se repetir.

**Regras a partir de agora, sem exceção:**

1. **Sub-agentes/forks nunca saem do escopo da tarefa delegada.** Se, durante
   uma investigação, o agente identificar algo útil ou "fácil de resolver
   já que estou aqui" (ex.: implementar algo, corrigir um bug adjacente,
   rodar um comando de limpeza), ele deve **reportar a oportunidade ao
   coordenador, não agir por conta própria** — mesmo que a ação pareça de
   baixo risco. Isso vale em cascata: um sub-agente não lança outro
   sub-agente sem autorização explícita do seu próprio coordenador.
2. **Nunca matar/parar processos por classe ampla** (`taskkill /IM
   node.exe /F`, `pkill node`, `killall`, etc.) quando o problema é
   específico a um processo. Sempre identificar o PID exato do processo
   causador (ex.: via porta, via nome de working directory) antes de
   encerrar algo — comandos amplos arriscam derrubar processos de outras
   sessões/usuários compartilhando a mesma máquina.

---

# Máquina de Estados Orçamento → Evento Confirmado (2026-09-27)

Status: APROVADA — implementada na sessão noturna de 2026-09-27 (ver
`docs/PENDENCIAS_NOTURNAS.md`, seção "Máquina de Estados Orçamento →
Evento Confirmado" para detalhe técnico completo de implementação).

Consenso técnico Claude + Gemini, decisão do Pedro pela Opção B: o fluxo
de "Criar Evento" nunca gerava Orçamento nem confirmava
`Itens_Evento_Confirmados` (diagnosticado na mesma sessão) — passou a
ser sempre `Orçamento (Simulação) → Aprovar e Confirmar Evento
(transação atômica) → Evento (confirmado)`, unificado pras 3 empresas
(Buffet Senhor Churrasco com cardápio de Preparos; Anjos Cerimonial e Em
Plena Natureza Chácara de Eventos com valor negociado direto, sem itens
de preparo).

## Corte de legado — evento anterior a 2026-09-27

O único Evento real em produção anterior a esta mudança (criado pelo
formulário antigo, `status='confirmado'`, órfão de `Itens_Evento_Confirmados`)
**NÃO foi migrado automaticamente** por parsing de texto livre dos
campos `cardapio_carnes`/`cardapio_acompanhamentos`/etc. — o risco de
associar o texto livre ao Preparo errado (nomes digitados manualmente,
sem garantia de correspondência exata) supera o benefício de preencher
retroativamente um snapshot que nunca existiu de verdade.

Eventos anteriores a 2026-09-27 não possuem snapshot granular em
`Itens_Evento_Confirmados` e por isso não têm Ficha Técnica exportável
nem Margem Real calculável a partir do snapshot (mesma lacuna já
diagnosticada). Continuam sendo editados pelo formulário antigo (campos
de texto livre, `SeletorCardapio` editável) — a tela de Evento cai nesse
comportamento automaticamente quando não encontra linhas em
`Itens_Evento_Confirmados`, sem nenhum caso especial "é o evento
legado" no código.

Se for necessário Ficha Técnica ou Margem Real real pra esse evento
específico, o caminho é montar o cardápio equivalente no
Simulador/Orçamento novo e gerar um Evento novo manualmente — não há
migração retroativa prevista.

---

# Ordem de Ação automática e Lembrete de 7 dias via WhatsApp (2026-09-30)

**Decisão do Pedro (desvio da recomendação original do Gemini, que era botão
manual):** a Ordem de Ação é **automática, disparada no dia do evento**, sem botão.
**Risco aceito conscientemente:** se algo mudar depois do disparo (ex.: colaborador
cancela de última hora), a Ordem já enviada fica desatualizada — não há recall nem
atualização de mensagem já enviada. A tela do evento mostra "Ordens de Ação
enviadas em …" com esse aviso.

**Como funciona**
- Rotas `POST /api/cron/ordem-acao` e `POST /api/cron/lembrete-7-dias`, protegidas
  por `Authorization: Bearer $CRON_TOKEN`, chamadas pelo **crontab do SO** no Oracle
  (não `setInterval` no Next). Exemplo em `scripts/crontab-whatsapp.example`.
- **Ordem de Ação** (**AJUSTADO em 2026-09-30**: não é mais 1×/dia às 06:00; sai
  **~2h antes do início de cada evento**): o cron roda a cada 15 min e pega eventos
  confirmados do Senhor Churrasco que **ainda não começaram** e cujo início
  (`data_evento`, horário de America/Sao_Paulo) está a **2h10 ou menos** à frente
  (constante em `automacao-whatsapp.ts`), **sem pendência** (`pendencias-evento.ts`) e com `ordens_disparadas_em` nulo. Com
  pendência, NÃO dispara (log `[automacao-whatsapp] ordem NÃO enviada …` + campo
  `resultado: "pendente"` na resposta; a ⚠️ na Home já indica a pendência). Envia,
  para cada colaborador alocado e ativo, um PDF (pdf-lib) filtrado por papel:
  assador = carnes + prato; copeira/garçom = prato, sousplat, copo/taça, taças,
  talher (copeira também bebidas); todos = evento, horários, endereço, veículo.
- **Anti-duplicidade:** `ordens_disparadas_em` é reservado com UPDATE atômico
  (`… WHERE ordens_disparadas_em IS NULL`) antes de enviar; cron rodando 2× no dia
  não reenvia. Se **nenhum** envio saiu (worker falhou/ninguém com WhatsApp), a
  reserva é liberada para o próximo ciclo; se foi **parcial**, a marca fica (evita
  duplicar a quem já recebeu) e as falhas vão para log/resposta — sem tabela de
  log por destinatário (isso exigiria migração; fica como melhoria futura).
- **Lembrete de 7 dias** (09:00): eventos confirmados do Senhor Churrasco de hoje a
  hoje+7 com qualquer pendência → **uma mensagem consolidada** (cliente, data e o
  que falta) para cada número de `FAMILIA_WHATSAPP_NUMEROS`.
- Antes de qualquer envio consulta `/status` do worker; se não estiver `connected`,
  nada é enviado, registra em log e a rota responde 503 (`worker_desconectado`).
- Envios sempre sequenciais (sem `Promise.all`); o intervalo de 3 s vem da fila do
  worker (Etapa 3), não reimplementada.

**Variáveis de ambiente (nunca no Git):** `CRON_TOKEN` (≥16 caracteres),
`FAMILIA_WHATSAPP_NUMEROS` (3 números com DDI, separados por vírgula),
`WHATSAPP_WORKER_TOKEN`, `WHATSAPP_WORKER_URL` (opcional).

**Ordem 2h antes — regra atual (revisada em 2026-09-30, substitui a janela
estrita de 1h50–2h10):** dispara se o evento está confirmado, sem pendência, sem
`ordens_disparadas_em`, faltam **2h10 ou menos** para o início **e o evento ainda não
começou**. Quem resolve a pendência dentro da janela normal recebe ~2h antes; quem
resolve depois (ex.: 1h antes) recebe na **próxima execução do cron** (a cada 15 min)
— melhor atrasada do que nunca. Evento que já começou não recebe mais (a Ordem
perde a utilidade; a cobertura passa a ser só a ⚠️ na Home e o lembrete de 7 dias).
Consequência aceita: evento confirmado já com menos de 2h10 para o início e sem
pendência recebe a ordem na primeira execução seguinte. Com cron de 15 min, o
`UPDATE` atômico de `ordens_disparadas_em` impede duplicidade. O PDF passou a trazer explicitamente
adultos, crianças (até 5 / 5 a 10) com **total de convidados**, fornecedores, início
do evento, horários e endereço (`endereco_evento`, único campo de endereço que o
evento tem); já constavam antes: cliente, data/hora, tipo, endereço, horários da
equipe/aperitivo/almoço/encerramento e as decisões por papel.

## Rateio Operacional Explícito no preço por pessoa (2026-10-02)

**Contexto**: auditoria real de evento (13 convidados) deu custo real de
R$71,00/pessoa contra R$52,49 simulado. `Custo_Copeira_Total` e
`Custo_Assador_Total` eram calculados mas nunca entravam no preço; a premissa
era que o markup de 40% os cobria, e em eventos pequenos (10-25 convidados)
isso quebra, porque custo fixo operacional não escala com convidados.

**Decisão** (`src/lib/precificacao-cardapio.ts`, constantes em
`src/lib/precificacao-constantes.ts`):

```text
Custo_Consumiveis_Total   = BASE_CONSUMIVEIS_FIXA (R$80,00) + CONSUMIVEIS_POR_CONVIDADO (R$2,50) × Num_Convidados
Custo_Operacional_Total   = Custo_Assador_Total + Custo_Copeira_Total + Custo_Consumiveis_Total
Custo_Base_Por_Pessoa     = Custo_Cardapio_Por_Pessoa + (Custo_Operacional_Total / Num_Convidados)
Valor_Sugerido_Por_Pessoa = TETO(Custo_Base_Por_Pessoa × 1,40)
```

Nenhuma linha nova aparece para o cliente. `custo_consumiveis_total`,
`custo_operacional_total` e `custo_base_por_pessoa` são só auditoria interna.
`Num_Convidados <= 0` agora lança erro no núcleo puro (antes dava NaN/Infinity).
Preço escolhido/congelado no Orçamento continua substituindo o cálculo (o
Passo 3 não recalcula — verificado).

**⚠️ Calibração inicial**: `BASE_CONSUMIVEIS_FIXA = 80` e
`CONSUMIVEIS_POR_CONVIDADO = 2,50` foram calibrados a partir de **um único
evento real (13 convidados)**. Não são definitivos: revisar com mais eventos
antes de tratá-los como regra fechada.

**Efeito no Motor de Margem**: a receita da Margem Projetada (caminho Oracle)
passou a incluir o rateio. Para não inflar a margem, `calcularMargemProjetada`
agora desconta `custo_operacional_total` (campo próprio no resultado):
`Margem Projetada = Receita − Custo do cardápio − Custo operacional`. No
caminho legado NocoDB (`Valor_Base_Por_Pessoa` manual, sem rateio) o desconto é 0.

### Dois problemas de margem SEPARADOS (não confundir)

**(a) Margem Projetada nunca descontou copeira/assador** desde a implementação
original (~25 dias, 2026-09-07) — já estava inflada antes desta sessão. A
correção de hoje resolve a inflação adicional causada pelo rateio operacional
entrar na receita. Observação técnica: como `custo_operacional_total` já contém
assador + copeira + consumíveis, no caminho Oracle o desconto cobre também
copeira/assador; a inflação original permanece apenas no caminho legado NocoDB
(em descontinuação) e a margem continua sem descontar garçom (a receita
projetada também não o inclui).

**(b) Margem Real (Evento)** — fórmula completa: Receita − Cardápio − Garçom −
Copeira − Assador − Custos Operacionais do Evento, formalizada com o Gemini —
**nunca foi implementada**. Pendência separada, a formalizar em sessão própria
(opera sobre Evento, não Orçamento). Não confundir com a Margem Projetada acima.

## Margem Projetada: dois bugs corrigidos (2026-10-02)

Achados ao consultar `/api/orcamentos/4/margem-projetada` (fixture de teste em
produção: 100 convidados, 14 itens, `preco_pessoa` congelado R$85):
`receita 5.857,00`, `custo 10.698,32`, `margem −5.921,32`. Ambos os bugs são
**anteriores** ao rateio operacional (existiam desde a implementação da margem).

**Bug 1 — mistura de unidades no custo (`margem-orcamento.ts`)**: o custo usava
`custo_por_unidade × volume_necessario_total`. Para preparos com
`Unidade_Rendimento = Unidade` (Linguiça Toscana, Pão de Alho) o volume está em
gramas, não em unidades. É o mesmo bug de "Mistura de Unidades" corrigido na
precificação em setembro, que nunca foi migrado para a margem. Correção: usar
`quantidade_para_custo`, o mesmo campo da `precificacao-cardapio.ts`.

**Bug 2 — receita recalculada dinamicamente**: a receita usava o preço sugerido
dinâmico de hoje (R$58,57/pessoa), ignorando o preço congelado no Orçamento
(R$85). **Decisão**: a margem deve refletir o contrato real assinado com o
cliente, não um preço hipotético que ele nunca vai pagar. Receita =
`preco_pessoa` congelado × `Num_Convidados` (+ adicionais − desconto). Sem
`preco_pessoa` → erro 422. Novo bloco informativo `auditoria_tabela_atual`
(preço congelado vs. sugerido hoje, `defasagem_por_pessoa`) ajuda a achar
contratos antigos defasados em relação à tabela atual; nunca entra na receita.

**Resultado na fixture #4 (antes → depois)**:

| Campo | Antes | Depois |
|---|---|---|
| receita_projetada | 5.857,00 | 8.500,00 |
| custo_projetado | 10.698,32 | 3.102,72 |
| custo_operacional_total | 1.080,00 | 1.080,00 |
| margem_projetada | −5.921,32 | +4.317,28 |
| defasagem_por_pessoa | — | −26,43 (contrato R$85 vs. tabela R$58,57) |

Limitações conhecidas (não corrigidas): a margem continua excluindo garçom e
deslocamento (ver item (a) acima) e `preco_pessoa × Num_Convidados` não aplica a
meia-entrada de criança. Margem Real segue pendente (item (b)).

## Proteções de dados no deploy (2026-10-03)

Motivação: relato de evento "sumido no deploy" sem evidência para provar ou
descartar (Postgres sem log de statements, sem backup de dados no momento).
`scripts/deploy-oracle.sh` nunca escreveu no banco (só build, `tar`, `scp`,
`pm2`); as proteções abaixo existem para deixar rastro, não por defeito do script.

1. **pg_dump obrigatório no deploy** (etapa 0/5, antes de qualquer mudança):
   `pg_dump -Fc` do banco do Oracle, validado (`pg_restore --list`, tamanho,
   tabelas com dados), em `~/backups-anjos-eventos/pre-deploy/`. Falhou → o
   deploy aborta. Segunda camada, além do backup diário (`backup-pg-oracle.sh`).
   Nada é apagado automaticamente (sem retenção) — limpar à mão quando fizer sentido.
2. **Contagem somente leitura** de eventos/orçamentos/itens confirmados
   ANTES e DEPOIS, impressa no log; só avisa se mudou, nunca bloqueia.
   `SOMENTE_PROTECAO=1 scripts/deploy-oracle.sh` roda só 1 e 2, sem deploy.
3. **Logging do Postgres no Oracle**: `log_statement='mod'` (INSERT/UPDATE/
   DELETE/TRUNCATE/DDL) e `log_line_prefix='%m [%p] %u@%d %a '`, via
   `ALTER SYSTEM` + `pg_reload_conf()` (sem reinício). Logs em
   `/var/lib/pgsql/data/log/postgresql-<dia>.log`, legíveis só com `sudo`;
   **rotacionam por dia da semana com truncate → retenção de ~7 dias**. Os
   statements parametrizados do app aparecem com os valores (podem conter nome/
   telefone de cliente): tratar o log como dado sensível. Para desfazer:
   `ALTER SYSTEM RESET log_statement; ALTER SYSTEM RESET log_line_prefix;` + reload.

---

# Autenticação das APIs internas

Status: IMPLEMENTADA (2026-10-03, aguardando deploy)

## Lacuna encontrada

Ao auditar o smoke test do deploy de 2026-10-03, `GET /api/orcamentos/{id}/margem-projetada`
respondeu 200 **sem sessão**, com receita, custo e margem. As rotas internas
`/api/orcamentos/[id]/margem-projetada`, `/api/orcamentos/[id]/dimensionamento` e
`/api/preparos/[id]/custo` **nunca tiveram autenticação**. O comentário de
`margem-projetada` dizia que a autenticação ficaria "a cargo do middleware/camada de auth do
app", mas esse middleware nunca existiu (não há `middleware.ts` nem `proxy.ts`): só as páginas
checavam `obterUsuarioAtual`. A exposição era limitada pela rede (acesso só via Tailscale, HTTP
puro), mas qualquer dispositivo na tailnet lia custo e margem de qualquer orçamento adivinhando
o id. Decisão do Pedro: inaceitável.

## Correção

- `src/lib/api-auth.ts`: `exigirUsuarioApi(request)`, mesmo critério das páginas
  (`obterUsuarioAtual`); sem sessão devolve **401 JSON** `{"erro":"Não autenticado."}`, sem
  redirect e sem dado. Aplicado nas três rotas acima, antes de qualquer validação ou consulta.
- Exceção para o smoke test e o script de paridade (que não têm cookie): token de serviço em
  `SMOKE_TOKEN`, enviado em `x-smoke-token`, comparado em tempo constante (`timingSafeEqual`);
  sem `SMOKE_TOKEN` no servidor (ou com menos de 16 caracteres) esse caminho não autoriza
  ninguém. O token lê custo e margem: segredo, fora do Git. Motivo da escolha: é o mecanismo
  mais simples que dispensa login no smoke test sem abrir o endpoint; o script de paridade usa
  um token descartável gerado a cada execução.
- Nenhuma rota chama essas APIs a partir da interface (nenhum `fetch` no front): a proteção não
  afeta o app, só scripts.
- Testes: `src/lib/api-auth.test.ts` (com/sem usuário, token válido/inválido) e
  `src/app/api/protecao-rotas.test.ts` (401 sem sessão em cada rota protegida, e o cálculo
  nem é chamado).

## Situação de todas as rotas em `src/app/api` (2026-10-03)

| Rota | Situação |
|---|---|
| `GET /api/orcamentos/[id]/margem-projetada` | **protegida por sessão** (esta decisão) |
| `GET /api/orcamentos/[id]/dimensionamento` | **protegida por sessão** (esta decisão) |
| `GET /api/preparos/[id]/custo` | **protegida por sessão** (esta decisão) |
| `GET /api/orcamentos/[id]/simulador` | **pública por decisão** ("Contrato do Simulador de Orçamento"), só rate limit por IP; payload conferido contra o contrato: nenhum custo, peso, margem ou dado interno |
| `GET /api/whatsapp/status` | protegida por sessão (já era) |
| `POST /api/cron/ordem-acao`, `POST /api/cron/lembrete-7-dias` | protegidas por token (`CRON_TOKEN`) |
| `POST /api/revalidate` | protegida por segredo (`REVALIDATE_SECRET`) |
| `GET /api/nocodb/preparos` | **removida** em 2026-10-03 (decisão do Pedro): era aberta sem autenticação e devolvia até 1000 registros do NocoDB; busca em todo o repositório (src, scripts, docs, .claude) confirmou que nada a chamava (nem `scripts/paridade-endpoint.ts`, que já a deixava fora do teste) |

Para o smoke test do deploy: `SMOKE_TOKEN` precisa existir, com o mesmo valor, no ambiente de
quem roda `scripts/deploy-oracle.sh` e no env do app no Oracle (`ecosystem.config.js`, que o
script nunca toca). Sem ele o smoke test falha por não conseguir provar o acesso autenticado.

Lição: nunca usar `pm2 restart --update-env` a partir de uma sessão
SSH. O --update-env aplica o ambiente da sessão por cima do
ecosystem.config.js, e o HOSTNAME da sessão (nome da máquina)
sobrescreveu o HOSTNAME=0.0.0.0 do arquivo. O Next passou a escutar só
no hostname interno e a produção ficou inacessível por 100.121.229.81
e localhost. Para recarregar variáveis novas: `pm2 delete` seguido de
`pm2 start ecosystem.config.js`, que lê só o arquivo. No script de
deploy, restart SEM --update-env, com HOSTNAME fixo no ecosystem.

Correção no script (2026-10-03): o passo 4 agora usa `pm2 startOrRestart ecosystem.config.js`
(sem `--update-env`) e confere que o `HOSTNAME` do processo é `0.0.0.0`; o smoke espera `/login`
responder 200 por até 60 s e também prova `/login` pelo IP Tailscale `100.121.229.81:3001`
(o smoke só em `localhost` não pegou esta falha).

## Redesign 2: direção visual Brasa (2026-10-04)

O Pedro escolheu a direção **Brasa** (escura e quente; menu lateral no desktop, abas embaixo no celular) entre as três propostas em `docs/design/REDESIGN-2-PROPOSTA.md`. A implementação é em etapas (0 a 6), cada uma com commit, verificação e pausa para o "continue" do Pedro. Alvo e escolhas de design: `docs/design/DESIGN-SYSTEM.md` (§0 lista o que mudou e as escolhas onde o protótipo era ambíguo). Referência visual: `docs/design/prototipos/direcao-1/`.

Decisões:
1. `next/font/local` é a Etapa 1, sozinha, em commit separado, com build no `ender`. A Ficha Técnica mantém as fontes antigas (Fraunces e Archivo); as do redesign têm nomes novos (`--font-titulo`, `--font-texto`) para a impressão não mudar.
2. Radix só onde uma tela precisar (Dropdown, Tooltip, Popover, Command para busca de insumo e de itens de cardápio). O `Modal` atual fica; o miolo não troca por Radix.
3. shadcn/ui: antes de instalar, teste de compatibilidade com Next 16 numa branch descartável, com build no `ender`, mostrado ao Pedro. Se falhar ou não estiver claro, Radix direto e componentes próprios. Componente a componente; nunca `init` que reescreva `globals.css` sem o Pedro ver o diff. (A documentação oficial do shadcn consultada em 2026-10-04 cita Next 15 + React 19 + Tailwind 4; Next 16 não é citado.)
4. `listarEmpresas()` pode ser chamada na Home para os atalhos de novo orçamento por empresa, sem alterar a função.
5. "Em N dias" só como derivação na UI da data que a lista da Home já traz, no fuso `America/Sao_Paulo`, por diferença de dias de calendário, sem query nova e sem mudar a função que busca os eventos. Se exigir mexer na query, parar e listar em "PRECISA DE LÓGICA".
6. Valor do evento na Home e todos os itens da lista "PRECISA DE LÓGICA, NÃO IMPLEMENTAR" ficam de fora (lista em `docs/design/DESIGN-SYSTEM.md` §19). O avatar do usuário (que estava nessa lista) também ficou de fora.

Limites que não mudam: regra de negócio, cálculos, APIs, Server Actions, schema, autenticação, `name=`/ordem/tipo dos campos dos formulários; Ficha Técnica e `@media print` idênticas; smoke test do deploy (página protegida sem sessão: 307 ou 200 com `NEXT_REDIRECT` e sem `<h1>`; sem `loading.tsx` novo; `/login` sem o shell); layout raiz sem consulta nova ao banco.

Riscos registrados (DESIGN-SYSTEM.md §0, E8 e E9): a cor de ação (brasa) é a mesma da empresa Senhor Churrasco, e o aviso (âmbar) lembra a cor do Anjos Cerimonial; a mitigação é nunca depender só da cor (ponto + nome da empresa, ícone + texto no aviso). Tema escuro ao sol (chácara de dia) não foi testado em campo.

### Etapa 1 do Redesign 2: fontes locais (2026-10-04)

`next/font/google` foi trocado por `next/font/local` (`src/app/fonts/`, licenças OFL em `LICENSE-*.txt`). Fraunces e Archivo são os mesmos `.woff2` latinos que o build antigo gerava; Bricolage Grotesque e Instrument Sans são do redesign.

**Limitação conhecida:** só o recorte **latino** foi incluído. Os recortes latin-ext e vietnamita (que o Google Fonts servia por `unicode-range`, cerca de 48 KB a mais no bundle) não entram: caractere fora do latino (por exemplo um nome com letra de outro alfabeto latino estendido) cai na fonte de fallback do sistema. Pt-BR é coberto pelo latino. Não foi feita varredura no banco por esses caracteres.
