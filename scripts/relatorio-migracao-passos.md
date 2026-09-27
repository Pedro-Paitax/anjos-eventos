# Relatório de migração — modo_preparo → passos JSONB

Gerado em 2026-09-27T15:39:51.925Z. Total de preparos: 54.

Revisão pendente do Pedro: nenhuma aprovação item a item foi feita antes de gravar — os dados abaixo já foram escritos em `passos`. `modo_preparo` continua sendo a fonte oficial até 100% dos preparos serem aprovados.
## Casos atípicos — revisar primeiro

- **#11 Tartar de Mignon com Chips de Batata Doce** — numeração encontrada marca FASES longas (cada uma com múltiplos sub-passos em texto corrido), não passos atômicos — revisar granularidade manualmente.
- **#15 Coca Cola** — modo_preparo parece um rótulo/categoria ("BEBIDAS"), não instruções de preparo reais.
- **#16 Sorvete de Flocos** — modo_preparo parece um rótulo/categoria ("SORVETE"), não instruções de preparo reais.

---


## #2 — Vinagrete

**modo_preparo original:**

```
Pique todos os ingredientes em um tamanho pequeno, o menor possível, junte tudo. Adicione o azeite e vinagre com um pouco de sal
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Pique todos os ingredientes em um tamanho pequeno, o menor possível, junte tudo. Adicione o azeite e vinagre com um pouco de sal",
    "tempo_estimado_min": null
  }
]
```

## #3 — Linguiça Toscana

**modo_preparo original:**

```
Grelhar na churrasqueira até dourar/cozinhar por completo. Servir acompanhado de chimichurri ou maionese cítrica (servidos separadamente).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Grelhar na churrasqueira até dourar/cozinhar por completo. Servir acompanhado de chimichurri ou maionese cítrica (servidos separadamente).",
    "tempo_estimado_min": null
  }
]
```

## #4 — Chimichurri

**modo_preparo original:**

```
Picar bem fino salsinha e alho. Misturar com orégano, pimenta calabresa e sal. Adicionar vinagre, misturar, depois incorporar o óleo de soja e o azeite. Deixar descansar antes de servir. Sobras podem ser reaproveitadas.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Picar bem fino salsinha e alho. Misturar com orégano, pimenta calabresa e sal. Adicionar vinagre, misturar, depois incorporar o óleo de soja e o azeite. Deixar descansar antes de servir. Sobras podem ser reaproveitadas.",
    "tempo_estimado_min": null
  }
]
```

## #5 — Maionese Cítrica

**modo_preparo original:**

```
Bater o leite gelado no liquidificador. Com o liquidificador ligado, acrescentar o óleo em fio, lentamente, até dar ponto de maionese. Adicionar as raspas de limão e laranja e o sal, bater rapidamente só para incorporar.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Bater o leite gelado no liquidificador. Com o liquidificador ligado, acrescentar o óleo em fio, lentamente, até dar ponto de maionese. Adicionar as raspas de limão e laranja e o sal, bater rapidamente só para incorporar.",
    "tempo_estimado_min": null
  }
]
```

## #6 — Pão de Alho

**modo_preparo original:**

```
Cortar o pão francês em rodelas (rende 5-6 fatias por pão). Passar a mistura de margarina, alho triturado, orégano (e parmesão, quando incluído) nas fatias. Levar à churrasqueira até dourar dos dois lados.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cortar o pão francês em rodelas (rende 5-6 fatias por pão). Passar a mistura de margarina, alho triturado, orégano (e parmesão, quando incluído) nas fatias. Levar à churrasqueira até dourar dos dois lados.",
    "tempo_estimado_min": null
  }
]
```

## #7 — Canudinho de Batatonese

**modo_preparo original:**

```
Faça a batatonese com molho de maionese de leite. Preencha os canudinhos com a batatonese. 
Adicione cebolinha picada e cebola crispy como topping.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Faça a batatonese com molho de maionese de leite. Preencha os canudinhos com a batatonese. \nAdicione cebolinha picada e cebola crispy como topping.",
    "tempo_estimado_min": null
  }
]
```

## #8 — Bruschetta de Fogo com Crosta de Provolone

**modo_preparo original:**

```
Corte a Baguete na metade horizontalmente.
Misture o cream cheese com queijo prato ralado, sal e azeite.
Coloque na grelha ou parrilha no fogo médio.
Coloque em cima um bowl ou gn pro queijo derreter.
Tire do Fogo e rale queijo provolone por cima.
Passe o maçarico APENAS no queijo Provolone pra ele derreter.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte a Baguete na metade horizontalmente.\nMisture o cream cheese com queijo prato ralado, sal e azeite.\nColoque na grelha ou parrilha no fogo médio.\nColoque em cima um bowl ou gn pro queijo derreter.\nTire do Fogo e rale queijo provolone por cima.\nPasse o maçarico APENAS no queijo Provolone pra ele derreter.",
    "tempo_estimado_min": null
  }
]
```

## #10 — Coração de Galinha

**modo_preparo original:**

```
1
Realizar a triagem e pesagem dos insumos com precisão.

2
Limpeza: Remover o excesso de gordura e tecidos vasculares mantendo o formato original.

3
Tempero: Amassar alho e envolver os corações com pasta de alho e sal grosso em recipiente de inox.

4
Marinação: Refrigerar por 20 minutos para absorção do sabor.

5
Montagem: Fixar nos espetos de forma alinhada e compacta para evitar ressecamento.

6
Cocção: Grelhar a 30cm do braseiro quente por 15-20 min, rotacionando periodicamente.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "1\nRealizar a triagem e pesagem dos insumos com precisão.\n\n2\nLimpeza: Remover o excesso de gordura e tecidos vasculares mantendo o formato original.\n\n3\nTempero: Amassar alho e envolver os corações com pasta de alho e sal grosso em recipiente de inox.\n\n4\nMarinação: Refrigerar por 20 minutos para absorção do sabor.\n\n5\nMontagem: Fixar nos espetos de forma alinhada e compacta para evitar ressecamento.\n\n6\nCocção: Grelhar a 30cm do braseiro quente por 15-20 min, rotacionando periodicamente.",
    "tempo_estimado_min": null
  }
]
```

