import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { CAMPOS_CSV, LIMITE_LINHAS_CSV } from "@/lib/prospeccao-csv";
import { CATEGORIAS_LEAD } from "@/lib/prospeccao-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { NavProspeccao } from "@/components/prospeccao/visual";
import { ImportarCsv } from "@/components/prospeccao/importar-csv";

export const metadata: Metadata = { title: "Importar leads" };

export default async function ImportarPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Importar leads (CSV)"
        subtitulo="Duas etapas: analisar (valida e procura duplicatas) e importar. Tudo ou nada."
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
      />
      <NavProspeccao atual="importar" />
      <Painel className="flex flex-col gap-3 text-sm">
        <p>
          Cabeçalho na primeira linha, separado por vírgula ou ponto e vírgula. Obrigatórias: <code>nome_comercial</code>{" "}
          e <code>categoria</code> ({CATEGORIAS_LEAD.join(", ")}; aceita também bar, restaurante, brewpub…). Até{" "}
          {LIMITE_LINHAS_CSV} linhas.
        </p>
        <p className="break-words text-texto-suave">Colunas aceitas: {CAMPOS_CSV.join(", ")}.</p>
        <p className="text-texto-suave">
          As colunas <code>fonte_*</code> criam uma evidência ligada ao lead (data em AAAA-MM-DD ou DD/MM/AAAA). Ela só
          entra como verificada com <code>fonte_verificada</code> = sim.
        </p>
      </Painel>
      <Painel>
        <ImportarCsv />
      </Painel>
    </main>
  );
}
