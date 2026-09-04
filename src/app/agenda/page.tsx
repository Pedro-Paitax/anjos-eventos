import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEventos } from "@/lib/eventos";
import {
  corEmpresa,
  formatarData,
  formatarHora,
  formatarValor,
  rotuloStatus,
} from "@/lib/formatacao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";

export default async function AgendaPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const eventos = await listarEventos();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Agenda"
          subtitulo="Os eventos das três empresas, em ordem de data."
          voltarPara={{ href: "/", rotulo: "← Início" }}
          acao={
            <Link
              href="/agenda/novo"
              className="inline-flex items-center justify-center rounded-[2px] bg-ember px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Novo evento
            </Link>
          }
        />

        <div className="rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
          {eventos.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
              Nenhum evento ainda. Cadastre o primeiro pra começar a montar a
              agenda.
            </p>
          ) : (
            <ul className="divide-y divide-paper-ink/10">
              {eventos.map((evento) => (
                <li key={evento.id}>
                  <Link
                    href={`/agenda/${evento.id}`}
                    className="flex flex-col gap-2 px-6 py-4 transition hover:bg-paper-dim/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${corEmpresa(
                          evento.empresa_nome
                        )}`}
                      />
                      <div>
                        <p className="font-display text-lg italic">
                          {evento.cliente}
                        </p>
                        <p className="text-sm text-paper-ink/70">
                          {evento.empresa_nome}
                          {evento.tipo_evento ? `, ${evento.tipo_evento}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-1 pl-6 sm:items-end sm:pl-0">
                      <p className="text-sm">
                        {formatarData(evento.data_evento)},{" "}
                        {formatarHora(evento.data_evento)}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-paper-ink/70">
                        <span>{rotuloStatus(evento.status)}</span>
                        {evento.valor && (
                          <span>{formatarValor(evento.valor)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
