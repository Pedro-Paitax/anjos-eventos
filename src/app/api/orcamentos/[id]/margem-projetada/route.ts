import { NextResponse } from "next/server";
import { exigirUsuarioApi } from "@/lib/api-auth";
import { calcularMargemProjetada } from "@/lib/margem-orcamento";

// Rota interna — nunca expor num endpoint destinado ao simulador público
// (docs/DECISOES.md, "Arquitetura Financeira do Orçamento"). Exige usuário
// logado (exigirUsuarioApi: 401 sem sessão). Não existe middleware de auth no
// app: a checagem é feita em cada rota (docs/DECISOES.md, "Autenticação das
// APIs internas").
// Atenção: a margem devolvida NÃO é o lucro final do evento (exclui garçom e
// deslocamento; Margem Real não implementada) — ver o campo `escopo`.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const negado = await exigirUsuarioApi(request);
  if (negado) return negado;

  const { id } = await params;
  const orcamentoId = Number(id);

  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
    return NextResponse.json({ erro: "Id de orçamento inválido." }, { status: 400 });
  }

  const resultado = await calcularMargemProjetada(orcamentoId);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return NextResponse.json(resultado);
}
