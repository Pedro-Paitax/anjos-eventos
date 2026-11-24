import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { listarPreparosConfirmadosEvento } from "@/lib/ficha-tecnica-evento";
import { gerarContratoEventoPdf } from "@/lib/contrato-evento-pdf";
import { gerarContratoSenhorChurrascoPdf } from "@/lib/contrato-senhor-churrasco-pdf";
import { EMPRESA_SENHOR_CHURRASCO } from "@/lib/decisoes-operacionais";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await obterUsuarioAtual())) {
    return Response.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const eventoId = Number(id);
  if (!/^\d+$/.test(id) || eventoId < 1 || eventoId > 2_147_483_647) {
    return Response.json({ erro: "Id de evento inválido." }, { status: 400 });
  }

  const evento = await obterEvento(eventoId);
  if (!evento) {
    return Response.json({ erro: "Evento não encontrado." }, { status: 404 });
  }
  if (evento.status !== "confirmado") {
    return Response.json({ erro: "O contrato só pode ser gerado para um evento confirmado." }, { status: 409 });
  }

  const preparos = await listarPreparosConfirmadosEvento(eventoId);
  const bytes = evento.empresa_nome === EMPRESA_SENHOR_CHURRASCO
    ? await gerarContratoSenhorChurrascoPdf(evento, preparos)
    : await gerarContratoEventoPdf(evento, preparos.map((preparo) => preparo.preparoNome));

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contrato-evento-' + eventoId + '.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
