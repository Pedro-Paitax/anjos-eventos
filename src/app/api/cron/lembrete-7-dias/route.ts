import { NextResponse } from "next/server";
import { tokenCronValido } from "@/lib/cron-auth";
import { executarLembrete7Dias } from "@/lib/automacao-whatsapp";

export const dynamic = "force-dynamic";

// Disparada pelo crontab do SO (curl com Bearer CRON_TOKEN) — ver docs/DECISOES.md.
export async function POST(request: Request) {
  if (!tokenCronValido(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  try {
    const resultado = await executarLembrete7Dias();
    return NextResponse.json(resultado, { status: resultado.ok ? 200 : 503 });
  } catch (erro) {
    console.error("[cron] falha inesperada:", (erro as Error).message);
    return NextResponse.json({ erro: "Falha inesperada." }, { status: 500 });
  }
}
