# Briefing Técnico Completo — Sistema Anjos Eventos (v2, pós-consenso técnico)

**Propósito deste documento:** contexto integral do projeto — negócio, arquitetura, schema de dados e regras de cálculo já fechadas. Escrito para orientar a criação de agentes/automação especializados no projeto.

---

## 1. Contexto de Negócio

Grupo de 3 empresas de eventos, operação hoje sem organização centralizada (histórico vivia "de cabeça"):

- **Buffet Senhor Churrasco** — operação de comida, fichas técnicas próprias, logística de carregamento de veículo no dia do evento.
- **Anjos Cerimonial** — cerimonial, hoje essencialmente contratos e informações.
- **Em Plena Natureza Chácara de Eventos** — espaço de eventos, também contratos e informações.

**Restrição de execução:** o responsável técnico é engenheiro de dados profissional, mas com tempo livre de desenvolvimento próximo de zero. Toda decisão de arquitetura prioriza baixo esforço de manutenção contínua sobre sofisticação.

**Stack:** Next.js (Node.js) full stack, hospedado em servidor doméstico próprio (Debian + Docker + Tailscale para acesso remoto). Banco de dados centralizado no **NocoDB** (interface sobre Postgres) — uma base só para tudo (sistema de eventos + fichas técnicas), decisão de consolidação já tomada.

Sistema batizado de **Anjos Eventos**.

---

## 2. O que o sistema faz (módulos)

1. **Agenda unificada** das 3 empresas.
2. **Simulador de Orçamento** (público, no site) — cliente/lead monta um cardápio dentro de categorias visuais (Headers_UI) e vê o preço calculado, sem acesso a custo interno.
3. **Fechamento de contrato** — quando o orçamento é aceito, vira Evento, com cópia congelada de itens, quantidades e custos (para preservar histórico mesmo se preços mudarem depois).
4. **Motor de custo de fichas técnicas** — calcula custo de produção de cada preparo a partir de insumos e composição.
5. **Motor de dimensionamento de cardápio** — calcula a porção de cada prato dentro de um teto fisiológico por categoria, distribuída proporcionalmente por "peso de atratividade" entre os pratos escolhidos (não é per capita fixo).
6. **Motor logístico (UEV/Caixas)** — estima se a carga de um evento cabe no veículo selecionado.
7. **(Fase futura) Checklist de carregamento** — só para o Buffet Senhor Churrasco, no dia do evento, cruzando cardápio confirmado + kit padrão de itens fixos + localização física + veículo de carga.

---

## 3. Schema de Dados (NocoDB) — estado final

*(toda tabela tem `Id`, `CreatedAt`, `UpdatedAt` automáticos, omitidos abaixo)*

### `Empresas`
| Coluna | Tipo |
|---|---|
| Nome | Single line text |

### `Eventos`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Empresa | Link | → Empresas |
| Cliente | Single line text | |
| Data_Evento | Date | |
| Tipo_Evento | Single line text | |
| Num_Convidados | Number | |
| Status | Single select (Orçado/Confirmado/Realizado/Cancelado) | |
| Veiculo | Single select (Master/Kombi Nova/Kombi Velha/Não se aplica) | |
| Observacoes | Long text | |
| Caminho_Contrato | Single line text | |
| Valor_Base_Por_Pessoa_Fechado | Decimal | |
| Desconto_Tipo | Single select (Percentual/Valor Fixo/Nenhum) | |
| Desconto_Valor | Decimal | |
| Valor_Total_Fechado | Decimal (armazenado — valor contratual assinado) | |

### `Evento_Itens_Adicionais` (receita extra cobrada do cliente)
| Coluna | Tipo | Vínculo |
|---|---|---|
| Evento | Link | → Eventos |
| Descricao | Single line text | |
| Valor_Cobrado | Decimal | |

### `Custos_Operacionais_Evento` (custo real, não confundir com a tabela acima)
| Coluna | Tipo | Vínculo |
|---|---|---|
| Evento | Link | → Eventos |
| Descricao | Single line text | |
| Valor | Decimal | |

### `Eventos_Detalhes_SC` (1:1 com Eventos, só quando Empresa = Senhor Churrasco)
| Coluna | Tipo |
|---|---|
| Telefone, Endereco_Evento | Single line text |
| Hora_Chegada_Equipe, Hora_Aperitivo, Hora_Almoco, Hora_Limpeza | Time |
| Adultos, Criancas_Ate_5, Criancas_5_a_10, Fornecedores | Number |
| Preco_Crianca_Meia | Decimal |
| Quantidade_Garcom, Valor_Garcom | Number / Decimal |

### `Orcamentos`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Evento | Link (opcional) | → Eventos |
| Empresa | Link | → Empresas |
| Cliente_Nome | Single line text | |
| Num_Convidados | Number | |
| Status | Single select (Simulação/Enviado/Aceito/Recusado) | |
| Valor_Base_Por_Pessoa | Decimal | |
| Desconto_Tipo | Single select | |
| Desconto_Valor | Decimal | |

