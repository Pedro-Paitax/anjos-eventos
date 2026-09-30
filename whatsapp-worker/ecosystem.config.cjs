// Segunda app do PM2 (a primeira, anjos-eventos-app, vive no ecosystem.config.js
// do servidor, que não é versionado por conter segredos). Este arquivo NÃO
// contém segredos: WORKER_TOKEN etc. vêm do arquivo .env ao lado (ignorado pelo Git).
//
// Uso no servidor (depois de `npm ci && npm run build` nesta pasta):
//   pm2 start ecosystem.config.cjs && pm2 save
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
    },
  ],
};
