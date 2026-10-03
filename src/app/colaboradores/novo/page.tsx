import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { criarColaboradorAction } from "@/app/actions/colaborador";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioColaborador } from "@/components/formulario-colaborador";
import { Painel } from "@/components/painel";

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
        <Painel>
          <FormularioColaborador
            action={criarColaboradorAction}
            rotuloEnvio="Cadastrar"
          />
        </Painel>
      </div>
    </main>
  );
}
