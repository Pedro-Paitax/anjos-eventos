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

Status: APROVADA

PostgreSQL é o banco de dados central.

NocoDB funciona como interface administrativa sobre o PostgreSQL.

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

Isso torna obsoletas as pendências anteriores de capacidade das Kombis e de nomenclatura de veículo — ambas removidas junto com a funcionalidade.

PENDÊNCIA DE EXECUÇÃO (encontrada em auditoria posterior): o campo Veiculo
ainda existe no schema de Eventos e/ou no formulário — a decisão foi tomada
mas a ação decorrente não foi 100% aplicada. Precisa ser removida.

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

Cache/invalidação (Hierarquia_Proteina, Macro_Categorias): IMPLEMENTADA —
ver seção "Cache de Hierarquia_Proteina / Macro_Categorias" abaixo.

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

Status: PENDENTE (parcialmente decidido)

Fluxo normal do produto: exclusão de orçamento é sempre SOFT DELETE (Status = Recusado). Preserva histórico de simulações para análise futura. Hard delete não deve existir como opção normal de uso.

Ferramenta de manutenção (uso raro, ex: LGPD, limpeza de teste): hard delete físico deve usar integridade referencial no nível do banco (ON DELETE CASCADE), nunca deleção sequencial via API sem transação (risco de corromper dados em caso de falha de rede no meio do processo).

PENDENTE: verificar se o NocoDB expõe toggle nativo de cascade delete na configuração do campo Link to Another Record. Se sim, usar essa opção. Se não, aplicar CASCADE via SQL direto no Postgres é aceitável, mas deve ser registrado como RISCO NÍVEL 1: qualquer edição futura da relação pela interface do NocoDB exige revalidação manual dessa constraint, pois o NocoDB pode recriar a estrutura interna e descartar a regra silenciosamente.

---

# Garçom — não vamos decidir isso ainda

Status: PENDENTE

A auditoria encontrou uma questão conceitual:

valorSugerido
    ↓
garçom entra no valor sugerido ao cliente

documentação financeira
    ↓
salário do garçom é custo operacional

Isso não necessariamente é uma contradição.

Pode perfeitamente existir:

Preço cobrado do cliente
        ↓
inclui serviço de garçom
        ↓
Receita

e

Custo real do garçom
        ↓
Custos_Operacionais_Evento
        ↓
Custo

Ou seja, o mesmo serviço pode gerar receita e custo, que é exatamente o que normalmente queremos enxergar na margem.

Então não altere nada por enquanto.

---

# Processo de Governança de Decisões

Status: APROVADA

Nenhuma mudança de schema ou regra de negócio é implementada sem debate prévio de consenso técnico (formato Contexto / Decisão / Consequência, estilo ADR) antes de ser registrada aqui como APROVADA.

---

# Cache de Hierarquia_Proteina / Macro_Categorias

Status: IMPLEMENTADA

Decisão original tomada em discussão de consenso técnico (Claude + Gemini):
cache em memória no servidor Node.js, invalidado via revalidação sob demanda
(revalidateTag do Next.js), acionado por webhook nativo do NocoDB configurado
para chamar uma rota /api/revalidate protegida por um segredo compartilhado
(header ou query param), nunca uma rota aberta sem autenticação.

## Implementação

- `src/lib/hierarquia-proteina.ts`: leitura da tabela Hierarquia_Proteina
  cacheada via `unstable_cache` do Next.js, tag `hierarquia-proteina`
  (constante `TAG_HIERARQUIA_PROTEINA` em `src/lib/cache-tags.ts`).
- `src/lib/dimensionamento-cardapio.ts`: leitura de um registro de
  Macro_Categorias por id cacheada da mesma forma, tag `macro-categorias`
  (`TAG_MACRO_CATEGORIAS`).
- `POST /api/revalidate` (`src/app/api/revalidate/route.ts`): invalida uma
  ou ambas as tags. Protegida por `REVALIDATE_SECRET` (variável de
  ambiente, nunca hardcoded) — aceita o segredo no header
  `x-revalidate-secret` OU no query param `?secret=`, comparação em tempo
  constante (`crypto.timingSafeEqual`). Sem o segredo certo: `401`. Sem
  `REVALIDATE_SECRET` configurado no servidor: `500` (nunca cai pra rota
  aberta). `?tag=hierarquia-proteina` ou `?tag=macro-categorias` invalida
  só uma tag; sem o parâmetro, invalida as duas. Tag desconhecida: `400`.
- Nota técnica: o Next.js 16 passou a exigir um segundo argumento
  (`profile`) em `revalidateTag`; usamos `"max"`, valor recomendado pela
  própria mensagem de depreciação do framework para quem só quer invalidar
  a tag sob demanda (não é um "cacheLife" de verdade pros nossos
  `unstable_cache`, só satisfaz a nova assinatura preservando o
  comportamento de invalidação imediata).

## Como configurar o webhook do lado do NocoDB (passo manual do Pedro)

