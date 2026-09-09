import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaCardapiosModelo } from "@/components/lista-cardapios-modelo";

export default async function CardapiosModeloPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const cardapios = await listarCardapiosModelo();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Cardápios Feitos"
          subtitulo="Cardápios pré-montados pra agilizar o Criar Evento (Senhor Churrasco)."
          voltarPara={{ href: "/", rotulo: "← Início" }}
          acao={
            <Link
              href="/cardapios-modelo/novo"
              className="inline-flex items-center justify-center rounded-[2px] bg-ember px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              Novo Cardápio
            </Link>
          }
        />

        <ListaCardapiosModelo cardapios={cardapios} />
      </div>
    </main>
  );
}