### `Orcamento_Itens_Adicionais`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Orcamento | Link | → Orcamentos |
| Descricao | Single line text | |
| Valor | Decimal | |

### `Itens_Orcamento`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Orcamento | Link | → Orcamentos |
| Preparo | Link | → Preparos |

*(Decisão confirmada: quantidade/porção calculadas dinamicamente, não armazenadas. Header_UI também resolvido dinamicamente via Preparo a cada cálculo — não é gravado na linha. Essa decisão foi contestada e reafirmada: risco teórico de um mesmo preparo pertencer a múltiplos Headers existe, mas o Pedro confirmou que, na prática do negócio, "o que temos em aperitivos não vai pro buffet" — os conjuntos não se sobrepõem, então o risco não se materializa. Mantido dinâmico por decisão do dono do negócio.)*

### `Itens_Evento_Confirmados`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Evento | Link | → Eventos |
| Preparo | Link | → Preparos |
| Orcamento_Origem | Link | → Orcamentos |
| Quantidade_Confirmada | Decimal (congelada) | |
| Custo_Unitario_Snapshot | Decimal (congelado) | |

### `Preparos`
| Coluna | Tipo |
|---|---|
| Nome Do Preparo | Single line text |
| Categoria | Single select (Entrada/Guarnições/Molhos/Carnes/Saladas/Bebidas/Sobremesa) |
| Rendimento | Number |
| Unidade_Rendimento | Single select (ML/Unidade/G) |
| Apresentação/Utensílio | Single line text |
| Tags | Multi select (restrições alimentares) |
| Modo de Preparo | Long text |
| Tempo_Preparo | Number (minutos) |
| Peso_Atratividade | Number, **sem DEFAULT, aceita NULL** — ver seção 5 |
| Subcategoria_Proteina | Single select (Carne Vermelha/Ovino/Suíno/Peixe/Aves) — **só preenchido quando Categoria = Carnes** |
| Porcao_Maxima_Individual | Decimal (opcional — Hard Cap, ver seção 5) |
| Peso_Medio_Unidade_G | Decimal (opcional — só quando Unidade_Rendimento = Unidade, usado no motor logístico, seção 6) |

### `Hierarquia_Proteina` (nova — tabela de referência fixa, 5 linhas)
| Coluna | Tipo |
|---|---|
| Subcategoria | Single select (Carne Vermelha/Ovino/Suíno/Peixe/Aves) |
| Peso_Padrao | Decimal |

Valores definidos: Carne Vermelha 1,5 · Ovino 1,3 · Suíno 1,1 · Peixe 0,9 · Aves 0,7.

### `Composição`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Quantidade | Decimal | |
| Insumo | Link | → Insumos |
| Preparo | Link | → Preparos |

### `Insumos`
| Coluna | Tipo |
|---|---|
| Nome | Single line text |
| Unidade | Single select (KG/Litro/Unidade/Maço) |
| Preco | Decimal |
| Fator de Correção | Decimal |
| Preço Corrigido | Formula: Preco / Fator de Correção |

### `Macro_Categorias`
| Coluna | Tipo |
|---|---|
| Nome_Macro | Single line text |
| Capacidade_Teto | Number |
| Unidade | Single select (g/ml) |

### `Headers_UI`
| Coluna | Tipo | Vínculo |
|---|---|---|
| Nome_Exibicao | Single line text | |
| Macro_Categoria | Link | → Macro_Categorias |
| (relação muitos-pra-muitos com Preparos) | | |

---

## 4. Motor de Custo de Fichas Técnicas (validado com dados reais)

```
custo_total_preparo = Σ (quantidade_composição × preço_corrigido_insumo)
custo_por_unidade_rendimento = custo_total_preparo / rendimento
custo_por_pessoa = custo_por_unidade_rendimento × porção_por_pessoa
```

Validado com 3 exemplos reais:
- Vinagrete (1500 ML): custo total R$16,96 → R$1,13/100ml
- Alcatra Grelhada (1000 G): custo total R$64,93 → R$6,49/100g
- Arroz Branco com Alho Crispy (1000 G): custo total R$20,07 → R$2,01/100g

**Regra de borda:** insumos com `Fator de Correção = 0` ou `Preço` vazio (ex: água) são tratados como custo R$0 — evita divisão por zero.

---

## 5. Motor de Dimensionamento de Cardápio (regras fechadas)

Regra de negócio: **proibido usar per capita estático**. Fórmula base:

```
Porcao_Calculada = Capacidade_Teto_Macro × (Peso_Item / Σ Pesos_Macro_dos_itens_selecionados)
Porcao_Final = MIN(Porcao_Calculada, Preparos.Porcao_Maxima_Individual)   [se definido; senão usa Porcao_Calculada direto]
Volume_Necessário_Total = Porcao_Final × Num_Convidados
```

