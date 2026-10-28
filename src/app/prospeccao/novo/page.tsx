import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual, listarUsuarios } from "@/lib/usuario-atual";
import { criarLeadAction } from "@/app/actions/prospeccao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { FormularioLead } from "@/components/prospeccao/formulario-lead";

export const metadata: Metadata = { title: "Novo lead" };

export default async function NovoLeadPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Novo lead"
        subtitulo="Só dados públicos e comerciais. O que não souber, deixe em branco."
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
      />
      <Painel>
        <FormularioLead usuarios={await listarUsuarios()} action={criarLeadAction} rotuloEnvio="Cadastrar lead" />
      </Painel>
    </main>
  );
}
