# Regras de Negócio — Anjos Eventos

Este documento contém regras de negócio já validadas.

O agente não deve alterar estas regras por iniciativa própria.

Se uma implementação parecer contradizer uma regra abaixo, investigar antes de modificar o comportamento.

---

# 1. Empresas

O sistema atende três empresas:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

A agenda é unificada.

---

# 2. Orçamentos

Um orçamento representa uma proposta para um cliente.

A receita projetada é:

```text
Receita Projetada =
(Valor_Base_Por_Pessoa × Num_Convidados)
+ Σ Itens Adicionais
− Desconto
O custo projetado é calculado em tempo real a partir dos itens do orçamento.

A margem projetada é:

Margem Projetada =
Receita Projetada − Custo Projetado

A margem projetada não deve ser armazenada como valor definitivo.

3. Evento confirmado

Quando um orçamento é aceito e convertido em evento, os itens confirmados devem preservar:

quantidade confirmada;
custo unitário no momento da confirmação.

Esses valores são snapshots históricos.

Alterações futuras nos preços das fichas técnicas não devem modificar o histórico de eventos já confirmados.

4. Motor de custo de ficha técnica

A fórmula é:

custo_total_preparo =
Σ(quantidade_composição × preço_corrigido_insumo)

Depois:

custo_por_unidade_rendimento =
custo_total_preparo / rendimento

E:

custo_por_pessoa =
custo_por_unidade_rendimento × porção_por_pessoa
5. Motor de dimensionamento

É PROIBIDO utilizar per capita estático como regra principal.

A fórmula base é:

Porcao_Calculada =
Capacidade_Teto_Macro ×
(Peso_Item / Σ Pesos_Macro_dos_itens_selecionados)

Depois:

Porcao_Final =
MIN(Porcao_Calculada, Porcao_Maxima_Individual)

quando houver limite individual.

O volume total é:

Volume_Necessário_Total =
Porcao_Final × Num_Convidados
6. Peso do item

A resolução do peso segue esta ordem:

Preparos.Peso_Atratividade, quando definido manualmente.
Se a categoria for Carnes e houver Subcategoria_Proteina, utilizar o peso padrão de Hierarquia_Proteina.
Caso nenhuma regra produza peso, o preparo não deve aparecer no simulador público.

Isso é intencional.

Não inventar peso padrão para resolver dado ausente.

7. Hierarquia de proteínas

A hierarquia automática existe SOMENTE para a categoria Carnes.

Pesos:

Carne Vermelha = 1,5
Ovino = 1,3
Suíno = 1,1
Peixe = 0,9
Aves = 0,7

Não aplicar essa hierarquia automaticamente a outras categorias.

8. Hard Cap

Porcao_Maxima_Individual limita a quantidade final de um preparo.

O excedente NÃO é redistribuído para os outros itens da mesma categoria neste estágio do sistema.

Isso é uma limitação conhecida e aceita.

Não implementar redistribuição automaticamente sem autorização.

9. Logística

A logística utiliza Unidade Equivalente de Volume baseada em caixas.

1 caixa = 20 kg

Capacidade conhecida:

Master = 80 caixas

As capacidades da Kombi Nova e Kombi Velha ainda estão pendentes.

Não inventar esses valores.

10. Conversão logística

Para cálculo de peso:

G

Usar diretamente a quantidade calculada.

ML

Aproximar:

1 ml = 1 g

Essa aproximação é aceitável para líquidos aquosos.

Unidade

Usar:

quantidade × Peso_Medio_Unidade_G

Se Peso_Medio_Unidade_G estiver vazio:

excluir o item da soma;
gerar aviso;
não quebrar o cálculo.
11. Caixas necessárias
Total_Caixas_Necessarias =
Peso_Total_Evento_G / 20000

Se o total ultrapassar a capacidade do veículo:

gerar alerta;
não bloquear o processo.

O usuário decide o que fazer.

12. Financeiro

Margem real do evento:

Margem Real =
Valor_Total_Fechado
+ Σ Evento_Itens_Adicionais.Valor_Cobrado
− Custo_Alimentos
− Σ Custos_Operacionais_Evento.Valor

Onde:

Custo_Alimentos =
Σ(Custo_Unitario_Snapshot × Quantidade_Confirmada)
13. Receita adicional x custo operacional

Nunca confundir:

Evento_Itens_Adicionais

com:

Custos_Operacionais_Evento

Evento_Itens_Adicionais

Representa receita adicional cobrada do cliente.

Exemplo:

taxa de deslocamento cobrada.
Custos_Operacionais_Evento

Representa custo real da operação.

Exemplos:

combustível;
salário de garçom;
outros custos operacionais.
14. Filosofia do sistema

O sistema deve privilegiar:

simplicidade;
confiabilidade;
baixa manutenção;
regras explícitas;
histórico consistente.

Não introduzir complexidade apenas porque existe uma solução tecnicamente mais sofisticada.