## #11 — Tartar de Mignon com Chips de Batata Doce

**modo_preparo original:**

```
1. Chips de Batata Doce (Pré-Preparo e Cocção)
Corte e Extração de Amido: Lave as batatas doces e fatie no mandoline em lâminas uniformes de 1,0 mm a 1,5 mm. Deixe imersas em água com gelo por 15 minutos para retirar o amido superficial. Seque fatia por fatia em papel-toalha até eliminar toda a umidade da superfície.
Opção de Cocção 1 — Forno Convencional / Combinado:
Pré-aqueça o forno a 150°C (ou 140°C em forno de convecção/combinado).
Forre assadeiras com papel-manteiga ou tapete de silicone e distribua as lâminas em camada única, sem sobreposição.
Borrife o azeite de oliva uniformemente sobre as fatias.
Asse por aproximadamente 20 a 28 minutos, virando as lâminas na metade do tempo para secagem homogênea.
Opção de Cocção 2 — Airfryer:
Pré-aqueça o equipamento a 150°C.
Acomode as lâminas no cesto em camadas leves, borrife o azeite e asse a 150°C–160°C por 12 a 16 minutos, agitando o cesto a cada 4 minutos para evitar pontos de queima.
Resfriamento: Retire os chips quando estiverem rígidos e levemente dourados. Salpique o sal imediatamente e transfira para uma grade de resfriamento. Armazene em recipiente hermeticamente vedado até o momento da montagem.
2. Tartar de Filé Mignon (Mise en Place e Mistura)
Segurança e Cadeia de Frio: Mantenha a peça de filé mignon refrigerada entre 0°C e 4°C. Utilize um bowl de aço inoxidável apoiado sobre banho-maria de gelo durante a manipulação da carne.
Corte da Carne: Elimine qualquer resíduo de gordura ou tecido conjuntivo. Corte a carne em lâminas, depois em tiras e finalize em cubos regulares de 2 mm a 3 mm na ponta da faca. Não moa a carne.
Aromáticos e Emulsão: Pique a cebola roxa, as alcaparras drenadas e os cornichons em cubos mínimos (brunoise de 1 mm a 2 mm). No bowl gelado, homogenize a mostarda Dijon, o azeite extravirgem, o molho inglês e a gema pasteurizada.
Homogeneização: Incorpore os aromáticos e a salsinha à emulsão. Adicione a carne picada, o sal e a pimenta-do-reino. Misture de forma rápida e delicada com espátula até distribuir o tempero uniformemente.
3. Montagem e Finalização (Taça de 170 ml)
Porcione exatamente 60g do tartar temperado no fundo de cada taça descartável de 170 ml, utilizando uma colher medidora ou manga de confeitar descartável (com bico largo) para não sujar as paredes do recipiente.
Insira 2 a 3 lâminas de chips de batata doce na posição vertical diretamente sobre a superfície do tartar no momento exato da entrega ao salão.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Chips de Batata Doce (Pré-Preparo e Cocção)\nCorte e Extração de Amido: Lave as batatas doces e fatie no mandoline em lâminas uniformes de 1,0 mm a 1,5 mm. Deixe imersas em água com gelo por 15 minutos para retirar o amido superficial. Seque fatia por fatia em papel-toalha até eliminar toda a umidade da superfície.\nOpção de Cocção 1 — Forno Convencional / Combinado:\nPré-aqueça o forno a 150°C (ou 140°C em forno de convecção/combinado).\nForre assadeiras com papel-manteiga ou tapete de silicone e distribua as lâminas em camada única, sem sobreposição.\nBorrife o azeite de oliva uniformemente sobre as fatias.\nAsse por aproximadamente 20 a 28 minutos, virando as lâminas na metade do tempo para secagem homogênea.\nOpção de Cocção 2 — Airfryer:\nPré-aqueça o equipamento a 150°C.\nAcomode as lâminas no cesto em camadas leves, borrife o azeite e asse a 150°C–160°C por 12 a 16 minutos, agitando o cesto a cada 4 minutos para evitar pontos de queima.\nResfriamento: Retire os chips quando estiverem rígidos e levemente dourados. Salpique o sal imediatamente e transfira para uma grade de resfriamento. Armazene em recipiente hermeticamente vedado até o momento da montagem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Tartar de Filé Mignon (Mise en Place e Mistura)\nSegurança e Cadeia de Frio: Mantenha a peça de filé mignon refrigerada entre 0°C e 4°C. Utilize um bowl de aço inoxidável apoiado sobre banho-maria de gelo durante a manipulação da carne.\nCorte da Carne: Elimine qualquer resíduo de gordura ou tecido conjuntivo. Corte a carne em lâminas, depois em tiras e finalize em cubos regulares de 2 mm a 3 mm na ponta da faca. Não moa a carne.\nAromáticos e Emulsão: Pique a cebola roxa, as alcaparras drenadas e os cornichons em cubos mínimos (brunoise de 1 mm a 2 mm). No bowl gelado, homogenize a mostarda Dijon, o azeite extravirgem, o molho inglês e a gema pasteurizada.\nHomogeneização: Incorpore os aromáticos e a salsinha à emulsão. Adicione a carne picada, o sal e a pimenta-do-reino. Misture de forma rápida e delicada com espátula até distribuir o tempero uniformemente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Montagem e Finalização (Taça de 170 ml)\nPorcione exatamente 60g do tartar temperado no fundo de cada taça descartável de 170 ml, utilizando uma colher medidora ou manga de confeitar descartável (com bico largo) para não sujar as paredes do recipiente.\nInsira 2 a 3 lâminas de chips de batata doce na posição vertical diretamente sobre a superfície do tartar no momento exato da entrega ao salão.",
    "tempo_estimado_min": null
  }
]
```

