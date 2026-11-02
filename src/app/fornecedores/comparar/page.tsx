import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { dataSource } from "@/lib/data-source";
import { compararPrecos, type PrecoObservado } from "@/lib/precos-insumo";
import { formatarReais, hojeNaEquipe, idsMenorPreco } from "@/lib/precos-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaPrecos } from "@/components/precos/visual";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import { Vazio } from "@/components/vazio";
import { Botao } from "@/components/botao";
import { campoClasse } from "@/components/campo";
import { secaoTituloClasse } from "@/components/formulario-evento";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Comparar preços" };

type Props = { searchParams: Promise<{ busca?: string | string[] }> };

type Grupo = { fornecedorId: number; fornecedorNome: string; itens: PrecoObservado[]; menor: number };

export default async function CompararPage({ searchParams }: Props) {
  if (!(await obterUsuarioAtual())) redirect("/login");

  const bruto = (await searchParams).busca;
  const busca = (Array.isArray(bruto) ? bruto[0] : (bruto ?? "")).trim().slice(0, 80);
  const precos = dataSource() === "oracle" && busca.length >= 2 ? await compararPrecos(busca) : [];
  const hoje = hojeNaEquipe();

  const grupos = new Map<number, Grupo>();
  for (const p of precos ?? []) {
    const g = grupos.get(p.fornecedorId!) ?? {
      fornecedorId: p.fornecedorId!,
      fornecedorNome: p.fornecedorNome ?? "",
      itens: [],
      menor: Infinity,
    };
    g.itens.push(p);
    g.menor = Math.min(g.menor, p.preco);
    grupos.set(g.fornecedorId, g);
  }
  // Fornecedor com o item mais barato primeiro.
  const ordenados = [...grupos.values()].sort((a, b) => a.menor - b.menor);
  const menores = idsMenorPreco(precos ?? []);
  const maisBarato = ordenados[0]?.itens.find((i) => i.preco === ordenados[0].menor);

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Comparar preços"
        subtitulo="O último preço de cada fornecedor para o que você buscar, com base nas cotações e preços registrados."
        voltarPara={{ href: "/fornecedores", rotulo: "← Fornecedores" }}
      />

      <form
        method="get"
        role="search"
        className="flex flex-col gap-3 rounded-cartao border border-borda bg-superficie p-4 shadow-realce sm:flex-row sm:items-center"
      >
        <input
          type="search"
          name="busca"
          defaultValue={busca}
          placeholder="Ex.: picanha"
          aria-label="Insumo ou item a comparar"
          minLength={2}
          required
          className={`${campoClasse} sm:flex-1`}
        />
        <Botao type="submit" className="w-full sm:w-auto">
          Comparar
        </Botao>
      </form>

      {precos === null ? (
        <Alerta tipo="info">O histórico de preços ainda não está ativo neste banco.</Alerta>
      ) : busca.length < 2 ? (
        <Vazio>Digite um insumo, como picanha ou arroz, para ver o preço de cada fornecedor lado a lado.</Vazio>
      ) : ordenados.length === 0 ? (
        <Vazio
          acao={
            <Link href="/insumos" className="text-link underline underline-offset-4">
              Registrar preços nos insumos
            </Link>
          }
        >
          Nenhum preço de fornecedor encontrado para “{busca}”.
        </Vazio>
      ) : (
        <>
          {maisBarato && ordenados.length > 1 && (
            <p className="text-texto-suave" aria-live="polite">
              Mais barato agora:{" "}
              <span className="font-semibold text-texto">
                {maisBarato.nomeNoFornecedor ?? maisBarato.insumoNome} em {maisBarato.fornecedorNome},{" "}
                <span className="tabular-nums">{formatarReais(maisBarato.preco)}</span>
              </span>
              .
            </p>
          )}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {ordenados.map((g) => (
              <Painel key={g.fornecedorId} como="section" className="flex flex-col gap-4">
                <h2 className={secaoTituloClasse}>
                  <Link
                    href={`/fornecedores/${g.fornecedorId}`}
                    className="underline decoration-borda-forte underline-offset-4 hover:decoration-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                  >
                    {g.fornecedorNome}
                  </Link>
                </h2>
                <ListaPrecos
                  precos={g.itens}
                  hoje={hoje}
                  menores={menores}
                  titulo={(p) => p.nomeNoFornecedor ?? p.insumoNome ?? "Item sem nome"}
                  detalhe={(p) => [
                    p.insumoId == null
                      ? "sem insumo ligado"
                      : p.nomeNoFornecedor && p.insumoNome !== p.nomeNoFornecedor
                        ? `insumo ${p.insumoNome}`
                        : null,
                  ]}
                />
              </Painel>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
