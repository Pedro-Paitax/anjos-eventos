import { carregarConfig } from "./config.js";
import { FilaEnvio } from "./fila-envio.js";
import { criarServidor } from "./servidor.js";
import { GerenciadorWhatsapp } from "./whatsapp.js";

const config = carregarConfig();
const whatsapp = new GerenciadorWhatsapp(config.authDir);
const fila = new FilaEnvio(config.sendDelayMs);
const servidor = criarServidor({ token: config.token, cliente: whatsapp, fila });

servidor.listen(config.port, config.host, () => {
  console.log(`[worker] HTTP em http://${config.host}:${config.port}`);
});

// O servidor HTTP sobe primeiro: /health e /status respondem mesmo que a
// conexão com o WhatsApp demore ou falhe.
whatsapp.iniciar().catch((erro: unknown) => {
  console.error("[worker] falha ao iniciar o WhatsApp:", String(erro));
});

async function encerrar(): Promise<void> {
  await whatsapp.parar();
  servidor.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", () => void encerrar());
process.on("SIGTERM", () => void encerrar());