**Resolução do Peso_Item, nesta ordem:**
1. `Preparos.Peso_Atratividade`, se definido manualmente (permite forçar exceção pontual).
2. Se `Categoria = Carnes` e `Subcategoria_Proteina` definida: usa `Hierarquia_Proteina.Peso_Padrao` correspondente (carregada em memória no servidor na inicialização — sem custo de latência, tabela de 5 linhas fixas).
3. Se nenhuma das duas: o preparo **não aparece no simulador público** (filtro `WHERE Peso_Atratividade IS NOT NULL OR (Categoria = 'Carnes' AND Subcategoria_Proteina IS NOT NULL)`) — fail-fast deliberado, evita compra calculada errada por dado ausente.

**Regras validadas/aceitas nesta rodada de consenso técnico:**
- Se só há 1 item numa Macro_Categoria, ele consome 100% do teto — comportamento correto e aceito (quem escolhe menos opções come mais de cada uma).
- O Hard Cap (`Porcao_Maxima_Individual`) reduz o total sem redistribuir o excedente pros demais itens do grupo — **limitação conhecida e aceita para este estágio** (ex: farofa sozinha travada em 80g não realoca os 70g restantes do teto pra outro item).
- A hierarquia de proteína existe **somente para `Categoria = Carnes`**. Demais categorias (carboidratos, saladas etc.) não têm hierarquia automática — o Pedro validou que ali as opções competem em pé de igualdade na prática do negócio ("arroz, batata frita e macarrão não têm essa disparidade de custo/nobreza que carnes têm"), então permanecem sob a regra de peso manual ou bloqueio.
- Pesos dinâmicos por tipo de evento (ex: corporativo valorizar peixe mais que casamento) foi **descartado deliberadamente** — não há dados históricos que sustentem esse refinamento agora; seria engenharia excessiva sem prior estatístico real. A válvula de escape é o peso manual por prato em orçamentos específicos.

---

## 6. Motor Logístico (UEV/Caixas) — nível de sofisticação: baixo, deliberadamente

Bin-packing tridimensional foi descartado como engenharia excessiva para o estágio atual. Abordagem adotada: **Unidade Equivalente de Volume**, padronizada em caixas plásticas.

```
1 Caixa = 20kg
Master = 80 caixas de capacidade
Kombi Nova = ? (PENDENTE — o Pedro ainda não informou)
Kombi Velha = ? (PENDENTE — o Pedro ainda não informou)
```

**Cálculo do peso total de um evento:**
- Item com `Unidade_Rendimento = G`: usa a quantidade calculada direto.
- Item com `Unidade_Rendimento = ML`: aproxima 1ml = 1g (aceitável para líquidos aquosos).
- Item com `Unidade_Rendimento = Unidade`: multiplica quantidade × `Peso_Medio_Unidade_G`. Se esse campo estiver vazio, o item é **excluído da soma com aviso** — não quebra o cálculo, mas o resultado fica subestimado nesse caso (limitação conhecida).

```
Total_Caixas_Necessarias = Peso_Total_Evento_G / 20000
```

Se `Total_Caixas_Necessarias` exceder a capacidade do veículo selecionado no evento: **alerta**, não bloqueio — o sistema avisa, o usuário decide.

---

## 7. Arquitetura Financeira (fechada)

```
Receita Projetada (Orçamento) = (Valor_Base_Por_Pessoa × Num_Convidados) 
                                  + Σ Orcamento_Itens_Adicionais.Valor 
                                  − Desconto
Custo Projetado = motor de custo (seção 4), sobre Itens_Orcamento, sempre em tempo real
Margem Projetada = Receita Projetada − Custo Projetado (nunca armazenada)

Margem Real (Evento) = Valor_Total_Fechado 
                        + Σ Evento_Itens_Adicionais.Valor_Cobrado
                        − Custo_Alimentos (Σ Itens_Evento_Confirmados.Custo_Unitario_Snapshot × Quantidade_Confirmada, congelado)
                        − Σ Custos_Operacionais_Evento.Valor
```

Distinção importante entre duas tabelas parecidas:
- `Evento_Itens_Adicionais` = **receita** (o que é cobrado do cliente, ex: taxa de deslocamento cobrada).
- `Custos_Operacionais_Evento` = **custo real** (o que de fato foi gasto — combustível, salário do garçom daquele dia). Isolada do motor de custo de alimento de propósito, porque não escala por convidado como as fichas técnicas.

---

## 8. Pendências que só o dono do negócio pode resolver

1. **Capacidade em caixas da Kombi Nova e da Kombi Velha** (seção 6) — necessário pra completar o alerta de excesso de carga por veículo.
2. **Onde ficam os campos de contrato do Senhor Churrasco fora do já modelado em `Eventos_Detalhes_SC`** — considerado resolvido, listado aqui só como registro de que a tabela já existe e está populada corretamente na seção 3.
3. **Cardápio "barato" (poucas opções de baixo peso, ex: 3 frangos)** — confirmado que mantém o mesmo volume total de proteína por pessoa (400g), só distribuído entre menos opções mais baratas. O Pedro não pediu para reduzir o volume total nesse cenário — apenas levantou a dúvida, que foi esclarecida matematicamente sem necessidade de mudança de regra.