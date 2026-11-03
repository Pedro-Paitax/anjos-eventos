import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import Link from "next/link";
import { listarPreparos, obterPreparoComComposicao } from "@/lib/preparos";
import { dataSource } from "@/lib/data-source";
import { situacaoVariacao } from "@/lib/preparos-variacoes";
import { listarInsumos } from "@/lib/insumos";
import { atualizarPreparoAction } from "@/app/actions/preparo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioPreparo, type VariacaoFormularioPreparo } from "@/components/formulario-preparo";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Editar preparo" };

type PaginaPreparoProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erroVersao?: string }>;
};

export default async function PreparoPage({ params, searchParams }: PaginaPreparoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const { erroVersao } = await searchParams;
  const oracle = dataSource() === "oracle";
  const [preparo, insumos, situacao, todos] = await Promise.all([
    obterPreparoComComposicao(idNumero),
    listarInsumos(),
    oracle ? situacaoVariacao(idNumero) : null,
    oracle ? listarPreparos() : null,
  ]);

  if (!preparo) {
    notFound();
  }

  const atualizarComId = atualizarPreparoAction.bind(null, preparo.id);

  // Versões (migration 0012): sem a tabela, situacao = null e o campo não aparece.
  const variacao: VariacaoFormularioPreparo | undefined =
    situacao && todos
      ? {
          baseId: situacao.base?.id ?? null,
          versoes: situacao.versoes,
          opcoes: todos
            .filter((p) => p.id !== preparo.id && p.variacaoDe == null)
            .map((p) => ({ id: p.id, nome: p.nome, categoria: p.categoria })),
        }
      : undefined;
  const podeCriarVersao = situacao !== null && situacao.base === null;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={preparo.nome}
        subtitulo={
          situacao?.base ? `${preparo.categoria ?? ""} · versão de ${situacao.base.nome}` : (preparo.categoria ?? undefined)
        }
        voltarPara={{ href: "/preparos", rotulo: "← Preparos" }}
        acao={
          podeCriarVersao ? (
            <Link href={`/preparos/novo?versaoDe=${preparo.id}`} className={`${botaoClasse("secundario")} self-start sm:self-auto`}>
              Criar versão
            </Link>
          ) : undefined
        }
      />

      {erroVersao && (
        <Alerta tipo="aviso">
          O preparo foi criado, mas não deu para ligá-lo como versão. Escolha o base em
          &quot;Versão de&quot; e salve de novo.
        </Alerta>
      )}

      <Painel>
        <FormularioPreparo
          valoresIniciais={preparo}
          insumosDisponiveis={insumos}
          action={atualizarComId}
          rotuloEnvio="Salvar alterações"
          variacao={variacao}
        />
      </Painel>
    </main>
  );
}
