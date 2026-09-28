import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { eventoTemCardapioConfirmado, listarPreparosConfirmadosEvento } from "@/lib/ficha-tecnica-evento";
import { atualizarEventoAction } from "@/app/actions/evento";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioEventoChurrasco } from "@/components/formulario-evento-churrasco";
import { FormularioEventoGenerico } from "@/components/formulario-evento-generico";
import { BotaoExcluirEvento } from "@/components/botao-excluir-evento";

type PaginaEventoProps = {
  params: Promise<{ id: string }>;
};

export default async function EventoPage({ params }: PaginaEventoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const evento = await obterEvento(idNumero);

  if (!evento) {
    notFound();
  }

  const atualizarComId = atualizarEventoAction.bind(null, evento.id);
  const temCardapioConfirmado = await eventoTemCardapioConfirmado(evento.id);
  const cardapioConfirmado = temCardapioConfirmado
    ? await listarPreparosConfirmadosEvento(evento.id)
    : null;

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={evento.cliente}
          subtitulo={evento.empresa_nome}
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
          acao={
            <div className="flex items-center gap-3">
              {temCardapioConfirmado && (
                <Link
                  href={`/agenda/${evento.id}/fichas-tecnicas`}
                  target="_blank"
                  className="rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm text-paper transition hover:border-paper-dim hover:bg-paper/5"
                >
                  Exportar Fichas Técnicas
                </Link>
              )}
              <BotaoExcluirEvento eventoId={evento.id} clienteNome={evento.cliente} />
            </div>
          }
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          {evento.empresa_nome === "Buffet Senhor Churrasco" ? (
            <FormularioEventoChurrasco
              empresaId={evento.empresa_id}
              valoresIniciais={evento}
              preparosPorCategoria={await listarPreparosPorCategoria()}
              cardapiosModelo={await listarCardapiosModelo()}
              cardapioConfirmado={cardapioConfirmado}
              action={atualizarComId}
              rotuloEnvio="Salvar alterações"
            />
          ) : (
            <FormularioEventoGenerico
              empresaId={evento.empresa_id}
              valoresIniciais={evento}
              action={atualizarComId}
              rotuloEnvio="Salvar alterações"
            />
          )}
        </div>
      </div>
    </main>
  );
}
