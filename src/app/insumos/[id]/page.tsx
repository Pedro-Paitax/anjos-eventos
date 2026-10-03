import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterInsumo } from "@/lib/insumos";
import { atualizarInsumoAction } from "@/app/actions/insumo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioInsumo } from "@/components/formulario-insumo";
import { Painel } from "@/components/painel";

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

        <Painel>
          <FormularioInsumo
            valoresIniciais={insumo}
            action={atualizarComId}
            rotuloEnvio="Salvar alterações"
          />
        </Painel>
      </div>
    </main>
  );
}
