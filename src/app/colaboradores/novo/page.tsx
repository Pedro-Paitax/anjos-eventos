import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { criarColaboradorAction } from "@/app/actions/colaborador";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioColaborador } from "@/components/formulario-colaborador";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo colaborador" };

export default async function NovoColaboradorPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
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
    </main>
  );
}
