import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SimuladorCardapio } from "@/components/simulador-cardapio";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Simulador de Cardápio" };

export default async function SimuladorCardapioPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const preparosPorCategoria = await listarPreparosPorCategoria();
  const cardapiosModelo = await listarCardapiosModelo();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Simulador de Cardápio"
          subtitulo="Monte um cardápio e veja o valor sugerido, sem criar um evento."
          voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
        />

        <Painel>
          <SimuladorCardapio
            preparosPorCategoria={preparosPorCategoria}
            cardapiosModelo={cardapiosModelo}
          />
        </Painel>
      </div>
    </main>
  );
}