1. Gerar um segredo forte (ex.: `openssl rand -hex 32`) e configurar
   `REVALIDATE_SECRET` no `.env`/`.env.local` do servidor onde a aplicação
   roda (nunca commitar o valor real — `.env.example` só documenta a
   variável, vazia).
2. No NocoDB, abrir a tabela **Hierarquia_Proteina** → aba de automações/
   webhooks → criar um webhook do tipo "After Insert/Update/Delete"
   (nome exato do menu pode variar por versão do NocoDB).
3. Método: `POST`. URL: `https://<host-da-aplicacao>/api/revalidate?tag=hierarquia-proteina`.
   Adicionar o header `x-revalidate-secret: <o segredo gerado no passo 1>`
   (ou usar `&secret=<segredo>` na URL, se o NocoDB não permitir headers
   customizados na versão instalada).
4. Repetir os passos 2-3 pra tabela **Macro_Categorias**, trocando a URL
   pra `?tag=macro-categorias`.
5. Testar disparando uma edição de teste em qualquer linha da tabela e
   conferindo que a resposta do webhook (visível no log de automações do
   NocoDB) veio com status `200` e corpo `{"revalidado":["..."]}`.

Sem esse passo manual, o cache nunca é invalidado — ele só vai refletir uma
mudança feita em Hierarquia_Proteina/Macro_Categorias depois que o processo
Node.js for reiniciado. Enquanto o webhook não for configurado, isso é
equivalente ao comportamento anterior (sem cache automático), só que com um
risco a mais de dado desatualizado até o próximo deploy/restart — vale a
pena configurar o webhook logo após revisar esta entrega.

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

# Autenticação do Simulador de Orçamento (endpoint público)

Status: APROVADA

GET /api/orcamentos/:id/simulador não exige autenticação — é o primeiro
endpoint verdadeiramente público do sistema (lead anônimo no site montando
cardápio antes de virar cliente).

Proteção: apenas rate limiting por IP (30 requisições/minuto, contador em
memória no servidor). Não há chave de API, não há CORS restrito.

Motivo de não ter mais que isso: caso de uso legítimo é acesso anônimo;
qualquer token exposto no front-end público não seria segredo de verdade
(fica visível no código do site). Rate limit em memória é aceitável hoje
porque a aplicação roda numa única instância (ver docker-compose.yml) — se
isso mudar para múltiplas instâncias, o contador precisa virar algo
compartilhado (ex.: Redis), não é o caso agora.

Essa rota nunca deve expor dado de custo interno nem dado de cadastro que
não seja estritamente necessário pro cliente montar o cardápio — ver
"Contrato do Simulador de Orçamento" acima.

---

# Precificação por Cardápio Selecionado + Custo de Equipe Fixa

Status: APROVADA

Valor Sugerido nasce do custo real do cardápio escolhido (via motor de
dimensionamento + motor de custo), não mais de um preço fixo por pessoa
pré-definido. Aplica-se em duas telas com a mesma lógica de cálculo, UI
diferente: Criar Evento (Senhor Churrasco) e a página dedicada do
Simulador de Cardápio.

Fórmulas:

Valor_Sugerido_Por_Pessoa = TETO(Custo_Cardapio_Por_Pessoa × 1,40)

Valor_Sugerido_Total_Evento (o que o CLIENTE paga) =
(Valor_Sugerido_Por_Pessoa × Num_Convidados) + Taxa_Deslocamento +
(Quantidade_Garcom × Valor_Garcom)

Taxa_Deslocamento = R$250 se toggle "Região Metropolitana de Curitiba?" =
Sim, senão R$0 (toggle manual em Criar Evento e no Simulador, sem
geolocalização automática).

Criança paga meia sobre Valor_Sugerido_Por_Pessoa (não sobre o custo).

Garçom: R$230/profissional, sugestão de 1 a cada 30 convidados
(arredondado para cima), cobrado À PARTE do valor por pessoa. Campo de
quantidade exibe essa sugestão como placeholder, editável.

Copeira: R$250/profissional, 1 a cada 50 convidados (arredondado para
cima). Assador: R$250/profissional, 1 a cada 100 convidados (arredondado
para cima). Ambos NÃO são cobrados à parte do cliente — estão absorvidos
pelo markup de 40% sobre o custo do cardápio. Ainda assim, devem ser
rastreados obrigatoriamente (Quantidade_Copeira, Quantidade_Assador,
Custo_Copeira_Total, Custo_Assador_Total) em Eventos_Detalhes_SC, para uso
exclusivo no cálculo de Margem Real — nunca exibidos ou cobrados no Valor
Sugerido apresentado ao cliente.

Margem_Real_Evento (uso interno, nunca visível ao cliente) =
Receita_Total − Custo_Cardapio_Total − Custo_Garcom − Custo_Copeira_Total
− Custo_Assador_Total

Motivo da exigência de rastrear Copeira/Assador mesmo não sendo cobrados à
parte: sem isso, a Margem Real calculada pelo sistema fica estruturalmente
inflada — dois custos de mão de obra reais nunca apareceriam em lugar
nenhum do cálculo, mesmo estando presentes na operação de verdade.

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
