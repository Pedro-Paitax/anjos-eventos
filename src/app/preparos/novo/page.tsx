import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarInsumos } from "@/lib/insumos";
import { criarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioPreparo } from "@/components/formulario-preparo";

export default async function NovoPreparoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const insumos = await listarInsumos();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Novo preparo"
          voltarPara={{ href: "/preparos", rotulo: "← Preparos" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioPreparo
            insumosDisponiveis={insumos}
            action={criarPreparoAction}
            rotuloEnvio="Cadastrar preparo"
          />
        </div>
      </div>
    </main>
  );
}
