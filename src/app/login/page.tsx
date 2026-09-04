import { redirect } from "next/navigation";
import { listarUsuarios, obterUsuarioAtual } from "@/lib/usuario-atual";
import { selecionarUsuario } from "@/app/actions/usuario";

const inclinacoes = [-3, 2, -1.5, 3, -2.5, 1.5];

export default async function LoginPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual) {
    redirect("/");
  }

  const usuarios = await listarUsuarios();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center justify-center gap-12 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-sm italic text-brass">
          Anjos Eventos
        </p>
        <h1 className="font-display text-4xl italic text-paper sm:text-5xl">
          Quem senta à mesa?
        </h1>
        <p className="max-w-xs text-sm text-paper-dim">
          Sem senha — escolha seu nome. É só pra saber quem confirmou o quê.
        </p>
      </div>

      <div className="flex w-full max-w-xl flex-wrap items-start justify-center gap-x-6 gap-y-8">
        {usuarios.map((usuario, i) => (
          <form
            key={usuario.id}
            action={selecionarUsuario}
            className="card-enter"
            style={{
              transform: `rotate(${inclinacoes[i % inclinacoes.length]}deg)`,
              ["--enter-order" as string]: i,
            }}
          >
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <button
              type="submit"
              className="group relative flex w-32 flex-col items-center gap-2 rounded-[2px] bg-paper px-4 pb-5 pt-5 text-paper-ink shadow-[0_18px_28px_-14px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out hover:-translate-y-1.5 hover:rotate-0 focus-visible:-translate-y-1.5 focus-visible:rotate-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              <span
                aria-hidden
                className="absolute inset-x-4 top-0 h-1.5 rounded-b-[1px] bg-ember"
              />
              <span className="font-display text-lg italic leading-tight">
                {usuario.nome}
              </span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
