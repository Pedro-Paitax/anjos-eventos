# Documentação Técnica — Sistema Central de Eventos

**Grupo:** Buffet Senhor Churrasco · Anjos Cerimonial · Em Plena Natureza Chácara de Eventos
**Stakeholder / Dono do Negócio:** Pedro
**Papel deste documento:** especificação de referência para construção do sistema, cobrindo o contexto de negócio, as decisões de arquitetura e o motivo de cada uma delas.

---

## 1. Contexto de Negócio

O grupo é formado por **3 empresas independentes**, cada uma fechando contratos e clientes próprios (às vezes o mesmo cliente contrata mais de uma):

- **Buffet Senhor Churrasco** — operação de comida, fichas técnicas e logística de carregamento para eventos.
- **Anjos Cerimonial** — cerimonial de eventos, hoje é essencialmente gestão de contratos e informações.
- **Em Plena Natureza Chácara de Eventos** — espaço de eventos, também essencialmente contratos e informações.

**Problema central hoje:** não existe organização centralizada. A operação vive "de cabeça" — informações de eventos, contratos e observações estão espalhadas ou apenas na memória das pessoas envolvidas.

**Dor mais concreta e recorrente:** no dia do evento do Buffet Senhor Churrasco, é comum esquecer itens ao carregar o carro, porque ninguém tem uma lista confiável do que precisa ir, nem sabe onde cada item está guardado.

**Restrição real de execução:** Pedro é engenheiro de dados profissionalmente, mas tem **zero tempo livre nos finais de semana** para desenvolver. Toda decisão de arquitetura abaixo foi tomada para minimizar esforço de manutenção contínua, não só esforço de construção inicial.

---

## 2. Objetivo do Sistema

Um sistema interno, full stack, que:

1. Centraliza a **agenda dos eventos das 3 empresas** em um único lugar.
2. Organiza **contratos e observações** por evento, eliminando dependência de memória.
3. Automatiza a **geração do checklist de carregamento** do Buffet Senhor Churrasco no dia do evento, cobrindo o que pegar, onde está guardado e em qual veículo vai.
4. É acessível **de qualquer lugar pela internet**, como um PWA.

---

## 3. Escopo por Fase

Não é um sistema construído de uma vez — é dividido em fases para caber no tempo real disponível.

### Fase 1 (prioridade atual): Central de Eventos
- Agenda unificada das 3 empresas.
- Upload de contrato (PDF) com **extração automática de dados** para preencher o evento.
- Acesso de todos os 3 usuários a todas as informações.

### Fase 2: Checklist de Carregamento (Buffet Senhor Churrasco)
- Cálculo automático de itens de "kit padrão" (escaláveis por nº de convidados).
- Itens variáveis vindos do cardápio do evento (ligado às fichas técnicas já existentes na base "senhor churrasco" no NocoDB).
- Checklist com validação de quantidade, exibido em tela touch na cozinha/área de montagem.
- Seleção manual do veículo de carga (Master, Kombi nova, Kombi velha).

### Fase 3 (futura, não detalhada ainda): 
- Módulo de contratos/observações mais robusto para Anjos Cerimonial e Em Plena Natureza.
- Possível automação da geração de cardápio a partir de regras de tipo de evento + nº de convidados.

Este documento detalha a **Fase 1**, com o modelo de dados já preparado para acomodar a Fase 2 sem retrabalho.

---

## 4. Decisões de Arquitetura e Por Quê

| Decisão | Motivo |
|---|---|
| **Stack: Next.js (Node.js) full stack** | Escolha do Pedro — um único framework cobre frontend e backend (API routes), reduzindo a superfície de manutenção. |
| **Banco de dados: PostgreSQL** | Já é a base de dados usada no ecossistema atual (NocoDB roda sobre Postgres); mantém consistência técnica. |
| **PWA** | Requisito explícito — permite instalar como app no celular/tela touch, funciona bem em navegador, sem precisar publicar em loja de app. |
| **Hospedagem: servidor doméstico "ender"** | Já existe, já tem Docker instalado e Tailscale configurado para acesso remoto seguro, custo zero. Estratégia é validar tudo ali antes de considerar migração para cloud. |
| **Login simples por nome, sem senha** | Apenas 3 usuários de confiança, ambiente já protegido por Tailscale (não exposto publicamente). Prioriza simplicidade sobre segurança de nível corporativo, o que é adequado ao contexto. |
| **Todos com acesso total (leitura e edição)** | Decisão explícita do negócio — não há necessidade de separar permissão por empresa neste momento. |
| **Extração de contrato via leitura direta de texto do PDF (sem OCR)** | O contrato nasce em PDF com texto real (não é digitalizado/scaneado), e sempre segue o mesmo modelo — permite extração guiada por template, mais rápida e confiável que OCR genérico. |
| **Confirmação manual após extração automática** | A extração por IA não é infalível; a etapa de confirmação evita que um erro de leitura vá parar direto na agenda sem revisão humana. |
| **Portas de serviço fora da faixa 8080-8090** | Essas portas já estão em uso no servidor "ender" por outras aplicações. |