## #12 — Alcatra Grelhada

**modo_preparo original:**

```
1. Limpe a peça retirando os nervos e gordura excedente caso haja
2. Corte em bifes de 5cm (1 dedo/ 1.5 dedo)
3. Coloque os bifes na Parrilha e coloque na churrasqueira, ou caso tenha, direto na grelha (Garanta que esteja na temperatura certa)
4. Salgue com sal grosso
5. Doure dos dois lados (Média de 4 minutos por lado)
6. Retire do fogo quando estiver pronto e corte em pedaços curtos, normalmente cortando o bife em 3
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Limpe a peça retirando os nervos e gordura excedente caso haja",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte em bifes de 5cm (1 dedo/ 1.5 dedo)",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Coloque os bifes na Parrilha e coloque na churrasqueira, ou caso tenha, direto na grelha (Garanta que esteja na temperatura certa)",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Salgue com sal grosso",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Doure dos dois lados (Média de 4 minutos por lado)",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Retire do fogo quando estiver pronto e corte em pedaços curtos, normalmente cortando o bife em 3",
    "tempo_estimado_min": null
  }
]
```

## #13 — Arroz Branco com Alho Crispy

**modo_preparo original:**

```
I. Preparo do Arroz
Lave o arroz até a água sair límpida.
Aqueça óleo, refogue alho picado.
Adicione o arroz, sele os grãos.
Adicione água quente e sal.
Cozinhe fogo médio, depois mínimo até secar.
Descanse 5 minutos tampado.
II. Finalização
Disponha o arroz no rechoud. Finalize com o alho crispy somente no momento do serviço para garantir a textura crocante.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "I. Preparo do Arroz\nLave o arroz até a água sair límpida.\nAqueça óleo, refogue alho picado.\nAdicione o arroz, sele os grãos.\nAdicione água quente e sal.\nCozinhe fogo médio, depois mínimo até secar.\nDescanse 5 minutos tampado.\nII. Finalização\nDisponha o arroz no rechoud. Finalize com o alho crispy somente no momento do serviço para garantir a textura crocante.",
    "tempo_estimado_min": null
  }
]
```

## #14 — Tomate e Pepino com Cebola

**modo_preparo original:**

```
01
Higienização
Lavar os vegetais em água corrente e realizar a desinfecção em solução clorada. Enxaguar e secar bem.

02
Corte
Fatiar o tomate, o pepino e a cebola em fatias pequenas e finas (padronizar o tamanho para garantir a harmonia na garfada).

03
Montagem
Em um bowl, misturar delicadamente os vegetais fatiados.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "01\nHigienização\nLavar os vegetais em água corrente e realizar a desinfecção em solução clorada. Enxaguar e secar bem.\n\n02\nCorte\nFatiar o tomate, o pepino e a cebola em fatias pequenas e finas (padronizar o tamanho para garantir a harmonia na garfada).\n\n03\nMontagem\nEm um bowl, misturar delicadamente os vegetais fatiados.",
    "tempo_estimado_min": null
  }
]
```

## #15 — Coca Cola

**modo_preparo original:**

```
BEBIDAS
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "BEBIDAS",
    "tempo_estimado_min": null
  }
]
```

## #16 — Sorvete de Flocos

**modo_preparo original:**

```
SORVETE
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "SORVETE",
    "tempo_estimado_min": null
  }
]
```

## #20 — Batata Gratinada com Bacon

**modo_preparo original:**

```
Cozinhar as batatas fatiadas até macias. Fritar o bacon até crocante; refogar cebola e alho na gordura do bacon. Fazer molho branco (manteiga + farinha + leite), juntar creme de leite e metade da mussarela temperada com sal, pimenta e noz-moscada. Montar camadas de batata, molho e bacon em réchaud. Cobrir com o restante da mussarela e o parmesão. Assar a 200°C por 30-35 min até gratinar. Finalizar com salsinha.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhar as batatas fatiadas até macias. Fritar o bacon até crocante; refogar cebola e alho na gordura do bacon. Fazer molho branco (manteiga + farinha + leite), juntar creme de leite e metade da mussarela temperada com sal, pimenta e noz-moscada. Montar camadas de batata, molho e bacon em réchaud. Cobrir com o restante da mussarela e o parmesão. Assar a 200°C por 30-35 min até gratinar. Finalizar com salsinha.",
    "tempo_estimado_min": null
  }
]
```

## #21 — Panache de Legumes

**modo_preparo original:**

```
Cozinhar separadamente em água fervente: cenoura (5 min), batata salsa (8-10 min), brócolis (2-3 min), couve-flor (3-4 min), vagem (10 min) e abobrinha (2 min), até macios mas firmes. Escorrer bem. Numa frigideira grande, derreter a manteiga e refogar a cebola roxa e o alho até perfumar. Juntar todos os legumes e o orégano, ajustar o sal e saltear rapidamente para incorporar sabor sem cozinhar demais. Finalizar com salsinha picada.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhar separadamente em água fervente: cenoura (5 min), batata salsa (8-10 min), brócolis (2-3 min), couve-flor (3-4 min), vagem (10 min) e abobrinha (2 min), até macios mas firmes. Escorrer bem. Numa frigideira grande, derreter a manteiga e refogar a cebola roxa e o alho até perfumar. Juntar todos os legumes e o orégano, ajustar o sal e saltear rapidamente para incorporar sabor sem cozinhar demais. Finalizar com salsinha picada.",
    "tempo_estimado_min": null
  }
]
```

## #23 — Fraldinha na Mostarda

**modo_preparo original:**

