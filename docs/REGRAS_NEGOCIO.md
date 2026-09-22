# Regras de Negócio — Anjos Eventos

Este documento contém regras de negócio já validadas.

O agente não deve alterar estas regras por iniciativa própria.

Se uma implementação parecer contradizer uma regra abaixo, investigar antes de modificar o comportamento.

Fonte de verdade para status/histórico de cada decisão: `docs/DECISOES.md`. Este documento resume a regra vigente; em caso de dúvida sobre o racional ou sobre decisões pendentes, consultar lá.

---

# 1. Empresas

O sistema atende três empresas:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

A agenda é unificada.

---

# 2. Orçamentos — Receita Projetada

Um orçamento representa uma proposta para um cliente.

**Caminho vigente (`DATA_SOURCE=oracle`)**: o valor por pessoa não é mais um preço fixo pré-cadastrado — nasce do custo real do cardápio selecionado. Ver seção 3, "Precificação por Cardápio Selecionado".

```text
Receita Projetada =
(Valor_Sugerido_Por_Pessoa × Num_Convidados)
+ Σ Itens Adicionais
− Desconto_Aplicado
```

`Desconto_Aplicado` incide sobre o total **já somado com os itens adicionais** (Valor_Sugerido_Por_Pessoa × Num_Convidados + Σ Itens Adicionais) — decisão fechada, ver `docs/DECISOES.md`, "Incidência de desconto sobre o orçamento".

**Caminho legado (`DATA_SOURCE=nocodb`, em descontinuação)**: `src/lib/margem-orcamento.ts` (`calcularReceitaNocodb`) ainda usa o campo `Valor_Base_Por_Pessoa` (cadastrado manualmente, não calculado) e aplica o desconto **antes** de somar os itens adicionais — divergência conhecida em relação à regra vigente acima, não corrigida (o caminho legado está sendo descontinuado junto com o NocoDB, ver `docs/ARQUITETURA.MD`).

O custo projetado é calculado em tempo real a partir dos itens do orçamento.

A margem projetada é:

```text
Margem Projetada =
Receita Projetada − Custo Projetado
```

A margem projetada não deve ser armazenada como valor definitivo.

---

# 3. Precificação por Cardápio Selecionado + Custo de Equipe Fixa

Aplica-se em duas telas com a mesma lógica de cálculo: Criar Evento (Senhor Churrasco) e o Simulador de Cardápio público.

```text
Valor_Sugerido_Por_Pessoa = TETO(Custo_Cardapio_Por_Pessoa × 1,40)

Valor_Sugerido_Total_Evento (o que o CLIENTE paga) =
    (Valor_Sugerido_Por_Pessoa × Num_Convidados)
    + Taxa_Deslocamento
    + (Quantidade_Garcom × Valor_Garcom)
```

- `Taxa_Deslocamento` = R$250 se o toggle "Região Metropolitana de Curitiba?" = Sim, senão R$0 (toggle manual, sem geolocalização automática).
- Criança paga meia sobre `Valor_Sugerido_Por_Pessoa` (não sobre o custo).
- **Garçom**: R$230/profissional, sugestão de 1 a cada 30 convidados (arredondado para cima), cobrado **à parte** do valor por pessoa.
- **Copeira**: R$250/profissional, 1 a cada 50 convidados. **Assador**: R$250/profissional, 1 a cada 100 convidados. Nenhum dos dois é cobrado à parte — estão absorvidos pelo markup de 1,40. Ainda assim são rastreados obrigatoriamente (`Quantidade_Copeira`, `Quantidade_Assador`, `Custo_Copeira_Total`, `Custo_Assador_Total` em `eventos`), para uso exclusivo no cálculo de Margem Real — nunca exibidos ou cobrados no valor apresentado ao cliente.

```text
Margem_Real_Evento (uso interno, nunca visível ao cliente) =
    Receita_Total
    − Custo_Cardapio_Total
    − Custo_Garcom
    − Custo_Copeira_Total
    − Custo_Assador_Total
```

