import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual, listarUsuarios } from "@/lib/usuario-atual";
import { obterLead } from "@/lib/prospeccao";
import { atualizarLeadAction } from "@/app/actions/prospeccao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { FormularioLead } from "@/components/prospeccao/formulario-lead";

export const metadata: Metadata = { title: "Editar lead" };

export default async function EditarLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const lead = await obterLead(id);
  if (!lead) notFound();

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina titulo={`Editar ${lead.nomeComercial}`} voltarPara={{ href: `/prospeccao/${id}`, rotulo: "← Lead" }} />
      <Painel>
        <FormularioLead
          lead={lead}
          usuarios={await listarUsuarios()}
          action={atualizarLeadAction.bind(null, id)}
          rotuloEnvio="Salvar alterações"
        />
      </Painel>
    </main>
  );
}
