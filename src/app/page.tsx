import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { trocarUsuario } from "@/app/actions/usuario";

export default async function Home() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-16 dark:bg-black">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Bem-vindo, {usuarioAtual.nome}
        </h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          Central de Eventos — em construção. Agenda e contratos chegam nas
          próximas etapas.
        </p>
      </div>

      <form action={trocarUsuario}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Trocar usuário
        </button>
      </form>
    </main>
  );
}
