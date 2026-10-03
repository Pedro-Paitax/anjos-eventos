import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarPreparos } from "@/lib/preparos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaPreparos } from "@/components/lista-preparos";
import { botaoClasse } from "@/components/botao";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Preparos" };

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
          voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
          acao={
            <Link
              href="/preparos/novo"
              className={botaoClasse()}
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
