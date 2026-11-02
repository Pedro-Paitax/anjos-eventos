import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { dataSource } from "@/lib/data-source";
import { listarFornecedores } from "@/lib/precos-insumo";
import { formatarDiaCurto } from "@/lib/precos-opcoes";
import { criarFornecedorAction } from "@/app/actions/precos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioFornecedor } from "@/components/precos/formulario-fornecedor";
import { ChipNeutro } from "@/components/precos/visual";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import { Vazio } from "@/components/vazio";
import { botaoClasse } from "@/components/botao";
import { secaoTituloClasse } from "@/components/formulario-evento";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function FornecedoresPage() {
  if (!(await obterUsuarioAtual())) redirect("/login");

  const fornecedores = dataSource() === "oracle" ? await listarFornecedores() : null;

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Fornecedores"
        subtitulo="Quem vende cada insumo e o último preço de cada um."
        voltarPara={{ href: "/senhor-churrasco", rotulo: "← Senhor Churrasco" }}
        acao={
          fornecedores && fornecedores.length > 0 ? (
            <Link href="/fornecedores/comparar" className={`${botaoClasse("secundario")} self-start sm:self-auto`}>
              Comparar preços
            </Link>
          ) : undefined
        }
      />

      {fornecedores === null ? (
        <Alerta tipo="info">O cadastro de fornecedores ainda não está ativo neste banco.</Alerta>
      ) : (
        <>
          <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
            {fornecedores.length === 0 ? (
              <Vazio>Nenhum fornecedor cadastrado ainda. Cadastre o primeiro abaixo.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {fornecedores.map((f) => (
                  <li key={f.id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
                        {f.nome}
                        {!f.ativo && <ChipNeutro>Inativo</ChipNeutro>}
                      </p>
                      <p className="text-sm text-texto-suave">
                        {f.itens === 0
                          ? "Nenhum preço registrado"
                          : `${f.itens} ${f.itens === 1 ? "item" : "itens"} com preço · último em ${formatarDiaCurto(f.ultimaObservacao!)}`}
                      </p>
                    </div>
                    <Link
                      href={`/fornecedores/${f.id}`}
                      aria-label={`Ver preços de ${f.nome}`}
                      className={`${botaoClasse("link", "sm")} self-start sm:self-center`}
                    >
                      Ver preços
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Painel como="section" className="flex flex-col gap-4">
            <h2 className={secaoTituloClasse}>Novo fornecedor</h2>
            <FormularioFornecedor action={criarFornecedorAction} />
          </Painel>
        </>
      )}
    </main>
  );
}
