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

Status: PENDENTE

Decisão tomada em discussão de consenso técnico (Claude + Gemini), nunca
formalizada aqui até agora — gap de processo identificado e corrigido.

Direção acordada: cache em memória no servidor Node.js, invalidado via
revalidação sob demanda (revalidateTag do Next.js), acionado por webhook
nativo do NocoDB configurado para chamar uma rota /api/revalidate protegida
por um segredo compartilhado (header ou query param), nunca uma rota aberta
sem autenticação.

Implementação atual: sem cache, leitura direta a cada cálculo — aceitável
para o volume de uso atual (tabelas de 5 e 9 linhas). Cache é otimização de
performance futura, não bloqueante.

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
