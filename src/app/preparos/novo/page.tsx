import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarInsumos } from "@/lib/insumos";
import { criarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioPreparo } from "@/components/formulario-preparo";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo preparo" };

export default async function NovoPreparoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const insumos = await listarInsumos();

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Novo preparo"
        voltarPara={{ href: "/preparos", rotulo: "← Preparos" }}
      />

      <Painel>
        <FormularioPreparo
          insumosDisponiveis={insumos}
          action={criarPreparoAction}
          rotuloEnvio="Cadastrar preparo"
        />
      </Painel>
    </main>
  );
}
