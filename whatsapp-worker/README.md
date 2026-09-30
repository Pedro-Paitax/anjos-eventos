# WhatsApp Worker

Processo Node **isolado** que mantém a conexão com o WhatsApp e expõe uma API
HTTP local. Não é importado pelo Next.js: o ERP só o consulta por HTTP e
continua funcionando normalmente se este processo cair.

## Biblioteca: Baileys 6.7.24 (fixada)

Escolhida em vez do WPPConnect porque fala direto o protocolo WebSocket do
WhatsApp Web, **sem Chromium/Puppeteer**: menos memória e menos peças móveis
numa VPS ARM pequena, e nada de navegador para manter atualizado. A sessão é
gravada em disco com `useMultiFileAuthState`.

Versão fixada em `6.7.24` (linha estável). A `7.0.0-rc*` é release candidate; só
migrar quando virar estável. Biblioteca **não oficial**: o WhatsApp pode
bloquear o número. Por isso: fila sequencial com 3 s entre envios, sem
presença/online automático e volume baixo.

## API (só loopback, `Authorization: Bearer <WORKER_TOKEN>`)

| Rota | Corpo | Resposta |
|---|---|---|
| `GET /health` (sem token) | — | `{ok:true}` |
| `GET /status` | — | `{status:"connected"\|"disconnected"\|"connecting", qr_code: string\|null}` |
| `POST /send-message` | `{to, text}` | `{ok:true}` |
| `POST /send-document` | `{to, filename, pdf_base64, caption?}` | `{ok:true}` |
| `POST /logout` | — | desvincula o aparelho, apaga a sessão, volta a esperar QR |

- `qr_code` é uma data URL PNG (`<img src=...>`), presente enquanto aguarda leitura
  (nesse caso `status` é `disconnected`).
- `to`: número internacional com DDI (dígitos; `+`, espaços e hífens são aceitos).
- Envios entram numa fila estritamente sequencial (uma por vez, 3 s entre
  eles — `WORKER_SEND_DELAY_MS`). Respostas nunca ecoam telefone nem conteúdo.

## Segurança

- Sessão em `auth/` (chmod 700 em Linux) — **no `.gitignore`**, nunca versionar.
- `.env` (token) também ignorado. Números de telefone não ficam no repositório.
- Escuta só em `127.0.0.1` por padrão.

## Rodar

```
cp .env.example .env   # preencha WORKER_TOKEN
npm ci
npm run build
npm start              # ou: pm2 start ecosystem.config.cjs
npm run typecheck && npm run lint && npm test
```
