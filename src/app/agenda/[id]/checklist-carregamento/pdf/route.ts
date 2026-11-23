import { NextResponse } from "next/server";
import { exigirUsuarioApi } from "@/lib/api-auth";
import {
  carregarDocumentoChecklist,
  gerarPdfChecklist,
  MOTIVO_SEM_PDF,
  nomeArquivoChecklist,
} from "@/lib/checklist-carregamento-documento";

export const dynamic = "force-dynamic";

const STATUS_SEM_PDF = {
  "nao-encontrado": 404,
  "nao-churrasco": 409,
  "sem-cardapio": 409,
  "sem-migracao": 503,
} as const;

// Checklist de carregamento (Senhor Churrasco). Exige usuário logado (401 sem sessão, sem dado).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const negado = await exigirUsuarioApi(request);
  if (negado) return negado;

  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return NextResponse.json({ erro: "Id de evento inválido." }, { status: 400 });
  }

  const documento = await carregarDocumentoChecklist(eventoId);
  if (documento.tipo !== "ok") {
    return NextResponse.json({ erro: MOTIVO_SEM_PDF[documento.tipo] }, { status: STATUS_SEM_PDF[documento.tipo] });
  }

  const bytes = await gerarPdfChecklist(documento.dados);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      // inline: abre no navegador, pronto para imprimir.
      "content-disposition": `inline; filename="${nomeArquivoChecklist(eventoId)}"`,
      "cache-control": "no-store",
    },
  });
}
