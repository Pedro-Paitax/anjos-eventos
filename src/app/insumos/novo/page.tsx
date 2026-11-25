import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { dataSource } from "@/lib/data-source";
import { listarFornecedoresOpcoes } from "@/lib/precos-insumo";
import { obterEmbalagemCompraDoInsumo } from "@/lib/embalagem-insumo";
import { criarInsumoAction } from "@/app/actions/insumo";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioInsumo, type OrigemFormularioInsumo } from "@/components/formulario-insumo";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo insumo" };

export default async function NovoInsumoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  // Só no Postgres: sem ele não há cadastro de insumo novo por esta tela.
  const oracle = dataSource() === "oracle";
  const fornecedores = oracle ? await listarFornecedoresOpcoes() : null;
  // id 0 nunca existe: serve só para saber se a migração 0015 está no banco (undefined = pendente).
  const embalagem = oracle ? await obterEmbalagemCompraDoInsumo(0) : undefined;

  const origem: OrigemFormularioInsumo | undefined = fornecedores
    ? {
        fornecedores,
        fornecedorPrincipalId: null,
        canal: null,
        estado: "em_dia",
        resumoFonte: "será registrada como manual, de hoje.",
      }
    : undefined;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Novo insumo"
        subtitulo="Preço já com a margem (preço pago × 1,10 no varejo)."
        voltarPara={{ href: "/insumos", rotulo: "← Insumos" }}
      />
      <Painel>
        <FormularioInsumo
          novo
          valoresIniciais={{ id: 0, nome: "", udm: "", preco: null, fatorCorrecao: null }}
          action={criarInsumoAction}
          rotuloEnvio="Cadastrar insumo"
          origem={origem}
          embalagem={embalagem}
        />
      </Painel>
    </main>
  );
}