---

## 5. Modelo de Dados (Fase 1 + preparação para Fase 2)

### `empresas`
| Campo | Tipo | Observação |
|---|---|---|
| id | serial (PK) | |
| nome | text | Buffet Senhor Churrasco / Anjos Cerimonial / Em Plena Natureza |

### `eventos`
| Campo | Tipo | Observação |
|---|---|---|
| id | serial (PK) | |
| empresa_id | FK → empresas | |
| cliente | text | |
| data_evento | date/timestamp | |
| tipo_evento | text | ex: casamento, aniversário, corporativo |
| num_convidados | integer | usado no cálculo de kit padrão (Fase 2) |
| status | text | orçado / confirmado / realizado / cancelado |
| valor | numeric | |
| veiculo | text (nullable) | Master / Kombi nova / Kombi velha — só relevante quando empresa = Senhor Churrasco |
| observacoes | text | campo livre |

### `contratos`
| Campo | Tipo | Observação |
|---|---|---|
| id | serial (PK) | |
| evento_id | FK → eventos | |
| arquivo_pdf | text (path/URL) | armazenamento do PDF original |
| dados_extraidos_raw | jsonb | resultado bruto da extração automática, para auditoria |
| confirmado_por | text | nome do usuário que validou a extração |
| confirmado_em | timestamp | |

### `usuarios`
| Campo | Tipo | Observação |
|---|---|---|
| id | serial (PK) | |
| nome | text | login = seleção do nome, sem senha |

### Preparação para Fase 2 (não implementado ainda, apenas reservado no schema):

**`itens_kit_padrao`** — item, `qtd_base`, `pessoas_base`, unidade (ex: 2 detergentes a cada 50 pessoas).
**`cardapio_evento`** — evento_id, item_id (referência à base de fichas técnicas do NocoDB "senhor churrasco"), quantidade.
**`checklist_evento`** — consolida kit padrão calculado + cardápio do evento, com campos `separado` (bool) e `quantidade_real` (para validar contra a quantidade sugerida).

> Regra de cálculo do kit padrão (Fase 2): `quantidade = TETO(convidados / pessoas_base) × qtd_base`, sempre arredondando para cima. Cada item tem sua própria proporção — não existe fórmula única.

---

## 6. Fluxo: Upload de Contrato → Agenda

1. Usuário faz upload do PDF do contrato pela interface.
2. Backend extrai o texto do PDF (biblioteca de parsing de texto, sem OCR).
3. Aplica regras posicionais baseadas no modelo fixo de contrato para identificar: cliente, data, tipo de evento, nº de convidados, valor, empresa.
4. Sistema apresenta os dados extraídos numa tela de **confirmação** — usuário revisa e corrige se necessário.
5. Ao confirmar, o sistema grava o evento na tabela `eventos` e o contrato original na tabela `contratos`, vinculado ao evento.
6. Evento aparece automaticamente na agenda unificada das 3 empresas.

---

## 7. Autenticação

- Tela de login exibe os 3 nomes cadastrados; usuário seleciona o seu, sem senha.
- Nome selecionado é usado para registrar quem confirmou cada extração de contrato (campo `confirmado_por`), mantendo rastreabilidade sem exigir senha.

---

## 8. Infraestrutura

- **Ambiente:** servidor doméstico "ender" (Debian, Docker já instalado, Tailscale configurado).
- **Containers previstos:** aplicação Next.js + banco PostgreSQL, cada um em container próprio.
- **Portas:** a definir fora da faixa 8080-8090 (já ocupada por outros serviços no ender).
- **Acesso remoto:** via Tailscale, sem exposição pública direta à internet — adequado ao volume de 3 usuários de confiança.

---

## 9. Riscos e Pontos de Atenção

- **Zero tempo de desenvolvimento nos finais de semana**: o plano de fases existe justamente para evitar que o projeto pare no meio. Cada fase deve ser fechada e estabilizada antes de iniciar a próxima.
- **Extração automática de contrato não é 100% infalível**: mitigado pela etapa de confirmação manual antes de gravar na agenda.
- **Dependência do servidor doméstico**: hospedar no "ender" tem custo zero, mas depende da estabilidade da energia/rede de casa. Migração para cloud fica como opção futura caso isso vire um problema.
- **Login sem senha**: adequado ao contexto atual (3 pessoas de confiança, acesso via Tailscale), mas não deve ser replicado se o sistema crescer para mais usuários ou acesso público.

---

## 10. Próximos Passos

1. Validar esta documentação com o Stakeholder (Pedro).
2. Estruturar o repositório do projeto (Next.js + Postgres + Docker Compose).
3. Implementar o schema do banco de dados (Fase 1).
4. Implementar a tela de login por nome.
5. Implementar upload de contrato + extração + tela de confirmação.
6. Implementar a agenda unificada.
7. Deploy no servidor "ender", em portas fora de 8080-8090.
8. Validar em uso real antes de iniciar a Fase 2 (checklist do buffet).