**Status de implementação**: fórmula **aprovada** (`docs/DECISOES.md`), dados de entrada (`Custo_Copeira_Total`, `Custo_Assador_Total`, `Quantidade_Copeira_Sugerida`) já são persistidos em `eventos`, mas **não há, até o momento desta auditoria (2026-09-22), nenhuma função no código que calcule `Margem_Real_Evento`**. É um gap real de implementação — a fórmula existe como decisão de negócio fechada, aguardando ser codificada.

**Nota de semântica do dado**: `Insumos.preco` já é cadastrado com acréscimo de 10-15% sobre o preço pago ao fornecedor — todo "Custo" citado neste documento e no código já reflete essa gordura embutida. Não é um erro, é como o negócio já opera.

---

# 4. Motor de Pacotes Fixos e Tolerância de Substituição

A operação vende pacotes com preço FIXO por pessoa (Cardápio 01 a 05 + Costela Fogo de Chão), independente de qual carne/salada específica o cliente escolhe dentro do pacote. Coexiste com o modelo dinâmico (custo × 1,40), sem substituí-lo.

- `cardapios_modelo.preco_fixo_por_pessoa`: quando preenchido, o Cardápio Modelo tem preço fechado.
- `orcamentos.usar_preco_fixo_modelo`: só `true` quando um Cardápio Modelo com preço fixo foi carregado.
- `configuracoes_globais.tolerancia_troca_preco_fixo`: hoje 1,99 (ajustável sem deploy).

**Simulador público** (proteção estrita, sem exceção): qualquer edição de item dentro de um Cardápio Modelo com preço fixo quebra o pacote imediatamente — `usar_preco_fixo_modelo` vira `false`, preço passa a ser dinâmico. Não existe tolerância no Simulador Público.

**Painel administrativo / Criar Evento** (tolerância paramétrica): a cada mudança, recalcula do zero:

```text
Diferença_Custo_Por_Pessoa =
    Custo_Por_Pessoa_Selecao_Atual_Total − Custo_Por_Pessoa_Cardapio_Modelo_Original_Total
```

- Se `Diferença_Custo_Por_Pessoa ≤ Tolerancia_Troca_Preco_Fixo` (incluindo diferenças negativas): mantém preço fixo automaticamente, sem alerta.
- Se maior: não bloqueia, exibe aviso não-bloqueante com opção de manter o preço fixo mesmo assim ou recalcular pelo custo real.

---

# 5. Evento confirmado

Quando um orçamento é aceito e convertido em evento, os itens confirmados (`itens_evento_confirmados`) devem preservar:

- quantidade confirmada;
- custo unitário no momento da confirmação.

Esses valores são snapshots históricos. Alterações futuras nos preços das fichas técnicas não devem modificar o histórico de eventos já confirmados.

---

# 6. Exclusão de Evento

A exclusão de evento (`src/lib/eventos.ts`, acionada por `botao-excluir-evento.tsx`) é um **hard delete incondicional** — sem restrição por status (`orcado`, `confirmado`, `realizado` e `cancelado` são todos excludíveis da mesma forma).

**Isso é intencional**, confirmado nesta auditoria (2026-09-22) — não é um gap de processo.

**Melhoria futura (não é requisito atual)**: considerar restringir ou exigir confirmação adicional para exclusão de eventos já `confirmado`/`realizado`, para reduzir risco de perda acidental de histórico. Não implementar sem nova decisão explícita.

---

# 7. Motor de custo de ficha técnica

```text
custo_total_preparo =
Σ(quantidade_composição × preço_corrigido_insumo)

custo_por_unidade_rendimento =
custo_total_preparo / rendimento

custo_por_pessoa =
custo_por_unidade_rendimento × porção_por_pessoa
```

Regra de borda: se `Fator de Correção` for 0 ou vazio, ou `Custo Médio` estiver vazio, o custo do insumo é tratado como R$0 (evita divisão por zero).

---

# 8. Motor de dimensionamento

