import { timingSafeEqual } from "node:crypto";

/**
 * Autoriza chamadas de cron (crontab do SO via curl). Segredo em CRON_TOKEN,
 * enviado como `Authorization: Bearer <token>`. Sem CRON_TOKEN configurado,
 * nada é autorizado.
 */
export function tokenCronValido(request: Request): boolean {
  const esperado = process.env.CRON_TOKEN;
  if (!esperado || esperado.length < 16) return false;
  const recebido = Buffer.from(request.headers.get("authorization") ?? "");
  const correto = Buffer.from(`Bearer ${esperado}`);
  return recebido.length === correto.length && timingSafeEqual(recebido, correto);
}
