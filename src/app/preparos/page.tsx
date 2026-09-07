import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarPreparos } from "@/lib/preparos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaPreparos } from "@/components/lista-preparos";

export default async function PreparosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const preparos = await listarPreparos();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Preparos"
          subtitulo="Fichas técnicas: preparos, composição e insumos."
          voltarPara={{ href: "/", rotulo: "← Início" }}
          acao={
            <Link
              href="/preparos/novo"
              className="inline-flex items-center justify-center rounded-[2px] bg-ember px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Novo Preparo
            </Link>
          }
        />

        <div className="rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
          <ListaPreparos preparos={preparos} />
        </div>
      </div>
    </main>
  );
}