É PROIBIDO utilizar per capita estático como regra principal.

```text
Porcao_Calculada =
Capacidade_Teto_Macro ×
(Peso_Item / Σ Pesos_Macro_dos_itens_selecionados)

Porcao_Final =
MIN(Porcao_Calculada, Porcao_Maxima_Individual)   [quando houver Hard Cap]

Volume_Necessário_Total =
Porcao_Final × Num_Convidados
```

---

# 9. Correção de Mistura de Unidades (Rendimento em Unidade vs. Macro em g/ml)

Para um Preparo com `unidade_rendimento = Unidade` dentro de uma Macro-Categoria medida em g/ml, a quantidade calculada em gramas/ml não pode ser usada diretamente como contagem de unidades (bug real já confirmado com dado real: Pão de Alho gerou 7.320 "unidades" para 61 convidados).

```text
Quantidade_Unidades =
TETO(Porcao_Calculada_G_ou_ML / Peso_Medio_Unidade_G)
```

`Peso_Medio_Unidade_G` (`preparos.peso_medio_unidade_g`) é manual, único, fonte da verdade — **vetada explicitamente** qualquer derivação automática a partir do peso cru dos insumos da Composição (água evapora, carnes perdem peso na cocção; uma derivação automática geraria pesos incorretos silenciosos).

**Validação obrigatória no cadastro**: ao cadastrar/editar um Preparo com `unidade_rendimento = Unidade` cuja categoria pertence a uma macro em g/ml, o formulário deve exigir o preenchimento de `Peso_Medio_Unidade_G` antes de salvar.

---

# 10. Peso do item

A resolução do peso segue esta ordem:

1. `Preparos.peso_atratividade`, quando definido manualmente.
2. Se a categoria for Carnes e houver `Subcategoria_Proteina`, utilizar o peso padrão de `hierarquia_proteina`.
3. Caso nenhuma regra produza peso, o preparo não deve aparecer no simulador público.

Isso é intencional. Não inventar peso padrão para resolver dado ausente.

---

# 11. Hierarquia de proteínas

A hierarquia automática existe SOMENTE para a categoria Carnes.

Pesos (fonte: `docs/DECISOES.md`, calibrados com o Pedro e o sócio a partir da proporção real 2:1:1 = Carne Vermelha:Suíno:Aves em 400g de proteína por evento típico):

```text
Carne Vermelha = 2,0
Ovino          = 1,3
Suíno          = 1,0
Peixe          = 0,9
Aves           = 1,0
```

Não aplicar essa hierarquia automaticamente a outras categorias.

---

# 12. Hard Cap

`Porcao_Maxima_Individual` limita a quantidade final de um preparo.

O excedente NÃO é redistribuído para os outros itens da mesma categoria neste estágio do sistema. Isso é uma limitação conhecida e aceita — não implementar redistribuição automaticamente sem autorização.

---

# 13. Divisão de Saladas Leves e Pesadas + Hard Cap Retroativo

A Macro-Categoria "Saladas" foi dividida em duas, por peso fisiológico desigual entre saladas de folha e saladas compostas/densas:

- **Saladas Leves** — teto 30g
- **Saladas Pesadas** — teto 80g

Divisão feita no agrupamento visual (`headers_ui` → `macro_categorias`), não no campo `preparos.categoria` (que continua só com o valor `Saladas`).

**Hard Cap retroativo**: Mix de Folhas Verdes tem `Porcao_Maxima_Individual = 15g` — mesmo dentro do teto de 30g, uma travessa 100% de folha não deveria absorver o teto inteiro sozinha.

**Processo permanente para todo preparo novo**: o fluxo de cadastro de preparo exige o "Teste de Estresse de Item Único" (se este preparo fosse a única escolha da categoria e recebesse 100% do teto, seria uma porção humanamente condizente?) antes de decidir `Porcao_Maxima_Individual`.

---

# 14. Conversão de unidades no motor de dimensionamento

Para o cálculo de volume total necessário:

