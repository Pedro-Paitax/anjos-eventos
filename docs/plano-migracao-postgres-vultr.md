# Migração de Infraestrutura e Remoção do NocoDB — Plano Consolidado

Status: APROVADA (arquitetura); execução pendente

## Nota de governança (ADR formal)

Esta decisão **substitui** a decisão anterior registrada em `docs/DECISOES.md`
sob "Banco central" ("PostgreSQL é o banco de dados central. NocoDB
funciona como interface administrativa sobre o PostgreSQL"). Aquela
decisão fica marcada como `SUBSTITUÍDA` — não removida do histórico, mas
não mais válida como guia de implementação. Nenhum código deve ser escrito
assumindo a coexistência com o NocoDB a partir do momento em que este
documento for aplicado ao `docs/DECISOES.md` real do repositório.

## Contexto e motivo

Dois problemas convergindo na mesma decisão:

1. **Infraestrutura:** o servidor atual ("ender", doméstico) tem 3,7GB de
   RAM dividida entre NocoDB, dois Postgres, Claude Code e serviços de
   impressora 3D pessoal do Pedro — sem relação com o negócio. Já causou
   falha real (OOM/falta de memória) tentando rodar build/testes durante
   a correção do bug de mistura de unidades.
2. **Arquitetura:** o NocoDB foi adotado no início do projeto só pela
   conveniência de interface visual de cadastro. Boa parte do CRUD real
   já foi construída dentro do próprio app desde então (Preparos,
   Composição, Cardápios Feitos) — a dependência do NocoDB hoje é mais
   limitação (risco de "State Drift" entre a interface dele e o Postgres
   real por trás; instabilidade de timeout já documentada) do que ajuda.

**Decisão:** abandonar o NocoDB por completo, migrar para PostgreSQL puro,
acessado via Drizzle ORM — simultaneamente à migração de infraestrutura
para uma VPS dedicada (Vultr, 2GB RAM, região definida por custo — ver
nota abaixo).

NOTA SOBRE REGIÃO E DIMENSIONAMENTO (correção pós-provisionamento inicial):
a primeira tentativa de provisionamento (8GB, São Paulo) saiu a $60/mês —
muito acima do orçamento-alvo. Dois ajustes, validados em consenso técnico:
(1) o dimensionamento de 8GB foi calculado em cima do consumo do NocoDB
(principal consumidor de RAM da arquitetura antiga); com PostgreSQL puro
+ Next.js compilado fora do servidor, 2GB é suficiente com margem de
segurança (não 1GB — decisão deliberada de manter folga, dado que
subdimensionamento já causou problema real nesta mesma migração). (2) O
Pedro decidiu que presença física no Brasil deixou de ser requisito
obrigatório — 100ms de latência adicional (região dos EUA vs. São Paulo)
é imperceptível para um painel administrativo de preenchimento de
formulário, não uma aplicação sensível a tempo real. Região final: a mais
barata disponível (tipicamente EUA-Leste, ex: Miami), mantendo backup
automático habilitado.

## Ordem de execução (invertida da proposta original — corrigida)

O servidor atual NÃO deve ser usado como ambiente de teste para a
refatoração — um hardware que já sofreu OOM sob carga concorrente
mascararia erros de migração (timeouts de gravação) atrás de problemas de
memória, tornando impossível distinguir bug de lógica de limitação de
hardware.

1. Provisionar a VPS nova (Vultr, São Paulo, 8GB RAM, Debian) limpa.
2. Desenhar o schema nativo do Postgres diretamente na VPS nova (sem
   herdar a estrutura suja do NocoDB — prefixos `nc_`, tabelas de
   metadado e junções abstratas que ele cria internamente).
3. Escrever um script de extração (ETL) que **consome a API REST do
   NocoDB** no servidor antigo (não lê o Postgres físico sujo dele
   diretamente) e insere os dados já limpos no schema novo via Drizzle.
   A API do NocoDB atua como filtro purificador do dado.
4. Validar a matemática e a integridade transacional na VPS nova (ver
   seção de validação abaixo).
5. Só depois de validado: o ender deixa de hospedar o banco de produção.
   Nenhum trabalho de infraestrutura é jogado fora, porque nunca foi
   feito duas vezes.

## Decisões técnicas

**Camada de acesso ao banco:** Drizzle ORM. Escolhido por ser fortemente
tipado (evita erro de nome de coluna só descoberto em produção), sem
motor pesado em background (ao contrário do Prisma, que roda um query
engine em Rust consumindo memória extra), com sintaxe próxima de SQL puro
— controle do "metal" sem perder garantia de tipagem do TypeScript.

**Build/CI:** a compilação do Next.js e o empacotamento Docker NUNCA
rodam na VPS de produção. Build acontece localmente ou via GitHub
Actions; apenas a imagem já pronta é enviada para a VPS executar.

**PostgreSQL:** instância única, com dois bancos lógicos dentro dela
(substituindo os dois Postgres separados atuais), reduzindo RAM base.

**Governança de tabelas estáticas** (Macro_Categorias, Headers_UI,
Hierarquia_Proteina — mutação rara): sem tela administrativa customizada
própria (seria desperdício de esforço de engenharia para dado que quase
não muda). Editadas via cliente de banco visual (DBeaver ou TablePlus),
protegidas pela integridade referencial nativa do Postgres (Foreign Keys
reais, ao contrário do NocoDB, que não garante isso na mesma medida).

## Disaster Recovery (requisito inegociável da migração)

1. **Nível de hardware:** ativar Automated Snapshots diários da Vultr —
   restauração da máquina inteira com um clique, se necessário.
2. **Nível de dado:** cron job diário (madrugada) rodando `pg_dump`,
   comprimindo e enviando o arquivo para armazenamento fora da VPS (ex:
   Google Drive, S3, Cloudflare R2). Snapshot de hardware não substitui
   backup lógico do dado.

## Validação da migração (dupla, não apenas uma)

**Eixo 1 — Catálogo (já em uso no projeto):** rodar os 3 cálculos de
referência já validados manualmente durante todo o desenvolvimento —
Vinagrete (≈R$16,96), Alcatra Grelhada (≈R$64,93), Arroz Branco com Alho
Crispy (≈R$20,07) — contra o banco pós-migração.

**Eixo 2 — Transacional/Histórico (novo, adicionado por identificar
lacuna no plano original):** o Eixo 1 sozinho NÃO valida Orçamentos e
Eventos já confirmados — se a migração falhar nas tabelas de junção ou
nos valores já congelados (snapshots de custo, pacotes fixos), um evento
já vendido pode mudar de valor silenciosamente.

Teste de Snapshot Transacional, obrigatório antes de considerar a
migração completa:
1. Selecionar 5 Orçamentos complexos reais do sistema atual (cobrindo:
   pacote fixo, garçom adicional, criança/meia-entrada, cortes variados).
2. Salvar o payload JSON final exato que o sistema retorna HOJE para cada
   um.
3. Após migrar os dados para o schema novo, disparar o recálculo desses
   mesmos 5 Orçamentos no motor rodando sobre o Postgres puro.
4. A diferença entre antes e depois — valores, quantidades, nomenclatura
   — deve ser estritamente zero. Qualquer divergência bloqueia a
   migração até ser explicada e corrigida.