```
1. Limpe a peça retirando excesso de gordura e nervos.
2. Corte em bifes de 2 a 3cm de espessura.
3. Pincele os bifes com a mostarda Dijon dos dois lados.
4. Coloque na Parrilha/grelha em temperatura alta.
5. Doure dos dois lados (média de 4 minutos por lado).
6. Retire do fogo, deixe descansar 2 minutos e corte em pedaços curtos.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Limpe a peça retirando excesso de gordura e nervos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte em bifes de 2 a 3cm de espessura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Pincele os bifes com a mostarda Dijon dos dois lados.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Coloque na Parrilha/grelha em temperatura alta.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Doure dos dois lados (média de 4 minutos por lado).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Retire do fogo, deixe descansar 2 minutos e corte em pedaços curtos.",
    "tempo_estimado_min": null
  }
]
```

## #24 — Copa Lombo

**modo_preparo original:**

```
1. Tempere a peça inteira com sal grosso.
2. Espete a peça inteira no espeto.
3. Posicione na parte de cima da churrasqueira (calor mais brando/indireto).
4. Deixe assar lentamente, virando periodicamente, até atingir o ponto (aproximadamente 40-50 minutos).
5. Retire do espeto e fatie em bifes finos na hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere a peça inteira com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Espete a peça inteira no espeto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Posicione na parte de cima da churrasqueira (calor mais brando/indireto).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Deixe assar lentamente, virando periodicamente, até atingir o ponto (aproximadamente 40-50 minutos).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Retire do espeto e fatie em bifes finos na hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #25 — Coxinha da Asa de Frango

**modo_preparo original:**

```
1. Tempere as coxinhas da asa com orégano, mostarda, sal e páprica, misturando bem para cobrir toda a superfície.
2. Deixe marinar por pelo menos 15 minutos.
3. Espete em conjuntos de 5 a 6 unidades.
4. Leve à brasa em fogo médio.
5. Gire periodicamente até dourar por igual (aproximadamente 20 minutos), confirmando que não há partes rosadas próximas ao osso.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere as coxinhas da asa com orégano, mostarda, sal e páprica, misturando bem para cobrir toda a superfície.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Deixe marinar por pelo menos 15 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Espete em conjuntos de 5 a 6 unidades.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Leve à brasa em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Gire periodicamente até dourar por igual (aproximadamente 20 minutos), confirmando que não há partes rosadas próximas ao osso.",
    "tempo_estimado_min": null
  }
]
```

## #26 — Costelinha Suína

**modo_preparo original:**

```
1. Tempere a peça inteira com sal grosso.
2. Espete a peça inteira no espeto.
3. Posicione na parte de cima da churrasqueira (calor mais brando/indireto).
4. Deixe assar lentamente, virando periodicamente, até a carne ficar macia e soltar do osso (aproximadamente 1 hora).
5. Retire do espeto e fatie entre os ossos na hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere a peça inteira com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Espete a peça inteira no espeto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Posicione na parte de cima da churrasqueira (calor mais brando/indireto).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Deixe assar lentamente, virando periodicamente, até a carne ficar macia e soltar do osso (aproximadamente 1 hora).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Retire do espeto e fatie entre os ossos na hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #27 — Coxa de Frango Desossada

**modo_preparo original:**

