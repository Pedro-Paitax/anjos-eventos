import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Senhor Churrasco" };

type ItemHub = { titulo: string; descricao: string; href: string };

// Cada bloco é uma seção do hub; para crescer (ex.: "Espaço / Localização"
// em Cadastros), basta acrescentar um item ao bloco.
const blocos: { titulo: string; itens: ItemHub[] }[] = [
  {
    titulo: "Ferramentas",
    itens: [
      {
        titulo: "Cardápios Feitos",
        descricao: "Cardápios pré-montados pra agilizar o Criar Evento.",
        href: "/cardapios-modelo",
      },
      {
        titulo: "Simulador de Cardápio",
        descricao: "Monte um cardápio e veja o valor sugerido, sem criar um evento.",
        href: "/simulador-cardapio",
      },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      {
        titulo: "Preparos",
        descricao: "Fichas técnicas: preparos, composição e insumos.",
        href: "/preparos",
      },
      {
        titulo: "Insumos",
        descricao: "Preço, unidade e fator de correção de cada insumo.",
        href: "/insumos",
      },
    ],
  },
];

export default async function SenhorChurrascoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Senhor Churrasco"
        subtitulo="Fichas técnicas, cardápios pré-montados e simulador de precificação."
        voltarPara={{ href: "/", rotulo: "← Início" }}
      />

      {blocos.map((bloco) => (
        <section key={bloco.titulo} className="flex flex-col gap-3.5">
          <h2 className="font-titulo text-[22px] font-semibold leading-[1.2] tracking-[-0.01em]">
            {bloco.titulo}
          </h2>
          <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {bloco.itens.map((item) => (
              <Link
                key={item.titulo}
                href={item.href}
                className="flex flex-col gap-0.5 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce transition-[background-color,border-color] hover:border-borda-forte hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
              >
                <p className="text-[17px] font-semibold">{item.titulo}</p>
                <p className="text-sm text-texto-suave">{item.descricao}</p>
              </Link>
            ))}
            {bloco.titulo === "Cadastros" && (
              <div className="flex flex-col gap-0.5 rounded-cartao border border-dashed border-borda-forte p-[18px]">
                <p className="text-[17px] font-semibold text-texto-suave">
                  Espaço / Localização
                </p>
                <p className="text-sm text-texto-suave">Em breve.</p>
              </div>
            )}
          </div>
        </section>
      ))}
    </main>
  );
}
