import "server-only";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";

const COOKIE_NAME = "usuario_atual";

export type Usuario = { id: number; nome: string };

export async function listarUsuarios(): Promise<Usuario[]> {
  const { rows } = await pool.query<Usuario>(
    "SELECT id, nome FROM usuarios ORDER BY id"
  );
  return rows;
}

export async function definirUsuarioAtual(usuarioId: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, String(usuarioId), {
    httpOnly: true,
    // Acesso é via Tailscale em HTTP puro (sem TLS) — um cookie "Secure"
    // seria descartado pelo navegador e o login nunca se manteria.
    // A rede Tailscale já criptografa o transporte por conta própria.
    secure: false,
    sameSite: "lax",
    path: "/",
    // Sem maxAge: cookie de sessão, expira quando o navegador fecha —
    // pede o usuário de novo a cada nova abertura do app.
  });
}

export async function limparUsuarioAtual() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function obterUsuarioAtual(): Promise<Usuario | null> {
  const cookieStore = await cookies();
  const usuarioId = cookieStore.get(COOKIE_NAME)?.value;
  if (!usuarioId) return null;

  const { rows } = await pool.query<Usuario>(
    "SELECT id, nome FROM usuarios WHERE id = $1",
    [usuarioId]
  );
  return rows[0] ?? null;
}
