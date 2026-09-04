import { redirect } from "next/navigation";
import { listarUsuarios, obterUsuarioAtual } from "@/lib/usuario-atual";
import { selecionarUsuario } from "@/app/actions/usuario";

export default async function LoginPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (usuarioAtual) {
    redirect("/");
  }

  const usuarios = await listarUsuarios();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Quem está usando?
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Selecione seu nome. Usado apenas para registrar quem fez cada
          alteração.
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
        {usuarios.map((usuario) => (
          <form key={usuario.id} action={selecionarUsuario}>
            <input type="hidden" name="usuarioId" value={usuario.id} />
            <button
              type="submit"
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-lg font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                {usuario.nome.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-black dark:text-zinc-50">
                {usuario.nome}
              </span>
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
