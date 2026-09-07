import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterCardapioModeloComItens } from "@/lib/cardapios-modelo";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { atualizarCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioCardapioModelo } from "@/components/formulario-cardapio-modelo";

type PaginaCardapioModeloProps = {
  params: Promise<{ id: string }>;
};

export default async function CardapioModeloPage({ params }: PaginaCardapioModeloProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const [cardapio, preparosPorCategoria] = await Promise.all([
    obterCardapioModeloComItens(idNumero),
    listarPreparosPorCategoria(),
  ]);

  if (!cardapio) {
    notFound();
  }

  const atualizarComId = atualizarCardapioModeloAction.bind(null, cardapio.id);

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={cardapio.nome}
          voltarPara={{ href: "/cardapios-modelo", rotulo: "← Cardápios Feitos" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioCardapioModelo
            valoresIniciais={cardapio}
            preparosPorCategoria={preparosPorCategoria}
            action={atualizarComId}
            rotuloEnvio="Salvar alterações"
          />
        </div>
      </div>
    </main>
  );
}
