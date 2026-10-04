import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterPreparoComComposicao } from "@/lib/preparos";
import { listarInsumos } from "@/lib/insumos";
import { atualizarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioPreparo } from "@/components/formulario-preparo";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Editar preparo" };

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
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={preparo.nome}
        subtitulo={preparo.categoria ?? undefined}
        voltarPara={{ href: "/preparos", rotulo: "← Preparos" }}
      />

      <Painel>
        <FormularioPreparo
          valoresIniciais={preparo}
          insumosDisponiveis={insumos}
          action={atualizarComId}
          rotuloEnvio="Salvar alterações"
        />
      </Painel>
    </main>
  );
}
