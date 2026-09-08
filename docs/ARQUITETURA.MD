# Arquitetura — Anjos Eventos

## Visão geral

O Anjos Eventos é um sistema interno para centralizar a operação de três empresas do grupo:

- Buffet Senhor Churrasco
- Anjos Cerimonial
- Em Plena Natureza Chácara de Eventos

O sistema deve priorizar simplicidade, confiabilidade e baixa manutenção.

O responsável técnico possui experiência profissional em engenharia de dados, mas disponibilidade limitada para manutenção contínua. Portanto, soluções excessivamente sofisticadas devem ser evitadas quando uma solução simples atende ao problema.

---

## Stack principal

### Aplicação

- Next.js
- Node.js
- TypeScript

### Banco de dados

- PostgreSQL
- NocoDB como interface administrativa sobre o PostgreSQL

### Infraestrutura

- Servidor doméstico
- Debian
- Docker
- Docker Compose
- Tailscale para acesso remoto

---

## Estrutura conceitual

```text
Cliente
   |
   v
Next.js
   |
   +--------------------+
   |                    |
   v                    v
Regras de negócio     PostgreSQL
                           ^
                           |
                        NocoDB