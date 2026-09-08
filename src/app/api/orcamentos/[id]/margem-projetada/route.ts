import { NextResponse } from "next/server";
import { calcularMargemProjetada } from "@/lib/margem-orcamento";

// Rota interna — nunca expor num endpoint destinado ao simulador público
// (docs/DECISOES.md, "Arquitetura Financeira do Orçamento"). Autenticação
// de acesso fica a cargo do middleware/camada de auth do app quando essa
// rota for exposta além de uso interno.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
