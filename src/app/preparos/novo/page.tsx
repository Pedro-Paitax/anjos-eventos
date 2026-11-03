import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarInsumos } from "@/lib/insumos";
import { listarPreparos, obterPreparoComComposicao } from "@/lib/preparos";
import { dataSource } from "@/lib/data-source";
import { mapaVariacoes } from "@/lib/preparos-variacoes";
import { criarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import {
  FormularioPreparo,
  type ValoresIniciaisPreparo,
  type VariacaoFormularioPreparo,
} from "@/components/formulario-preparo";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo preparo" };

type NovoPreparoProps = { searchParams: Promise<{ versaoDe?: string }> };

export default async function NovoPreparoPage({ searchParams }: NovoPreparoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const oracle = dataSource() === "oracle";
  const versaoDe = Number((await searchParams).versaoDe);
  const [insumos, todos, variacoes] = await Promise.all([
    listarInsumos(),
    oracle ? listarPreparos() : null,
    oracle ? mapaVariacoes() : null,
  ]);

  // "Criar versão": começa com a ficha do base (composição sem ids, para criar linhas novas).
  const base =
    variacoes && Number.isInteger(versaoDe) && !variacoes.has(versaoDe) ? await obterPreparoComComposicao(versaoDe) : null;
  const valoresIniciais: ValoresIniciaisPreparo | undefined = base
    ? { ...base, nome: `${base.nome} com `, composicao: base.composicao.map((c) => ({ ...c, id: null })) }
    : undefined;

  const variacao: VariacaoFormularioPreparo | undefined =
    variacoes && todos
      ? {
          baseId: base?.id ?? null,
          versoes: [],
          opcoes: todos.filter((p) => p.variacaoDe == null).map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria })),
        }
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={base ? `Nova versão de ${base.nome}` : "Novo preparo"}
        subtitulo={base ? "Começa com a ficha do preparo base: ajuste o nome, o rendimento e acrescente o acabamento." : undefined}
        voltarPara={base ? { href: `/preparos/${base.id}`, rotulo: `← ${base.nome}` } : { href: "/preparos", rotulo: "← Preparos" }}
      />

      <Painel>
        <FormularioPreparo
          valoresIniciais={valoresIniciais}
          variacao={variacao}
          insumosDisponiveis={insumos}
          action={criarPreparoAction}
          rotuloEnvio="Cadastrar preparo"
        />
      </Painel>
    </main>
  );
}
