import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";

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
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Senhor Churrasco"
          subtitulo="Fichas técnicas, cardápios pré-montados e simulador de precificação."
          voltarPara={{ href: "/", rotulo: "← Início" }}
        />

        {blocos.map((bloco) => (
          <section key={bloco.titulo} className="flex flex-col gap-3">
            <h2 className="font-display text-xl italic text-paper">
              {bloco.titulo}
            </h2>
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {bloco.itens.map((item, i) => (
                <Link
                  key={item.titulo}
                  href={item.href}
                  style={{ ["--enter-order" as string]: i }}
                  className="card-enter group relative flex flex-col gap-2 overflow-hidden rounded-[2px] bg-paper p-5 text-paper-ink shadow-[0_18px_28px_-16px_rgba(0,0,0,0.6)] transition hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1.5 bg-ember"
                  />
                  <p className="font-display text-lg italic">{item.titulo}</p>
                  <p className="text-sm text-paper-ink/70">{item.descricao}</p>
                </Link>
              ))}
              {bloco.titulo === "Cadastros" && (
                <div className="flex flex-col gap-2 rounded-[2px] border border-dashed border-paper-dim/25 p-5">
                  <p className="font-display text-lg italic text-paper-dim">
                    Espaço / Localização
                  </p>
                  <p className="text-sm text-paper-dim/60">Em breve.</p>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
