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
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
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

      <nav
        aria-label="Visão da agenda"
        className="inline-flex w-fit gap-1 rounded-tile border border-borda bg-superficie p-1"
      >
        <Link
          href={`/agenda?visao=agenda&mes=${mesAtual}`}
          aria-current={visaoAtual === "agenda" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-[10px] px-[18px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${
            visaoAtual === "agenda"
              ? "bg-elevada text-texto shadow-realce"
              : "text-texto-suave hover:text-texto"
          }`}
        >
          Agenda
        </Link>
        <Link
          href="/agenda?visao=sequencia"
          aria-current={visaoAtual === "sequencia" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-[10px] px-[18px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${
            visaoAtual === "sequencia"
              ? "bg-elevada text-texto shadow-realce"
              : "text-texto-suave hover:text-texto"
          }`}
        >
          Em sequência
        </Link>
      </nav>

      {visaoAtual === "agenda" ? (
        <CalendarioEventos eventos={eventos} mesParam={mesAtual} />
      ) : (
        <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
          <ListaEventos eventos={eventos} />
        </div>
      )}
    </main>
  );
}
