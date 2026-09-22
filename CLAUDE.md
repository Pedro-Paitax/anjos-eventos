# Anjos Eventos

Você está trabalhando no projeto Anjos Eventos.

Este arquivo contém as regras principais de operação do agente.

---

# CONTEXTO OBRIGATÓRIO

Antes de realizar alterações significativas, consulte os documentos relevantes:

- `docs/BRIEFING.MD`
- `docs/ARQUITETURA.MD`
- `docs/BANCO.md`
- `docs/REGRAS_NEGOCIO.md`

Esses documentos contêm contexto do negócio, arquitetura, banco e regras já validadas.

Não trate decisões documentadas como sugestões.

---

# REGRA MAIS IMPORTANTE

NÃO INVENTE.

Quando uma informação não estiver disponível:

1. procure no código;
2. procure na documentação;
3. procure no banco quando aplicável;
4. se continuar desconhecida, informe que a informação está ausente.

Não crie valores fictícios apenas para fazer o código funcionar.

---

# PRINCÍPIOS

## Simplicidade

Prefira a solução mais simples que resolva corretamente o problema.

Evite engenharia excessiva.

## Manutenção

O responsável técnico possui pouco tempo disponível para manutenção contínua.

Priorize:

- código simples;
- arquitetura clara;
- poucas dependências;
- comportamento previsível;
- documentação objetiva.

## Não quebrar decisões existentes

Antes de alterar uma regra de negócio, consulte:

`docs/REGRAS_NEGOCIO.md`

Se uma nova implementação entrar em conflito com uma regra documentada, não altere silenciosamente a regra.

Explique o conflito.

---

# EFICIÊNCIA DE CONTEXTO & GRAPHIFY

Para evitar consumo excessivo de tokens e saturação da janela de contexto:

- **Mapeamento de Dependências:** Antes de disparar buscas amplas (`grep`, `glob` ou leituras em massa de arquivos), consulte primeiro o arquivo `GRAPH_REPORT.md` para entender conexões de módulos, rotas e componentes.
- **Não inspecione arquivos brutos do Graphify:** Nunca leia arquivos dentro de `graphify-out/` (como `graph.json` ou `.graphify_analysis.json`). Apenas `GRAPH_REPORT.md` deve ser consultado.
- **Respostas e Modificações Enxutas:** Não reproduza arquivos inteiros nas respostas. Apresente apenas os trechos modificados ou diffs pontuais necessários para a alteração.
- **Escopo PWA:** Não leia nem processe arquivos binários ou estáticos em `public/icons/`, `public/images/`, `public/splash/` ou assets de mídia, exceto se solicitado explicitamente para alterar o `manifest.json`.

---

# PROCESSO DE TRABALHO

Para tarefas pequenas:

1. Entenda o pedido.
2. Inspecione o código relacionado.
3. Faça a alteração.
4. Teste.

Para tarefas médias ou grandes:

1. Entenda o pedido.
2. Inspecione a estrutura do projeto.
3. Leia a documentação relevante.
4. Identifique os arquivos afetados.
5. Identifique possíveis impactos.
6. Apresente um plano curto.
7. Implemente.
8. Execute testes, lint ou build apropriados.
9. Revise a alteração.
10. Explique o que foi alterado.

---

# BANCO DE DADOS

O banco central é PostgreSQL, acessado via Drizzle ORM.

O NocoDB foi a interface administrativa original, mas está sendo
descontinuado: o corte de produção para PostgreSQL/Oracle Cloud direto
foi concluído em 2026-09-22 (ver `docs/CHECKLIST_CORTE_PRODUCAO.md` e
`docs/DECISOES.md`, seção "Corte de Produção NocoDB → Oracle Cloud").
Não escrever código novo assumindo NocoDB como fonte de verdade.

Antes de alterar banco ou código relacionado ao banco:

- consulte `docs/BANCO.md`;
- verifique o schema existente;
- não invente tabelas ou campos;
- não duplique estruturas existentes.

Alterações destrutivas exigem atenção especial.

Nunca apagar dados ou estruturas sem deixar claro o impacto.

---

# NEGÓCIO

O sistema atende:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

O contexto completo está em:

`docs/BRIEFING.MD`

As regras funcionais estão em:

`docs/REGRAS_NEGOCIO.md`

---

# NEXT.JS

Existe um `AGENTS.md` na raiz do projeto.

Ele contém regras específicas geradas pelo Next.js.

Essas regras também devem ser respeitadas.

Quando trabalhar com APIs ou comportamentos específicos da versão instalada do Next.js, consulte a documentação disponível no projeto quando necessário.

Não assumir que APIs de versões antigas continuam válidas.

---

# QUALIDADE

Não considerar uma tarefa concluída apenas porque o código foi escrito.

Sempre que apropriado:

- execute lint;
- execute testes;
- execute build;
- verifique erros TypeScript;
- verifique comportamento relacionado à alteração.

Se não for possível executar alguma validação, informe isso.

---

# COMUNICAÇÃO

Responda de forma objetiva.

Ao terminar uma tarefa, informe:

1. o que foi alterado;
2. quais arquivos foram modificados;
3. quais testes/validações foram executados;
4. se existe algum ponto pendente.

Não diga que algo foi testado se não foi realmente testado.