// Segunda app do PM2 (a primeira, anjos-eventos-app, vive no ecosystem.config.js
// do servidor, que não é versionado por conter segredos). Este arquivo NÃO
// contém segredos: WORKER_TOKEN etc. vêm do arquivo .env ao lado (ignorado pelo Git).
//
// Uso no servidor (depois de `npm ci && npm run build` nesta pasta):
//   pm2 start ecosystem.config.cjs && pm2 save
const os = require("node:os");
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "anjos-whatsapp-worker",
      script: "dist/index.js",
      cwd: __dirname,
      node_args: "--env-file=.env",
      instances: 1, // NUNCA mais de uma: a sessão do WhatsApp é única
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      restart_delay: 5000,
      max_memory_restart: "300M",
      // Sem segredos. O node --env-file NÃO sobrescreve variáveis já definidas,
      // então estes valores valem; só WORKER_TOKEN vem do .env.
      env: {
        WORKER_HOST: "127.0.0.1",
        // O app Next.js usa 3001 (scripts/deploy-whatsapp-worker.sh confere).
        WORKER_PORT: "3100",
        // Sessão do Baileys no home, FORA desta pasta: o deploy nunca a toca.
        WORKER_AUTH_DIR: path.join(os.homedir(), "baileys_auth"),
      },
    },
  ],
};
