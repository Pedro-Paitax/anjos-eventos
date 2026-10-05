import { redirect } from "next/navigation";
import { listarUsuarios, obterUsuarioAtual } from "@/lib/usuario-atual";
import { selecionarUsuario } from "@/app/actions/usuario";

// /login não usa o shell (components/shell.tsx devolve só o conteúdo nesta rota) e é público
// para o smoke test do deploy; por isso pode ter o próprio <h1>.
export default async function LoginPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual) {
    redirect("/");
  }

  const usuarios = await listarUsuarios();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 bg-fundo px-4 py-16 font-texto text-texto">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="inline-flex items-center gap-2.5 font-titulo text-xl font-bold tracking-tight">
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffc089,var(--color-brasa)_60%)] shadow-[0_0_16px_2px_rgb(242_117_63/0.55)]"
          />
          Anjos Eventos
        </p>
        <h1 className="font-titulo text-[clamp(30px,4vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">
          Quem está usando?
        </h1>
        <p className="max-w-xs text-texto-suave">De preferência não selecione outro usuário.</p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-2 gap-3.5 sm:grid-cols-3">
        {usuarios.map((usuario) => (
          <form key={usuario.id} action={selecionarUsuario}>
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <button
              type="submit"
              className="flex min-h-16 w-full items-center justify-center rounded-linha border border-borda bg-superficie px-4 py-3 text-[17px] font-semibold text-texto shadow-realce transition-[background-color,border-color] hover:border-borda-forte hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              {usuario.nome}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
