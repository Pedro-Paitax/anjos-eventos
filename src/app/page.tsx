import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { trocarUsuario } from "@/app/actions/usuario";
import { listarEventosProximos } from "@/lib/eventos";
import { pendenciasPorEvento } from "@/lib/decisoes-operacionais";
import { corEmpresa, formatarData, formatarHora } from "@/lib/formatacao";

const DIAS_PROXIMOS_EVENTOS = 15;

const funcionalidades = [
  {
    titulo: "Agenda unificada",
    descricao: "Todos os eventos das três empresas, num só calendário.",
    href: "/agenda",
  },
  {
    titulo: "Senhor Churrasco",
    descricao: "Preparos, Cardápios Feitos e Simulador de Cardápio.",
    href: "/senhor-churrasco",
  },
];

export default async function Home() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const eventosProximos = await listarEventosProximos(DIAS_PROXIMOS_EVENTOS);
  const pendencias = await pendenciasPorEvento(eventosProximos.map((e) => e.id));

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-display text-sm italic text-brass">
            Anjos Eventos
          </p>
          <h1 className="font-display text-4xl italic text-paper sm:text-5xl">
            Bem-vindo, {usuarioAtual.nome}.
          </h1>
          <p className="max-w-sm text-sm text-paper-dim">
            Central de eventos do Buffet Senhor Churrasco, da Anjos Cerimonial
            e da Em Plena Natureza.
          </p>
        </div>

        <section className="flex w-full flex-col gap-3">
          <h2 className="font-display text-xl italic text-paper">
            Próximos {DIAS_PROXIMOS_EVENTOS} dias
          </h2>
          {eventosProximos.length === 0 ? (
            <p className="text-sm text-paper-dim">
              Nenhum evento nos próximos {DIAS_PROXIMOS_EVENTOS} dias.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {eventosProximos.map((evento) => (
                <li key={evento.id}>
                  <Link
                    href={`/agenda/${evento.id}`}
                    className="relative flex h-full flex-col gap-1 overflow-hidden rounded-[2px] bg-paper p-4 text-paper-ink shadow-[0_18px_28px_-16px_rgba(0,0,0,0.6)] transition hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-1.5 ${corEmpresa(evento.empresa_nome)}`}
                    />
                    <p className="font-display text-lg italic">
                      {evento.cliente}
                      {(pendencias.get(evento.id)?.length ?? 0) > 0 && (
                        <span
                          role="img"
                          aria-label="Item pendente"
                          title={pendencias.get(evento.id)?.join("; ")}
                          className="ml-2 not-italic"
                        >
                          ⚠️
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-paper-ink/70">
                      {formatarData(evento.data_evento)}, {formatarHora(evento.data_evento)}
                    </p>
                    <p className="text-xs text-paper-ink/60">{evento.empresa_nome}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          {funcionalidades.map((item) =>
            item.href ? (
              <Link
                key={item.titulo}
                href={item.href}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-[2px] bg-paper p-5 text-paper-ink shadow-[0_18px_28px_-16px_rgba(0,0,0,0.6)] transition hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1.5 bg-ember"
                />
                <p className="font-display text-lg italic">{item.titulo}</p>
                <p className="text-sm text-paper-ink/70">{item.descricao}</p>
              </Link>
            ) : (
              <div
                key={item.titulo}
                className="flex flex-col gap-2 rounded-[2px] border border-paper-dim/15 p-5"
              >
                <p className="font-display text-lg italic text-paper-dim">
                  {item.titulo}
                </p>
                <p className="text-sm text-paper-dim/60">{item.descricao}</p>
              </div>
            )
          )}
        </div>

        <form action={trocarUsuario}>
          <button
            type="submit"
            className="rounded-full px-1 text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Trocar usuário
          </button>
        </form>
      </div>
    </main>
  );
}
