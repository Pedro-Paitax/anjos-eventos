import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterInsumo } from "@/lib/insumos";
import { dataSource } from "@/lib/data-source";
import { listarFornecedoresOpcoes, obterPrecosDoInsumo } from "@/lib/precos-insumo";
import {
  ROTULOS_FONTE,
  diasEntre,
  formatarDiaCurto,
  formatarReais,
  estadoPreco,
  hojeNaEquipe,
  idadeTexto,
  idsMenorPreco,
  precoComMargem,
} from "@/lib/precos-opcoes";
import { atualizarInsumoAction } from "@/app/actions/insumo";
import { aplicarPrecoAction, registrarPrecoAction } from "@/app/actions/precos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioInsumo, type OrigemFormularioInsumo } from "@/components/formulario-insumo";
import { FormularioRegistroPreco } from "@/components/precos/formulario-registro-preco";
import { ListaPrecos } from "@/components/precos/visual";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { botaoClasse } from "@/components/botao";
import { BotaoEnviar } from "@/components/botao-enviar";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Editar insumo" };

type PaginaInsumoProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ precoAplicado?: string; erroPreco?: string }>;
};

export default async function InsumoPage({ params, searchParams }: PaginaInsumoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const { precoAplicado, erroPreco } = await searchParams;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const insumo = await obterInsumo(idNumero);
  if (!insumo) {
    notFound();
  }

  // Histórico de preços só existe no Postgres (migração 0011); null = ainda não ativo.
  const [precos, fornecedores] =
    dataSource() === "oracle"
      ? await Promise.all([obterPrecosDoInsumo(insumo.id), listarFornecedoresOpcoes()])
      : [null, null];
  const hoje = hojeNaEquipe();

  const atualizarComId = atualizarInsumoAction.bind(null, insumo.id);
  const registrarComId = registrarPrecoAction.bind(null, insumo.id);

  let origem: OrigemFormularioInsumo | undefined;
  if (precos && fornecedores) {
    const { fontePreco, precoAtualizadoEm } = precos.origem;
    origem = {
      fornecedores,
      fornecedorPrincipalId: precos.origem.fornecedorPrincipalId,
      canal: precos.origem.canal,
      estado: estadoPreco(precoAtualizadoEm, hoje),
      resumoFonte: precoAtualizadoEm
        ? `${fontePreco ? ROTULOS_FONTE[fontePreco] : "Não informada"} · atualizado em ${formatarDiaCurto(precoAtualizadoEm)} (${idadeTexto(diasEntre(precoAtualizadoEm, hoje))})`
        : "sem data. Use um preço de fornecedor abaixo ou altere o preço e salve (conta como manual, de hoje).",
    };
  }

  const menores = precos ? idsMenorPreco(precos.porFornecedor) : new Set<number>();
  const menorPreco = precos?.porFornecedor[0]?.preco ?? null;
  const precoAplicadoNumero = precoAplicado ? Number(precoAplicado) : null;
  // Remonta o formulário quando o preço muda por fora dele (campos não controlados guardam o valor antigo).
  const chaveFormulario = `${insumo.preco}-${precos?.origem.precoAtualizadoEm ?? ""}`;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={insumo.nome}
        voltarPara={{ href: "/insumos", rotulo: "← Insumos" }}
      />

      {precoAplicadoNumero !== null && Number.isFinite(precoAplicadoNumero) && (
        <Alerta tipo="sucesso">
          Preço do insumo atualizado para {formatarReais(precoAplicadoNumero)} (fornecedor + 10%).
        </Alerta>
      )}
      {erroPreco && (
        <Alerta tipo="perigo">Não foi possível usar esse preço: ele não pertence a este insumo ou não está aprovado.</Alerta>
      )}

      <Painel>
        <FormularioInsumo
          key={chaveFormulario}
          valoresIniciais={insumo}
          action={atualizarComId}
          rotuloEnvio="Salvar alterações"
          origem={origem}
        />
      </Painel>

      {precos && fornecedores ? (
        <>
          <Painel como="section" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className={secaoTituloClasse}>Preço por fornecedor</h2>
              <p className="text-sm text-texto-suave">
                Último preço bruto de cada fornecedor, do menor para o maior. Ao usar um deles, o
                cadastro recebe o preço + 10%.
              </p>
            </div>
            {precos.porFornecedor.length === 0 ? (
              <p className="text-sm text-texto-suave">
                Nenhum preço de fornecedor registrado para este insumo ainda. Registre o primeiro
                abaixo.
              </p>
            ) : (
              <>
                <ListaPrecos
                  precos={precos.porFornecedor}
                  hoje={hoje}
                  menores={menores}
                  titulo={(p) => p.fornecedorNome ?? "Sem fornecedor"}
                  detalhe={(p) => [p.nomeNoFornecedor]}
                  acao={(p) => (
                    <form action={aplicarPrecoAction.bind(null, insumo.id, p.id)} className="mt-1">
                      <BotaoEnviar
                        rotulo={`Usar no cadastro: ${formatarReais(precoComMargem(p.preco))}`}
                        rotuloEnviando="Atualizando…"
                        variante="link"
                        className="self-start px-0!"
                      />
                    </form>
                  )}
                />
                {menorPreco !== null && (
                  <p className="border-t border-borda pt-4 text-sm text-texto-suave">
                    Preço cadastrado:{" "}
                    <span className="font-semibold text-texto tabular-nums">{formatarReais(insumo.preco)}</span>
                    {" · "}menor fornecedor + 10%:{" "}
                    <span className="font-semibold text-texto tabular-nums">{formatarReais(precoComMargem(menorPreco))}</span>
                  </p>
                )}
              </>
            )}
          </Painel>

          <Painel como="section" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className={secaoTituloClasse}>Registrar preço</h2>
              <p className="text-sm text-texto-suave">
                Preço de nota fiscal, Ceasa ou pesquisa. Entra no histórico e na comparação; o preço
                cadastrado acima não muda.
              </p>
            </div>
            {fornecedores.length === 0 && (
              <Alerta tipo="info">
                Nenhum fornecedor cadastrado.{" "}
                <Link href="/fornecedores" className="underline underline-offset-4">
                  Cadastre os fornecedores
                </Link>{" "}
                para comparar preços entre eles.
              </Alerta>
            )}
            <FormularioRegistroPreco
              action={registrarComId}
              fornecedores={fornecedores}
              fornecedorPadraoId={precos.origem.fornecedorPrincipalId}
              unidade={insumo.udm}
              hoje={hoje}
            />
          </Painel>

          <Painel como="section" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className={secaoTituloClasse}>Histórico de preços</h2>
              <Link href={`/fornecedores/comparar?busca=${encodeURIComponent(insumo.nome)}`} className={botaoClasse("link", "sm")}>
                Comparar fornecedores
              </Link>
            </div>
            {precos.historico.length === 0 ? (
              <p className="text-sm text-texto-suave">Nenhum preço registrado ainda.</p>
            ) : (
              <ListaPrecos
                precos={precos.historico}
                hoje={hoje}
                titulo={(p) => p.fornecedorNome ?? "Sem fornecedor"}
                detalhe={(p) => [p.nomeNoFornecedor]}
              />
            )}
          </Painel>
        </>
      ) : (
        dataSource() === "oracle" && (
          <Alerta tipo="info">
            O histórico de preços e os fornecedores ainda não estão ativos neste banco.
          </Alerta>
        )
      )}
    </main>
  );
}
