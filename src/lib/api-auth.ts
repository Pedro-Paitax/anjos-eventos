import "server-only";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

/**
 * Autenticação das rotas /api internas (custo, margem, dimensionamento).
 * Mesmo critério das páginas (cookie de usuário, `obterUsuarioAtual`), mas a
 * resposta é 401 em JSON, sem redirect e sem dado.
 *
 * Token de serviço (SMOKE_TOKEN): exceção só para o smoke test do deploy e o
 * script de paridade, que não têm cookie. Enviado em `x-smoke-token`,
 * comparado em tempo constante; sem SMOKE_TOKEN configurado (ou com menos de
 * 16 caracteres) nada é aceito por esse caminho. Dá acesso de leitura a custo
 * e margem: tratar como segredo, fora do Git.
 */
export const CABECALHO_TOKEN_SERVICO = "x-smoke-token";

export function tokenServicoValido(request: Request): boolean {
  const esperado = process.env.SMOKE_TOKEN;
  if (!esperado || esperado.length < 16) return false;
  const recebido = Buffer.from(request.headers.get(CABECALHO_TOKEN_SERVICO) ?? "");
  const correto = Buffer.from(esperado);
  return recebido.length === correto.length && timingSafeEqual(recebido, correto);
}

/**
 * Uso: `const negado = await exigirUsuarioApi(request); if (negado) return negado;`
 * Devolve null quando autorizado, ou a resposta 401 pronta.
 */
export async function exigirUsuarioApi(request: Request): Promise<NextResponse | null> {
  if (tokenServicoValido(request)) return null;
  const usuario = await obterUsuarioAtual();
  if (usuario) return null;
  return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
}
