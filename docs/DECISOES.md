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
- Ovino: 1,3 (Origem: Estimativa Heurística — sem calibração real ainda)
- Peixe: 0,9 (Origem: Estimativa Heurística — sem calibração real ainda)

A tabela Hierarquia_Proteina deve ter uma coluna Origem_Dado (Dado Operacional / Estimativa Heurística), para não misturar fato com palpite na mesma estrutura.

Contexto da calibração: Pedro validou com o sócio que um evento típico distribui 400g de proteína como 200g Carne Vermelha + 100g Suíno + 100g Aves (proporção 2:1:1), o que corrigiu os pesos anteriores (que colocavam Suíno acima de Aves, contrariando a prática real).

---

# Cache de Hierarquia_Proteina / Macro_Categorias (motor de dimensionamento)

Status: PENDENTE

Decisão de arquitetura: quando a performance exigir, cachear em memória no
servidor Node.js o conteúdo de `Hierarquia_Proteina` e `Macro_Categorias`
(tabelas pequenas e de baixa frequência de edição), invalidando o cache sob
demanda via `revalidateTag` do Next.js, acionado por um webhook do NocoDB
disparado quando essas tabelas forem editadas.

Motivo de não implementar agora: o motor de dimensionamento ainda não foi
validado. Otimizar performance antes de confirmar que o cálculo está
correto é prematuro. Enquanto essa decisão não é implementada, o motor lê
essas tabelas direto da API do NocoDB a cada cálculo — aceitável hoje
porque são tabelas de 5 e 9 linhas e o volume de uso atual não gera
latência perceptível.

Pendências para implementar: endpoint de recebimento do webhook (com
autenticação), configuração do webhook na interface do NocoDB apontando
para esse endpoint, e a própria lógica de cache/invalidação.

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

---

# Picking List (Fase 2 — Checklist de Carregamento)

Status: APROVADA (escopo definido, implementação pendente)

O checklist do dia do evento (Buffet Senhor Churrasco) é exclusivamente uma lista de separação: o que separar e onde encontrar no estoque (ex: "Pegue 10kg de Alcatra no Freezer 2").

Não inclui dimensão de veículo/carregamento físico — isso é responsabilidade da equipe de operação, não do software (ver Motor logístico, DESCARTADA).

---

# Motor de custo

Status: DOCUMENTADO / EM IMPLEMENTAÇÃO

A fórmula oficial está documentada em:

docs/BRIEFING.MD
docs/REGRAS_NEGOCIO.md

Validação com dados reais (referência para teste automatizado):
- Vinagrete: custo total ≈ R$16,96
- Alcatra Grelhada: custo total ≈ R$64,93
- Arroz Branco com Alho Crispy: custo total ≈ R$20,07

Não afirmar que o motor já existe apenas porque a regra está documentada — confirmar contra código e teste real.

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