import { NextResponse } from "next/server";
import { calcularCustoPreparo } from "@/lib/custo-preparo";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const preparoId = Number(id);

  if (!Number.isInteger(preparoId) || preparoId <= 0) {
    return NextResponse.json({ erro: "Id de preparo inválido." }, { status: 400 });
  }

  const resultado = await calcularCustoPreparo(preparoId);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return NextResponse.json(resultado);
}
