# WhatsApp Worker

Processo Node **isolado** que mantém a conexão com o WhatsApp e expõe uma API
HTTP local. Não é importado pelo Next.js: o ERP só o consulta por HTTP e
continua funcionando normalmente se este processo cair.

## Biblioteca: Baileys 7.0.0-rc14 (fixada)

Escolhida em vez do WPPConnect porque fala direto o protocolo WebSocket do
WhatsApp Web, **sem Chromium/Puppeteer**: menos memória e menos peças móveis
numa VPS ARM pequena. A sessão é gravada em disco com `useMultiFileAuthState`.

Versão fixada em `7.0.0-rc14` (a tag `latest` do npm; ainda não há 7.x estável).
Motivo da troca (2026-11-25): a 6.7.24 (linha legada, sem o sistema de LID do
WhatsApp) deixava as mensagens em "Aguardando mensagem", com "Bad MAC" no log.
Biblioteca **não oficial**: o WhatsApp pode bloquear o número. Por isso: fila
sequencial com 3 s entre envios, sem presença/online automático e volume baixo.

Mudanças da v7 que o código trata (guia: https://baileys.wiki/migration/v7.md):
- **LID.** O número é resolvido por `onWhatsApp` (JID canônico, resolve o nono dígito) e o
  Baileys 7 faz a troca PN → LID nas sessões. A sessão da v6 **não serve**: novo QR.
- **`getMessage`** com cache em memória (1000 mensagens, 24 h) das mensagens enviadas, para
  atender o pedido de reenvio do destinatário. Some ao reiniciar o worker.
- **Confirmação de envio:** `/send-*` só responde `ok` depois que o servidor confirma o id
  (status >= 2) em `WORKER_ACK_TIMEOUT_MS` (padrão 30000). Sem confirmação: **504**
  (`{ok:false}`) e registro no log; recusa (status 0): **502**. Atenção: o status 3
  (entregue) depende do aparelho do destinatário estar ligado; um celular desligado por mais
  que o tempo limite gera 504 mesmo que a mensagem chegue depois (o app não deve reenviar sem
  conferir).
- Não usa `fetchLatestBaileysVersion` (usa a versão do WhatsApp Web embutida na biblioteca).

## API (só loopback, `Authorization: Bearer <WORKER_TOKEN>`)

| Rota | Corpo | Resposta |
|---|---|---|
| `GET /health` (sem token) | — | `{ok:true}` |
| `GET /status` | — | `{status:"connected"\|"disconnected"\|"connecting", qr_code: string\|null}` |
| `POST /send-message` | `{to, text}` | `{ok:true}` (504 sem confirmação, 502 recusado, 422 sem WhatsApp) |
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
