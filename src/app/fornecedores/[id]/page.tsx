import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { dataSource } from "@/lib/data-source";
import { obterFornecedor, ultimosPrecosDoFornecedor } from "@/lib/precos-insumo";
import { hojeNaEquipe } from "@/lib/precos-opcoes";
import { atualizarFornecedorAction } from "@/app/actions/precos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioFornecedor } from "@/components/precos/formulario-fornecedor";
import { ChipNeutro, ListaPrecos } from "@/components/precos/visual";
import { Painel } from "@/components/painel";
import { botaoClasse } from "@/components/botao";
import { secaoTituloClasse } from "@/components/formulario-evento";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fornecedor" };

type Props = { params: Promise<{ id: string }> };

export default async function FornecedorPage({ params }: Props) {
  if (!(await obterUsuarioAtual())) redirect("/login");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || dataSource() !== "oracle") notFound();

  const [fornecedor, precos] = await Promise.all([obterFornecedor(id), ultimosPrecosDoFornecedor(id)]);
  if (!fornecedor) notFound();

  const hoje = hojeNaEquipe();
  const atualizarComId = atualizarFornecedorAction.bind(null, fornecedor.id);
  const semInsumo = (precos ?? []).filter((p) => p.insumoId == null).length;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={fornecedor.nome}
        subtitulo={fornecedor.ativo ? undefined : "Inativo: não aparece nas listas de escolha."}
        voltarPara={{ href: "/fornecedores", rotulo: "← Fornecedores" }}
      />

      <Painel como="section" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className={secaoTituloClasse}>Últimos preços</h2>
          <p className="text-sm text-texto-suave">Preço bruto mais recente de cada item deste fornecedor.</p>
        </div>
        {!precos || precos.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Nenhum preço deste fornecedor ainda. Registre preços na página de cada{" "}
            <Link href="/insumos" className="text-link underline underline-offset-4">
              insumo
            </Link>
            .
          </p>
        ) : (
          <>
            <ListaPrecos
              precos={precos}
              hoje={hoje}
              titulo={(p) => p.nomeNoFornecedor ?? p.insumoNome ?? "Item sem nome"}
              detalhe={(p) => [
                p.insumoId == null
                  ? "sem insumo ligado"
                  : p.nomeNoFornecedor && p.insumoNome !== p.nomeNoFornecedor
                    ? `insumo ${p.insumoNome}`
                    : null,
              ]}
            />
            {semInsumo > 0 && (
              <p className="flex flex-wrap items-center gap-2 border-t border-borda pt-4 text-sm text-texto-suave">
                <ChipNeutro>{semInsumo} sem insumo ligado</ChipNeutro>
                ficam fora da comparação entre fornecedores até serem ligados a um insumo.
              </p>
            )}
          </>
        )}
        {precos && precos.length > 0 && (
          <Link href="/fornecedores/comparar" className={`${botaoClasse("link", "sm")} self-start`}>
            Comparar com outros fornecedores
          </Link>
        )}
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Dados do fornecedor</h2>
        <FormularioFornecedor action={atualizarComId} fornecedor={fornecedor} />
      </Painel>
    </main>
  );
}