```
1. Tempere a coxa desossada com orégano, mostarda, sal e páprica, misturando bem.
2. Deixe marinar por pelo menos 15 minutos.
3. Espete e leve à brasa em fogo médio.
4. Gire periodicamente até dourar por igual e cozinhar por completo (aproximadamente 20 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere a coxa desossada com orégano, mostarda, sal e páprica, misturando bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Deixe marinar por pelo menos 15 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Espete e leve à brasa em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Gire periodicamente até dourar por igual e cozinhar por completo (aproximadamente 20 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #28 — Filé Argentino

**modo_preparo original:**

```
1. Retire a peça da geladeira com antecedência para chegar em temperatura ambiente.
2. Corte em bifes de 3cm de espessura.
3. Salgue com sal grosso.
4. Coloque na Parrilha em fogo alto.
5. Doure 3-4 minutos de cada lado para ponto médio.
6. Retire, deixe descansar 2 minutos antes de cortar.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Retire a peça da geladeira com antecedência para chegar em temperatura ambiente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte em bifes de 3cm de espessura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Salgue com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Coloque na Parrilha em fogo alto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Doure 3-4 minutos de cada lado para ponto médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Retire, deixe descansar 2 minutos antes de cortar.",
    "tempo_estimado_min": null
  }
]
```

## #29 — Medalhão de Frango

**modo_preparo original:**

```
1. Corte o peito de frango em medalhões de aproximadamente 100g.
2. Envolva cada medalhão com uma fatia de bacon, prendendo com palito se necessário.
3. Coloque na Parrilha em fogo médio.
4. Doure de todos os lados até o bacon ficar crocante e o frango cozido por completo (aproximadamente 15-18 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o peito de frango em medalhões de aproximadamente 100g.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Envolva cada medalhão com uma fatia de bacon, prendendo com palito se necessário.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Coloque na Parrilha em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Doure de todos os lados até o bacon ficar crocante e o frango cozido por completo (aproximadamente 15-18 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #30 — Picanha

**modo_preparo original:**

```
1. Corte a peça em bifes de 2,5 a 3cm no sentido contrário às fibras, mantendo a capa de gordura.
2. Salgue com sal grosso.
3. Coloque na Parrilha com a gordura voltada pra baixo primeiro.
4. Doure a gordura até derreter levemente, depois vire.
5. Doure o outro lado (média de 4 minutos por lado para ponto médio).
6. Retire e corte em fatias.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte a peça em bifes de 2,5 a 3cm no sentido contrário às fibras, mantendo a capa de gordura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Salgue com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Coloque na Parrilha com a gordura voltada pra baixo primeiro.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Doure a gordura até derreter levemente, depois vire.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Doure o outro lado (média de 4 minutos por lado para ponto médio).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Retire e corte em fatias.",
    "tempo_estimado_min": null
  }
]
```

## #31 — Mignon

**modo_preparo original:**

```
1. Corte o filé mignon em medalhões de 3-4cm de espessura.
2. Salgue com sal grosso.
3. Coloque na Parrilha em fogo alto.
4. Doure 3 minutos de cada lado para ponto médio (a peça é magra, não passe do ponto).
5. Retire e deixe descansar 2 minutos antes de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o filé mignon em medalhões de 3-4cm de espessura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Salgue com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Coloque na Parrilha em fogo alto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Doure 3 minutos de cada lado para ponto médio (a peça é magra, não passe do ponto).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Retire e deixe descansar 2 minutos antes de servir.",
    "tempo_estimado_min": null
  }
]
```

## #32 — Costela

**modo_preparo original:**

```
1. Limpar a peça: retirar o matambre da Costela.
2. Cortar em formato xadrez, fazendo incisões diagonais na superfície de gordura.
3. Untar com cerveja ou óleo para espalhar e fixar melhor o sal.
4. Temperar com sal grosso, espalhando por toda a peça.
5. Posicionar no fogo de chão, mantendo a peça a 60cm de distância de cada lado do fogo.
6. Assar por 5 horas, repondo carvão e lenha continuamente para manter a temperatura.
7. Servir fatiando a peça na frente do cliente.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Limpar a peça: retirar o matambre da Costela.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Cortar em formato xadrez, fazendo incisões diagonais na superfície de gordura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Untar com cerveja ou óleo para espalhar e fixar melhor o sal.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Temperar com sal grosso, espalhando por toda a peça.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Posicionar no fogo de chão, mantendo a peça a 60cm de distância de cada lado do fogo.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Assar por 5 horas, repondo carvão e lenha continuamente para manter a temperatura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 7,
    "descricao": "Servir fatiando a peça na frente do cliente.",
    "tempo_estimado_min": null
  }
]
```

## #33 — Coxa de Frango

**modo_preparo original:**

```
1. Tempere as coxas com orégano, mostarda, sal e páprica, misturando bem para cobrir toda a superfície.
2. Deixe marinar por pelo menos 15 minutos.
3. Espete e leve à brasa em fogo médio.
4. Vire periodicamente até dourar por igual e cozinhar por completo (aproximadamente 25 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere as coxas com orégano, mostarda, sal e páprica, misturando bem para cobrir toda a superfície.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Deixe marinar por pelo menos 15 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Espete e leve à brasa em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Vire periodicamente até dourar por igual e cozinhar por completo (aproximadamente 25 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #34 — Paleta Suína

**modo_preparo original:**

```
1. Tempere a peça inteira com sal grosso.
2. Espete a peça inteira no espeto.
3. Posicione na parte de cima da churrasqueira (calor mais brando/indireto).
4. Deixe assar lentamente, virando periodicamente, até a carne ficar macia o suficiente para desfiar (aproximadamente 2-3 horas).
5. Retire do espeto e fatie/desfie na hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Tempere a peça inteira com sal grosso.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Espete a peça inteira no espeto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Posicione na parte de cima da churrasqueira (calor mais brando/indireto).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Deixe assar lentamente, virando periodicamente, até a carne ficar macia o suficiente para desfiar (aproximadamente 2-3 horas).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Retire do espeto e fatie/desfie na hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #35 — Strogonoff com Batata Palha

**modo_preparo original:**

```
1. Corte a alcatra em tiras finas.
2. Doure a carne em fogo alto, aos poucos, para não soltar água.
3. Retire a carne, refogue a cebola na mesma panela até transparente.
4. Volte a carne, junte o cogumelo, ketchup e mostarda; misture bem.
5. Abaixe o fogo, adicione o creme de leite e misture até engrossar levemente (sem ferver).
6. Ajuste sal se necessário e retire do fogo.
7. Sirva a batata palha em recipiente separado, à parte do réchaud — nunca misturada ao strogonoff, para não perder a crocância.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte a alcatra em tiras finas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Doure a carne em fogo alto, aos poucos, para não soltar água.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Retire a carne, refogue a cebola na mesma panela até transparente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Volte a carne, junte o cogumelo, ketchup e mostarda; misture bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Abaixe o fogo, adicione o creme de leite e misture até engrossar levemente (sem ferver).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Ajuste sal se necessário e retire do fogo.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 7,
    "descricao": "Sirva a batata palha em recipiente separado, à parte do réchaud — nunca misturada ao strogonoff, para não perder a crocância.",
    "tempo_estimado_min": null
  }
]
```

## #36 — Escarola com Bacon

**modo_preparo original:**

```
1. Rasgue as folhas de escarola com as mãos (não corte com faca).
2. Frite o bacon em cubos até ficar bem crocante.
3. Disponha a escarola rasgada na travessa.
4. Jogue o bacon crocante por cima na hora de servir. Não misture nem refogue — é servida fria.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Rasgue as folhas de escarola com as mãos (não corte com faca).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Frite o bacon em cubos até ficar bem crocante.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Disponha a escarola rasgada na travessa.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Jogue o bacon crocante por cima na hora de servir. Não misture nem refogue — é servida fria.",
    "tempo_estimado_min": null
  }
]
```

## #37 — Tomate com Cebola

**modo_preparo original:**

```
1. Corte o tomate em rodelas ou gomos.
2. Corte a cebola roxa em fatias finas.
3. Disponha alternando tomate e cebola na travessa, sem temperar.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o tomate em rodelas ou gomos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte a cebola roxa em fatias finas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Disponha alternando tomate e cebola na travessa, sem temperar.",
    "tempo_estimado_min": null
  }
]
```

## #38 — Repolho com Frutas

**modo_preparo original:**

```
1. Corte o repolho em tiras bem finas.
2. Corte a manga em cubos pequenos.
3. Corte as uvas ao meio.
4. Misture o repolho, a manga e a uva com o iogurte natural.
5. Leve à geladeira até a hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o repolho em tiras bem finas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte a manga em cubos pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Corte as uvas ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Misture o repolho, a manga e a uva com o iogurte natural.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Leve à geladeira até a hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #39 — Tabule

**modo_preparo original:**

```
1. Hidrate o trigo para quibe em água fervente por 15 minutos e escorra bem.
2. Pique o tomate e a cebola em cubos pequenos.
3. Pique finamente a salsinha e a hortelã.
4. Misture o trigo hidratado com os vegetais picados, o suco de limão e o azeite.
5. Leve à geladeira por pelo menos 30 minutos antes de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Hidrate o trigo para quibe em água fervente por 15 minutos e escorra bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Pique o tomate e a cebola em cubos pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Pique finamente a salsinha e a hortelã.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Misture o trigo hidratado com os vegetais picados, o suco de limão e o azeite.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Leve à geladeira por pelo menos 30 minutos antes de servir.",
    "tempo_estimado_min": null
  }
]
```

## #40 — Salpicão de Frango

**modo_preparo original:**

```
1. Cozinhe o peito de frango e desfie ainda morno.
2. Passe a cenoura e a maçã na cabrita para cortar em cubos padronizados.
3. Misture o frango desfiado, a cenoura e a maçã.
4. Finalize com a maionese, misturando até incorporar.
5. Leve à geladeira até a hora de servir.
6. Adicione a batata palha somente no momento de servir, nunca antes — para manter a crocância.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhe o peito de frango e desfie ainda morno.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Passe a cenoura e a maçã na cabrita para cortar em cubos padronizados.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Misture o frango desfiado, a cenoura e a maçã.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Finalize com a maionese, misturando até incorporar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Leve à geladeira até a hora de servir.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Adicione a batata palha somente no momento de servir, nunca antes — para manter a crocância.",
    "tempo_estimado_min": null
  }
]
```

## #41 — Mix de Folhas Verdes

**modo_preparo original:**

```
1. Lave bem todas as folhas e frutas.
2. Corte a alface americana e roxa em tiras; mantenha a rúcula rasgada.
3. Corte a manga e o morango em cubos pequenos; corte as uvas ao meio; corte os tomates cereja ao meio.
4. Cozinhe os ovos de codorna, descasque e corte ao meio.
5. Monte todos os ingredientes na travessa, sem misturar demais, para preservar a aparência de cada item.
6. Mantenha refrigerado até a hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Lave bem todas as folhas e frutas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte a alface americana e roxa em tiras; mantenha a rúcula rasgada.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Corte a manga e o morango em cubos pequenos; corte as uvas ao meio; corte os tomates cereja ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Cozinhe os ovos de codorna, descasque e corte ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Monte todos os ingredientes na travessa, sem misturar demais, para preservar a aparência de cada item.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Mantenha refrigerado até a hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #42 — Tomate Cereja com Palmito

