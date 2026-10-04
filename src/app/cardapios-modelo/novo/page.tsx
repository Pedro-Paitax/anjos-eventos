import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { criarCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioCardapioModelo } from "@/components/formulario-cardapio-modelo";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo cardápio" };

export default async function NovoCardapioModeloPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const preparosPorCategoria = await listarPreparosPorCategoria();

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Novo cardápio"
        voltarPara={{ href: "/cardapios-modelo", rotulo: "← Cardápios Feitos" }}
      />

      <Painel>
        <FormularioCardapioModelo
          preparosPorCategoria={preparosPorCategoria}
          action={criarCardapioModeloAction}
          rotuloEnvio="Cadastrar cardápio"
        />
      </Painel>
    </main>
  );
}
