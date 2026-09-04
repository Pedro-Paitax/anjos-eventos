import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { trocarUsuario } from "@/app/actions/usuario";

const roteiro = [
  {
    titulo: "Agenda unificada",
    descricao: "Todos os eventos das três empresas, num só calendário.",
    href: "/agenda",
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
      <div className="flex w-full max-w-md flex-col items-center gap-10">
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

        <ol className="flex w-full list-none flex-col border-l border-paper-dim/20 pl-6">
          {roteiro.map((item) => (
            <li key={item.titulo} className="relative pb-8 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-brass bg-ink"
              />
              {item.href ? (
                <Link
                  href={item.href}
                  className="font-display text-lg italic text-paper underline decoration-brass/50 underline-offset-4 transition hover:decoration-brass"
                >
                  {item.titulo}
                </Link>
              ) : (
                <p className="font-display text-lg italic text-paper">
                  {item.titulo}
                </p>
              )}
              <p className="mt-1 text-sm text-paper-dim">{item.descricao}</p>
            </li>
          ))}
        </ol>

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