**modo_preparo original:**

```
1. Corte os tomates cereja ao meio.
2. Corte o palmito em rodelas.
3. Misture na travessa e mantenha refrigerado até servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte os tomates cereja ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte o palmito em rodelas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Misture na travessa e mantenha refrigerado até servir.",
    "tempo_estimado_min": null
  }
]
```

## #43 — Tomate Cereja

**modo_preparo original:**

```
1. Corte os tomates cereja ao meio.
2. Disponha na travessa e mantenha refrigerado até servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte os tomates cereja ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Disponha na travessa e mantenha refrigerado até servir.",
    "tempo_estimado_min": null
  }
]
```

## #45 — Farofa Simples

**modo_preparo original:**

```
1. Hidrate a proteína de soja em água quente por 10 minutos e escorra bem, espremendo o excesso de água.
2. Refogue a proteína de soja hidratada.
3. Dissolva o creme de cebola conforme instrução da embalagem e junte ao refogado.
4. Adicione a farinha de mandioca aos poucos, mexendo sempre.
5. Torre em fogo baixo até dourar por igual, sem queimar (aproximadamente 10 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Hidrate a proteína de soja em água quente por 10 minutos e escorra bem, espremendo o excesso de água.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Refogue a proteína de soja hidratada.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Dissolva o creme de cebola conforme instrução da embalagem e junte ao refogado.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Adicione a farinha de mandioca aos poucos, mexendo sempre.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Torre em fogo baixo até dourar por igual, sem queimar (aproximadamente 10 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #46 — Farofa de Bacon

**modo_preparo original:**

```
1. Frite o bacon em cubos até dourar e soltar a gordura.
2. Adicione a manteiga e refogue a cebola na mistura.
3. Junte a farinha de mandioca aos poucos, mexendo sempre.
4. Torre em fogo baixo até dourar por igual (aproximadamente 10 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Frite o bacon em cubos até dourar e soltar a gordura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Adicione a manteiga e refogue a cebola na mistura.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Junte a farinha de mandioca aos poucos, mexendo sempre.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Torre em fogo baixo até dourar por igual (aproximadamente 10 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #47 — Farofa Colorida

**modo_preparo original:**

```
1. Corte a cenoura e o pimentão em cubos pequenos.
2. Derreta a manteiga e refogue a cenoura e o pimentão até macios.
3. Adicione o milho verde escorrido.
4. Junte a farinha de mandioca aos poucos, mexendo sempre até dourar (aproximadamente 8 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte a cenoura e o pimentão em cubos pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Derreta a manteiga e refogue a cenoura e o pimentão até macios.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Adicione o milho verde escorrido.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Junte a farinha de mandioca aos poucos, mexendo sempre até dourar (aproximadamente 8 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #48 — Arroz à Grega

**modo_preparo original:**

```
1. Corte a cenoura em cubos pequenos e separe o brócolis em buquês miúdos.
2. Refogue a cenoura e o brócolis em óleo até amaciar levemente.
3. Adicione o colorau e a páprica, misturando bem.
4. Adicione o arroz e refogue por 2 minutos.
5. Junte água fervente na proporção 1:2, a ervilha e o milho escorridos.
6. Cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte a cenoura em cubos pequenos e separe o brócolis em buquês miúdos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Refogue a cenoura e o brócolis em óleo até amaciar levemente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Adicione o colorau e a páprica, misturando bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Adicione o arroz e refogue por 2 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Junte água fervente na proporção 1:2, a ervilha e o milho escorridos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #49 — Arroz Carreteiro

**modo_preparo original:**

```
1. Cozinhe a costela bovina até ficar macia o suficiente para desfiar; desfie em pedaços pequenos.
2. Corte os pimentões e o alho poró em cubos/rodelas finas.
3. Refogue a cebola, o alho poró e os pimentões até murchar.
4. Junte a costela desfiada e doure levemente.
5. Adicione o arroz e o açafrão, refogando por 2 minutos.
6. Junte água fervente na proporção 1:2 e cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhe a costela bovina até ficar macia o suficiente para desfiar; desfie em pedaços pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte os pimentões e o alho poró em cubos/rodelas finas.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Refogue a cebola, o alho poró e os pimentões até murchar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Junte a costela desfiada e doure levemente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Adicione o arroz e o açafrão, refogando por 2 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Junte água fervente na proporção 1:2 e cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #50 — Risoto de Frango

**modo_preparo original:**

```
1. Cozinhe o peito de frango, desfie ou corte em cubos pequenos, e mantenha o caldo de galinha diluído quente à parte.
2. Refogue a cebola e o alho na manteiga até transparentes.
3. Adicione o arroz arbóreo e toste por 2 minutos, mexendo sempre.
4. Junte o vinho branco e deixe evaporar o álcool.
5. Adicione o caldo quente aos poucos, concha por concha, mexendo sempre até cada porção ser absorvida.
6. Quando o arroz estiver "al dente", junte o frango.
7. Finalize fora do fogo com o parmesão, mexendo até cremoso.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhe o peito de frango, desfie ou corte em cubos pequenos, e mantenha o caldo de galinha diluído quente à parte.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Refogue a cebola e o alho na manteiga até transparentes.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Adicione o arroz arbóreo e toste por 2 minutos, mexendo sempre.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Junte o vinho branco e deixe evaporar o álcool.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Adicione o caldo quente aos poucos, concha por concha, mexendo sempre até cada porção ser absorvida.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Quando o arroz estiver \"al dente\", junte o frango.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 7,
    "descricao": "Finalize fora do fogo com o parmesão, mexendo até cremoso.",
    "tempo_estimado_min": null
  }
]
```

## #51 — Arroz Branco

**modo_preparo original:**

```
1. Refogue o alho triturado no óleo até perfumar, sem deixar dourar.
2. Adicione o arroz e refogue por 1-2 minutos.
3. Junte a água fervente e o sal.
4. Cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).
5. Solte os grãos com um garfo antes de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Refogue o alho triturado no óleo até perfumar, sem deixar dourar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Adicione o arroz e refogue por 1-2 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Junte a água fervente e o sal.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Cozinhe em fogo baixo, tampado, até secar (aproximadamente 15 minutos).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Solte os grãos com um garfo antes de servir.",
    "tempo_estimado_min": null
  }
]
```

## #52 — Lasanha à Bolonhesa

**modo_preparo original:**

```
1. Refogue a cebola, adicione a carne moída e doure até perder a cor rosada. Junte o molho de tomate e tempere com sal e pimenta; deixe apurar em fogo baixo por 15 minutos.
2. Derreta a manteiga, adicione a farinha e misture bem; junte o leite aos poucos, mexendo até engrossar (molho branco).
3. Cozinhe a massa de lasanha conforme indicação da embalagem, se pré-cozida.
4. Monte em camadas: molho branco, massa, molho bolonhesa, repetindo até acabar os ingredientes.
5. Cubra com queijo mussarela por cima.
6. Leve ao forno a 180°C coberto com papel-alumínio por 30 minutos; retire o papel e asse por mais 15 minutos até gratinar.
7. Deixe descansar 5-10 minutos antes de cortar.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Refogue a cebola, adicione a carne moída e doure até perder a cor rosada. Junte o molho de tomate e tempere com sal e pimenta; deixe apurar em fogo baixo por 15 minutos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Derreta a manteiga, adicione a farinha e misture bem; junte o leite aos poucos, mexendo até engrossar (molho branco).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Cozinhe a massa de lasanha conforme indicação da embalagem, se pré-cozida.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Monte em camadas: molho branco, massa, molho bolonhesa, repetindo até acabar os ingredientes.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Cubra com queijo mussarela por cima.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Leve ao forno a 180°C coberto com papel-alumínio por 30 minutos; retire o papel e asse por mais 15 minutos até gratinar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 7,
    "descricao": "Deixe descansar 5-10 minutos antes de cortar.",
    "tempo_estimado_min": null
  }
]
```

## #53 — Lasanha Quatro Queijos

**modo_preparo original:**

```
1. Derreta a manteiga, adicione um pouco de farinha se necessário e o leite aos poucos, mexendo até engrossar (molho branco).
2. Corte ou rale os quatro queijos.
3. Cozinhe a massa de lasanha conforme indicação da embalagem, se pré-cozida.
4. Monte em camadas: molho branco, massa, mistura dos queijos, repetindo até acabar.
5. Finalize a última camada com o gorgonzola e o parmesão por cima.
6. Leve ao forno a 180°C coberto por 30 minutos; retire a cobertura e asse mais 15 minutos até gratinar.
7. Deixe descansar antes de cortar.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Derreta a manteiga, adicione um pouco de farinha se necessário e o leite aos poucos, mexendo até engrossar (molho branco).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte ou rale os quatro queijos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Cozinhe a massa de lasanha conforme indicação da embalagem, se pré-cozida.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Monte em camadas: molho branco, massa, mistura dos queijos, repetindo até acabar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Finalize a última camada com o gorgonzola e o parmesão por cima.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Leve ao forno a 180°C coberto por 30 minutos; retire a cobertura e asse mais 15 minutos até gratinar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 7,
    "descricao": "Deixe descansar antes de cortar.",
    "tempo_estimado_min": null
  }
]
```

## #54 — Espaguete Alho e Óleo

**modo_preparo original:**

```
1. Cozinhe o espaguete em água fervente salgada até "al dente"; escorra reservando um pouco da água do cozimento.
2. Aqueça o azeite em fogo baixo e doure o alho fatiado, sem queimar.
3. Adicione a pimenta calabresa.
4. Junte o espaguete escorrido, misturando bem.
5. Finalize com salsinha picada.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhe o espaguete em água fervente salgada até \"al dente\"; escorra reservando um pouco da água do cozimento.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Aqueça o azeite em fogo baixo e doure o alho fatiado, sem queimar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Adicione a pimenta calabresa.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Junte o espaguete escorrido, misturando bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Finalize com salsinha picada.",
    "tempo_estimado_min": null
  }
]
```

## #55 — Maionese Tradicional

**modo_preparo original:**

```
1. Cozinhe a batata inglesa em cubos até macia; escorra e deixe esfriar.
2. Cozinhe a cenoura em cubos e a ervilha; escorra.
3. Bata o leite gelado no liquidificador; com o liquidificador ligado, acrescente o óleo em fio, lentamente, até dar ponto de maionese; junte o sal.
4. Misture a batata, a cenoura e a ervilha com a maionese caseira até incorporar bem.
5. Leve à geladeira até a hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Cozinhe a batata inglesa em cubos até macia; escorra e deixe esfriar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Cozinhe a cenoura em cubos e a ervilha; escorra.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Bata o leite gelado no liquidificador; com o liquidificador ligado, acrescente o óleo em fio, lentamente, até dar ponto de maionese; junte o sal.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Misture a batata, a cenoura e a ervilha com a maionese caseira até incorporar bem.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Leve à geladeira até a hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #56 — Abacaxi Assado

