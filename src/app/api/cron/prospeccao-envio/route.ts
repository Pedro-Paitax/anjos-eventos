import { NextResponse } from "next/server";
import { tokenCronValido } from "@/lib/cron-auth";
import { executarRodadaEnvio } from "@/lib/prospeccao-envio-auto";

export const dynamic = "force-dynamic";
// Gemini (até 30 s) + worker (fila de 3 s) cabem folgados.
export const maxDuration = 120;

// Disparada pelo crontab do SO (curl com Bearer CRON_TOKEN), UMA vez a cada ~20 min no horário
// comercial; cada chamada envia no máximo um lead. Desligado por padrão — ver docs/PROSPECCAO.md.
export async function POST(request: Request) {
  if (!tokenCronValido(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    return NextResponse.json(await executarRodadaEnvio());
  } catch (erro) {
    // Sem detalhes: a mensagem de erro do banco/worker não deve vazar dado de lead.
    console.error("[cron prospeccao-envio] falha inesperada:", (erro as Error).name);
    return NextResponse.json({ erro: "Falha inesperada." }, { status: 500 });
  }
}
