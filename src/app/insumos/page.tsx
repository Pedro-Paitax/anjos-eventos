import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarInsumosDetalhado } from "@/lib/insumos";
import { calcularPrecoCorrigido, arredondarCentavos } from "@/lib/custo-preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaInsumos } from "@/components/lista-insumos";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Insumos" };

export default async function InsumosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const insumosDetalhado = await listarInsumosDetalhado();
  // Preço corrigido calculado aqui (Server Component) porque
  // calcularPrecoCorrigido depende de "server-only" — não pode ser
  // importado no ListaInsumos ("use client").
  const insumos = insumosDetalhado.map((insumo) => ({
    ...insumo,
    precoCorrigido: arredondarCentavos(
      calcularPrecoCorrigido(insumo.preco, insumo.fatorCorrecao)
    ),
  }));

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Insumos"
        subtitulo="Preço, unidade e fator de correção de cada insumo."
        voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
      />

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        <ListaInsumos insumos={insumos} />
      </div>
    </main>
  );
}
