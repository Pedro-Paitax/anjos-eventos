import { NextResponse } from "next/server";
import { calcularSimuladorOrcamento } from "@/lib/simulador-orcamento";
import { obterIpCliente, verificarRateLimit } from "@/lib/rate-limit";

// Rota PÚBLICA (docs/DECISOES.md, "Contrato do Simulador de Orçamento").
// Sem autenticação, por decisão explícita — proteção é só rate limit por
// IP, decisão registrada em conversa (não em docs/DECISOES.md ainda).
const LIMITE_REQUISICOES = 30;
const JANELA_MS = 60_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = obterIpCliente(request);
  const rateLimit = verificarRateLimit(ip, LIMITE_REQUISICOES, JANELA_MS);
  if (!rateLimit.permitido) {
    return NextResponse.json(
      { erro: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSegundos) } }
    );
  }

  const { id } = await params;
  const orcamentoId = Number(id);

  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
    return NextResponse.json({ erro: "Id de orçamento inválido." }, { status: 400 });
  }

  const resultado = await calcularSimuladorOrcamento(orcamentoId);

  if ("erro" in resultado) {
    return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
  }

  return NextResponse.json(resultado);
}
