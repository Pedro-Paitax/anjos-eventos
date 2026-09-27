import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarInsumosDetalhado } from "@/lib/insumos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaInsumos } from "@/components/lista-insumos";

export default async function InsumosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const insumos = await listarInsumosDetalhado();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Insumos"
          subtitulo="Preço, unidade e fator de correção de cada insumo."
          voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
        />

        <div className="rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
          <ListaInsumos insumos={insumos} />
        </div>
      </div>
    </main>
  );
}
