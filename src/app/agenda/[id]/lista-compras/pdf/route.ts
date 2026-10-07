import { NextResponse } from "next/server";
import { exigirUsuarioApi } from "@/lib/api-auth";
import {
  carregarDocumentoListaCompras,
  gerarPdfDoDocumento,
  nomeArquivoListaCompras,
} from "@/lib/lista-compras-documento";

export const dynamic = "force-dynamic";

// Exige usuário logado (exigirUsuarioApi: 401 sem sessão, sem corpo com dado).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const negado = await exigirUsuarioApi(request);
  if (negado) return negado;

  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId) || eventoId <= 0) {
    return NextResponse.json({ erro: "Id de evento inválido." }, { status: 400 });
  }

  const documento = await carregarDocumentoListaCompras(eventoId);
  if (!documento) return NextResponse.json({ erro: "Evento não encontrado." }, { status: 404 });
  if (documento.itens.length === 0) {
    return NextResponse.json({ erro: "Este evento não tem cardápio confirmado." }, { status: 409 });
  }

  const bytes = await gerarPdfDoDocumento(documento);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${nomeArquivoListaCompras(eventoId)}"`,
      "cache-control": "no-store",
    },
  });
}
