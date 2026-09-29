import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterColaborador } from "@/lib/colaboradores";
import { atualizarColaboradorAction } from "@/app/actions/colaborador";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioColaborador } from "@/components/formulario-colaborador";

type PaginaColaboradorProps = {
  params: Promise<{ id: string }>;
};

export default async function ColaboradorPage({ params }: PaginaColaboradorProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const colaborador = await obterColaborador(idNumero);
  if (!colaborador) {
    notFound();
  }

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={colaborador.nome}
          voltarPara={{ href: "/colaboradores", rotulo: "← Colaboradores" }}
        />
        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioColaborador
            valoresIniciais={colaborador}
            action={atualizarColaboradorAction.bind(null, colaborador.id)}
            rotuloEnvio="Salvar alterações"
          />
        </div>
      </div>
    </main>
  );
}
