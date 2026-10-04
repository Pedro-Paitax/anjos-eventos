import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEventos } from "@/lib/eventos";
import { chaveAnoMes } from "@/lib/formatacao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaEventos } from "@/components/lista-eventos";
import { CalendarioEventos } from "@/components/calendario-eventos";
import { botaoClasse } from "@/components/botao";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agenda" };

type AgendaPageProps = {
  searchParams: Promise<{ visao?: string; mes?: string }>;
};

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { visao, mes } = await searchParams;
  const visaoAtual = visao === "sequencia" ? "sequencia" : "agenda";
  const mesAtual = mes ?? chaveAnoMes(new Date());

  const eventos = await listarEventos();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Agenda"
          subtitulo="Os eventos das três empresas."
          voltarPara={{ href: "/", rotulo: "← Início" }}
          acao={
            <Link
              href="/agenda/novo"
              className={botaoClasse()}
            >
              Novo evento
            </Link>
          }
        />

        <div className="inline-flex w-fit gap-1 rounded-[2px] bg-ink-soft p-1">
          <Link
            href={`/agenda?visao=agenda&mes=${mesAtual}`}
            className={`inline-flex min-h-11 items-center rounded-[2px] px-4 text-sm transition ${
              visaoAtual === "agenda"
                ? "bg-paper text-paper-ink"
                : "text-paper-dim hover:text-paper"
            }`}
          >
            Agenda
          </Link>
          <Link
            href="/agenda?visao=sequencia"
            className={`inline-flex min-h-11 items-center rounded-[2px] px-4 text-sm transition ${
              visaoAtual === "sequencia"
                ? "bg-paper text-paper-ink"
                : "text-paper-dim hover:text-paper"
            }`}
          >
            Em sequência
          </Link>
        </div>

        {visaoAtual === "agenda" ? (
          <CalendarioEventos eventos={eventos} mesParam={mesAtual} />
        ) : (
          <div className="rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
            <ListaEventos eventos={eventos} />
          </div>
        )}
      </div>
    </main>
  );
}
