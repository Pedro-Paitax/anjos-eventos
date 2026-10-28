import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarLeads } from "@/lib/prospeccao";
import { paresDuplicados } from "@/lib/prospeccao-normalizacao";
import { pendenciasCadastro } from "@/lib/prospeccao-pontuacao";
import { ROTULOS_CATEGORIA } from "@/lib/prospeccao-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { NavProspeccao, SeloPrioridade } from "@/components/prospeccao/visual";

export const metadata: Metadata = { title: "Fila de pesquisa" };

// Leads encerrados não precisam de pesquisa.
const ENCERRADOS = new Set(["convertido", "sem_interesse", "nao_contatar"]);

export default async function FilaPesquisaPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const leads = await listarLeads();
  const abertos = leads.filter((l) => !ENCERRADOS.has(l.status));
  const pendentes = abertos
    .map((l) => ({ lead: l, pendencias: pendenciasCadastro({ ...l, temQualificacao: l.prioridade !== null }) }))
    .filter((x) => x.pendencias.length > 0 || x.lead.provisoria || x.lead.prioridade === "indefinida")
    .sort((a, b) => b.pendencias.length - a.pendencias.length);
  const duplicados = paresDuplicados(leads);

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Fila de pesquisa"
        subtitulo="Leads com dados ou fontes faltando, avaliações provisórias e possíveis duplicatas."
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
      />
      <NavProspeccao atual="fila" />

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Possíveis duplicatas ({duplicados.length})</h2>
        {duplicados.length === 0 ? (
          <p className="text-texto-suave">Nenhuma encontrada.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {duplicados.map(({ a, b, correspondencia }) => (
              <li key={`${a.id}-${b.id}`}>
                <Link href={`/prospeccao/${a.id}`} className="text-link underline">{a.nomeComercial}</Link>
                {" × "}
                <Link href={`/prospeccao/${b.id}`} className="text-link underline">{b.nomeComercial}</Link>
                {" — "}
                {correspondencia.nivel === "forte" ? "duplicata provável" : "possível"}: {correspondencia.motivos.join(", ")}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-texto-suave">
          Nada é unido automaticamente. Se for o mesmo estabelecimento, mantenha um e marque o outro como &quot;Sem interesse&quot;
          com uma anotação indicando o registro principal.
        </p>
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Pesquisa pendente ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <p className="text-texto-suave">Nenhum lead aberto com pendência.</p>
        ) : (
          <ul className="divide-y divide-borda">
            {pendentes.map(({ lead, pendencias }) => (
              <li key={lead.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/prospeccao/${lead.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {lead.nomeComercial}
                  </Link>
                  <p className="text-sm text-texto-suave">
                    {ROTULOS_CATEGORIA[lead.categoria]} · {lead.evidencias} fonte(s), {lead.evidenciasVerificadas} verificada(s)
                  </p>
                  {pendencias.length > 0 && <p className="text-sm text-aviso">Falta: {pendencias.join(", ")}</p>}
                </div>
                <SeloPrioridade prioridade={lead.prioridade} provisoria={lead.provisoria} />
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </main>
  );
}
