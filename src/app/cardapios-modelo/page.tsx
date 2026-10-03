import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaCardapiosModelo } from "@/components/lista-cardapios-modelo";
import { botaoClasse } from "@/components/botao";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cardápios Feitos" };

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
          voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
          acao={
            <Link
              href="/cardapios-modelo/novo"
              className={botaoClasse()}
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