- **G**: usar diretamente a quantidade calculada.
- **ML**: aproximar 1 ml = 1 g (aceitável para líquidos aquosos).
- **Unidade**: ver seção 9 (Correção de Mistura de Unidades) — `quantidade × Peso_Medio_Unidade_G`. Se `Peso_Medio_Unidade_G` estiver vazio: excluir o item da soma, gerar aviso, não quebrar o cálculo.

---

# 15. Política de Falha do Motor de Cálculo (Fail-Hard sob Timeout/Erro de Rede)

Duas categorias de falha, tratadas de forma diferente:

- **Peso/subcategoria ausente** (seção 10): fail-fast — o item é excluído do resultado, com aviso, o cálculo não quebra.
- **Timeout ou erro de rede** em qualquer chamada do cardápio: **fail-hard** — o CÁLCULO INTEIRO falha, nunca segue parcial excluindo o item silenciosamente. Motivo: um orçamento que vira contrato não pode variar de valor entre tentativas por sorte de rede.

Formato de erro (payload estruturado, nunca 500/503 genérico):

```json
{
  "erro": "falha_calculo",
  "mensagem": "Não foi possível calcular o cardápio agora. Tente novamente.",
  "itens_com_falha": [
    { "preparo_id": 0, "motivo": "timeout_preparo" }
  ]
}
```

Deliberadamente sem `preparo_nome` no payload — o front-end já mantém a lista de preparos selecionados em memória; cruzar nome é responsabilidade exclusiva do front-end.

---

# 16. Financeiro

Duas fórmulas de margem coexistem no sistema, com propósitos e status de implementação diferentes:

**Margem Real (histórica, ligada a `Itens_Eventos_Confirmados`)**:

```text
Margem Real =
Valor_Total_Fechado
+ Σ Evento_Itens_Adicionais.Valor_Cobrado
− Custo_Alimentos
− Σ Custos_Operacionais_Evento.Valor

Custo_Alimentos =
Σ(Custo_Unitario_Snapshot × Quantidade_Confirmada)
```

**DESCONHECIDO / PRECISA DE CONFIRMAÇÃO**: `Valor_Total_Fechado` e `Custos_Operacionais_Evento` não foram localizados como tabela/coluna própria no schema atual (`docs/BANCO.md`) nem como função no código — esta fórmula parece ligada ao fluxo de "Extração de Contrato em PDF" (`docs/DECISOES.md`, status APROVADA), cuja implementação não foi confirmada nesta auditoria.

**Margem_Real_Evento (atual, ligada à Precificação por Cardápio Selecionado)**: ver seção 3 — aprovada, não implementada.

---

# 17. Receita adicional x custo operacional

Nunca confundir:

- `Orcamento_Itens_Adicionais` / `Evento_Itens_Adicionais` — representa **receita** adicional cobrada do cliente (ex.: taxa de deslocamento cobrada).
- `Custos_Operacionais_Evento` — representa **custo** real da operação (ex.: combustível, salário de garçom).

---

# 18. Motor logístico — DESCARTADO

Status: DESCARTADA (`docs/DECISOES.md`, "Motor logístico"). Toda a lógica de veículo de carga (Master, Kombi Nova, Kombi Velha) e o motor de Unidade Equivalente de Volume (caixas, 1 caixa = 20kg) foram removidos do escopo do projeto — priorização de MVP. O campo `Veiculo` foi removido de `eventos` e do formulário.

O checklist de carregamento do dia do evento (Picking List, Fase 2 — escopo aprovado, implementação pendente) é exclusivamente uma lista de separação de estoque, sem dimensão de veículo.

`Peso_Medio_Unidade_G`, originalmente desenhado para este motor, foi reaproveitado com propósito diferente — ver seção 9.

---

# 19. Filosofia do sistema

O sistema deve privilegiar:

- simplicidade;
- confiabilidade;
- baixa manutenção;
- regras explícitas;
- histórico consistente.

Não introduzir complexidade apenas porque existe uma solução tecnicamente mais sofisticada.
