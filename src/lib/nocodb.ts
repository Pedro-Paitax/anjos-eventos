import "server-only";

export const NOCODB_BASE_URL = "http://100.77.218.36:8090/api/v2";

/**
 * GET genérico contra a API do NocoDB. Retorna `null` em 404 (registro
 * inexistente) e lança erro nos demais casos de falha (rede, 4xx/5xx).
 */
export async function nocodbGet<T>(path: string, token: string): Promise<T | null> {
  const resposta = await fetch(`${NOCODB_BASE_URL}${path}`, {
    headers: { "xc-token": token },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (resposta.status === 404) return null;

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`NocoDB respondeu ${resposta.status} em ${path}: ${texto}`);
  }

  return (await resposta.json()) as T;
}

async function nocodbEnviar<T>(
  metodo: "POST" | "PATCH" | "DELETE",
  path: string,
  corpo: unknown,
  token: string
): Promise<T> {
  const resposta = await fetch(`${NOCODB_BASE_URL}${path}`, {
    method: metodo,
    headers: { "xc-token": token, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`NocoDB respondeu ${resposta.status} em ${path}: ${texto}`);
  }

  return (await resposta.json()) as T;
}

/** POST genérico (cria registro). `corpo` é o objeto de campos do registro. */
export function nocodbPost<T>(path: string, corpo: unknown, token: string): Promise<T> {
  return nocodbEnviar<T>("POST", path, corpo, token);
}

/** PATCH genérico (atualiza registro). `corpo` deve incluir o `Id`. */
export function nocodbPatch<T>(path: string, corpo: unknown, token: string): Promise<T> {
  return nocodbEnviar<T>("PATCH", path, corpo, token);
}

/** DELETE genérico. `corpo` é `{ Id }`. */
export function nocodbDelete<T>(path: string, corpo: unknown, token: string): Promise<T> {
  return nocodbEnviar<T>("DELETE", path, corpo, token);
}

/** Lança erro claro se o token do NocoDB não estiver configurado. */
export function exigirToken(): string {
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) throw new Error("NOCODB_API_TOKEN não configurado.");
  return token;
}
