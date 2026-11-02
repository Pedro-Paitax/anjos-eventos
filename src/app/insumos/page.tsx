import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import Link from "next/link";
import { listarInsumosDetalhado } from "@/lib/insumos";
import { dataSource } from "@/lib/data-source";
import { listarOrigensInsumos } from "@/lib/precos-insumo";
import { hojeNaEquipe } from "@/lib/precos-opcoes";
import { botaoClasse } from "@/components/botao";
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

  const [insumosDetalhado, origens] = await Promise.all([
    listarInsumosDetalhado(),
    // Fornecedor, canal e fonte do preço (migração 0011); null = ainda não ativo no banco.
    dataSource() === "oracle" ? listarOrigensInsumos() : null,
  ]);
  // Preço corrigido calculado aqui (Server Component) porque
  // calcularPrecoCorrigido depende de "server-only" — não pode ser
  // importado no ListaInsumos ("use client").
  const insumos = insumosDetalhado.map((insumo) => ({
    ...insumo,
    precoCorrigido: arredondarCentavos(
      calcularPrecoCorrigido(insumo.preco, insumo.fatorCorrecao)
    ),
    origem: origens?.get(insumo.id) ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Insumos"
        subtitulo="Preço, unidade e fator de correção de cada insumo."
        voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
        acao={
          origens ? (
            <Link href="/fornecedores" className={`${botaoClasse("secundario")} self-start sm:self-auto`}>
              Fornecedores
            </Link>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        <ListaInsumos insumos={insumos} hoje={hojeNaEquipe()} />
      </div>
    </main>
  );
}
