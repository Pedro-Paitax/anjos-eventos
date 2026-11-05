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
import { BotaoEnviarResumoPrecos } from "@/components/precos/botao-enviar-resumo-precos";
import { contarInsumosComMudancaPendente } from "@/lib/precos-resumo";
import { numerosFamilia } from "@/lib/automacao-whatsapp";
import { mascararDestino } from "@/lib/lista-compras-envio";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Insumos" };

export default async function InsumosPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const oracle = dataSource() === "oracle";
  const [insumosDetalhado, origens, pendentes] = await Promise.all([
    listarInsumosDetalhado(),
    // Fornecedor, canal e fonte do preço (migração 0011); null = ainda não ativo no banco.
    oracle ? listarOrigensInsumos() : null,
    // Mudanças de preço ainda não enviadas no resumo (migração 0013); null = ainda não ativo.
    oracle ? contarInsumosComMudancaPendente() : null,
  ]);
  // Só os 4 últimos dígitos chegam ao navegador.
  const destinos = numerosFamilia().map(mascararDestino);
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
            <div className="flex flex-wrap gap-3 self-start sm:self-auto">
              <BotaoEnviarResumoPrecos destinos={destinos} pendentes={pendentes} />
              <Link href="/fornecedores" className={botaoClasse("secundario")}>
                Fornecedores
              </Link>
            </div>
          ) : undefined
        }
      />

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        <ListaInsumos insumos={insumos} hoje={hojeNaEquipe()} />
      </div>
    </main>
  );
}