**modo_preparo original:**

```
1. Descasque o abacaxi inteiro, sem cortar.
2. Coloque o abacaxi inteiro na churrasqueira, em fogo baixo/indireto, logo no início do evento.
3. Deixe assar lentamente durante o evento, virando periodicamente.
4. Retire somente na hora de servir.
5. Corte em pedaços bem pequenos.
6. Misture o açúcar com a canela em pó e polvilhe sobre os pedaços na hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Descasque o abacaxi inteiro, sem cortar.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Coloque o abacaxi inteiro na churrasqueira, em fogo baixo/indireto, logo no início do evento.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Deixe assar lentamente durante o evento, virando periodicamente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Retire somente na hora de servir.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Corte em pedaços bem pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 6,
    "descricao": "Misture o açúcar com a canela em pó e polvilhe sobre os pedaços na hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #57 — Sorvete com Brownie

**modo_preparo original:**

```
1. Corte o brownie em cubos pequenos.
2. Sirva o sorvete de flocos em taça, finalizando com os cubos de brownie por cima na hora de servir.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o brownie em cubos pequenos.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Sirva o sorvete de flocos em taça, finalizando com os cubos de brownie por cima na hora de servir.",
    "tempo_estimado_min": null
  }
]
```

## #58 — Linguiça Pernil

**modo_preparo original:**

```
1. Espete as linguiças ou disponha diretamente na grelha.
2. Leve à brasa em fogo médio.
3. Gire periodicamente até dourar por igual (aproximadamente 20 minutos).
4. Corte em pedaços antes de servir, se necessário.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Espete as linguiças ou disponha diretamente na grelha.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Leve à brasa em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Gire periodicamente até dourar por igual (aproximadamente 20 minutos).",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Corte em pedaços antes de servir, se necessário.",
    "tempo_estimado_min": null
  }
]
```

## #59 — Queijo Coalho

**modo_preparo original:**

```
1. Corte o queijo coalho em cubos ou mantenha em espetos já preparados.
2. Leve à brasa em fogo médio-alto.
3. Doure rapidamente de todos os lados até formar uma crosta dourada por fora, mantendo o interior macio (aproximadamente 8-10 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Corte o queijo coalho em cubos ou mantenha em espetos já preparados.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Leve à brasa em fogo médio-alto.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Doure rapidamente de todos os lados até formar uma crosta dourada por fora, mantendo o interior macio (aproximadamente 8-10 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #60 — Linguiça Fina

**modo_preparo original:**

```
1. Espete as linguiças ou disponha diretamente na grelha.
2. Leve à brasa em fogo médio.
3. Gire periodicamente até dourar por igual (aproximadamente 15 minutos).
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Espete as linguiças ou disponha diretamente na grelha.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Leve à brasa em fogo médio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Gire periodicamente até dourar por igual (aproximadamente 15 minutos).",
    "tempo_estimado_min": null
  }
]
```

## #61 — Tábua de Frios

**modo_preparo original:**

```
1. Fatie o presunto e o salame finamente.
2. Corte o queijo provolone em cubos ou fatias.
3. Cozinhe os ovos de codorna, descasque e corte ao meio.
4. Disponha os frios e o queijo na tábua, intercalando por tipo.
5. Distribua os ovos de codorna, o pepino em conserva e as azeitonas nos espaços vazios.
```

**passos gerado:**

```json
[
  {
    "ordem": 1,
    "descricao": "Fatie o presunto e o salame finamente.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 2,
    "descricao": "Corte o queijo provolone em cubos ou fatias.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 3,
    "descricao": "Cozinhe os ovos de codorna, descasque e corte ao meio.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 4,
    "descricao": "Disponha os frios e o queijo na tábua, intercalando por tipo.",
    "tempo_estimado_min": null
  },
  {
    "ordem": 5,
    "descricao": "Distribua os ovos de codorna, o pepino em conserva e as azeitonas nos espaços vazios.",
    "tempo_estimado_min": null
  }
]
```
