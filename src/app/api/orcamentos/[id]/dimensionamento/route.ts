import { NextResponse } from "next/server";
import { calcularDimensionamentoOrcamento } from "@/lib/dimensionamento-cardapio";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orcamentoId = Number(id);

  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
    return NextResponse.json({ erro: "Id de orçamento inválido." }, { status: 400 });
  }

  const resultado = await calcularDimensionamentoOrcamento(orcamentoId);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return NextResponse.json(resultado);
}
