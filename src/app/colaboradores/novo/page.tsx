import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { criarColaboradorAction } from "@/app/actions/colaborador";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioColaborador } from "@/components/formulario-colaborador";

export default async function NovoColaboradorPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Novo colaborador"
          voltarPara={{ href: "/colaboradores", rotulo: "← Colaboradores" }}
        />
        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioColaborador
            action={criarColaboradorAction}
            rotuloEnvio="Cadastrar"
          />
        </div>
      </div>
    </main>
  );
}
