import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { trocarUsuario } from "@/app/actions/usuario";

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
  {
    titulo: "Contratos e confirmação",
    descricao:
      "Envie o PDF, a extração preenche os dados e você só confirma. É a próxima etapa.",
    href: null,
  },
  {
    titulo: "Checklist de carregamento",
    descricao:
      "O que levar, onde está guardado e em qual veículo. Fica pra fase 2, depois que a central estiver rodando redondo.",
    href: null,
  },
];

export default async function Home() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

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
