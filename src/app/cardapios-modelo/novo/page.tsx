import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { criarCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioCardapioModelo } from "@/components/formulario-cardapio-modelo";

export default async function NovoCardapioModeloPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const preparosPorCategoria = await listarPreparosPorCategoria();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Novo cardápio"
          voltarPara={{ href: "/cardapios-modelo", rotulo: "← Cardápios Feitos" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioCardapioModelo
            preparosPorCategoria={preparosPorCategoria}
            action={criarCardapioModeloAction}
            rotuloEnvio="Cadastrar cardápio"
          />
        </div>
      </div>
    </main>
  );
}
