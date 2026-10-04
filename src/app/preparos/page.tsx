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
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
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

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        <ListaPreparos preparos={preparos} />
      </div>
    </main>
  );
}
