import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterPreparoComComposicao } from "@/lib/preparos";
import { listarInsumos } from "@/lib/insumos";
import { atualizarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioPreparo } from "@/components/formulario-preparo";

type PaginaPreparoProps = {
  params: Promise<{ id: string }>;
};

export default async function PreparoPage({ params }: PaginaPreparoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const [preparo, insumos] = await Promise.all([
    obterPreparoComComposicao(idNumero),
    listarInsumos(),
  ]);

  if (!preparo) {
    notFound();
  }

  const atualizarComId = atualizarPreparoAction.bind(null, preparo.id);

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={preparo.nome}
          subtitulo={preparo.categoria ?? undefined}
          voltarPara={{ href: "/preparos", rotulo: "← Preparos" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioPreparo
            valoresIniciais={preparo}
            insumosDisponiveis={insumos}
            action={atualizarComId}
            rotuloEnvio="Salvar alterações"
          />
        </div>
      </div>
    </main>
  );
}
