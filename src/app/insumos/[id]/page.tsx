import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterInsumo } from "@/lib/insumos";
import { atualizarInsumoAction } from "@/app/actions/insumo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioInsumo } from "@/components/formulario-insumo";

type PaginaInsumoProps = {
  params: Promise<{ id: string }>;
};

export default async function InsumoPage({ params }: PaginaInsumoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const insumo = await obterInsumo(idNumero);
  if (!insumo) {
    notFound();
  }

  const atualizarComId = atualizarInsumoAction.bind(null, insumo.id);

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={insumo.nome}
          voltarPara={{ href: "/insumos", rotulo: "← Insumos" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioInsumo
            valoresIniciais={insumo}
            action={atualizarComId}
            rotuloEnvio="Salvar alterações"
          />
        </div>
      </div>
    </main>
  );
}
