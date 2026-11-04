import { NextResponse } from "next/server";
import { tokenCronValido } from "@/lib/cron-auth";
import { executarResumoPrecos } from "@/lib/precos-resumo";

export const dynamic = "force-dynamic";

// Resumo diário de preços de insumos pelo WhatsApp. Disparada pelo crontab do SO
// (curl com Bearer CRON_TOKEN) — ver scripts/crontab-whatsapp.example e docs/DECISOES.md.
export async function POST(request: Request) {
  if (!tokenCronValido(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const resultado = await executarResumoPrecos();
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 503 });
  } catch (erro) {
    console.error("[cron] precos-resumo: falha inesperada:", (erro as Error).message);
    return NextResponse.json({ erro: "Falha inesperada." }, { status: 500 });
  }
}
