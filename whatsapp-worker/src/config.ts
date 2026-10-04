export type Config = {
  port: number;
  host: string;
  token: string;
  authDir: string;
  sendDelayMs: number;
};

/** Lê a configuração do ambiente. Falha cedo se o token faltar ou for fraco. */
export function carregarConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const token = env.WORKER_TOKEN ?? "";
  if (token.length < 16) {
    throw new Error("WORKER_TOKEN ausente ou curto demais (mínimo 16 caracteres).");
  }
  const port = Number(env.WORKER_PORT ?? 3100);
  const sendDelayMs = Number(env.WORKER_SEND_DELAY_MS ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("WORKER_PORT inválida.");
  }
  if (!Number.isFinite(sendDelayMs) || sendDelayMs < 0) {
    throw new Error("WORKER_SEND_DELAY_MS inválido.");
  }
  return {
    port,
    // Só loopback por padrão: quem fala com o worker é o servidor do ERP.
    host: env.WORKER_HOST ?? "127.0.0.1",
    token,
    authDir: env.WORKER_AUTH_DIR ?? "./auth",
    sendDelayMs,
  };
}
