import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarLeads, contarMensagens } from "@/lib/prospeccao";
import { AMOSTRA_MINIMA, formatarTaxa, resultadosPorSegmento, taxa, type LinhaSegmento } from "@/lib/prospeccao-metricas";
import { temCanalUtilizavel } from "@/lib/prospeccao-filtros";
import { ROTULOS_CATEGORIA } from "@/lib/prospeccao-opcoes";
import { ROTULOS_PRIORIDADE } from "@/lib/prospeccao-pontuacao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Indicador, NavProspeccao } from "@/components/prospeccao/visual";

export const metadata: Metadata = { title: "Indicadores de prospecção" };

function TabelaSegmentos({ titulo, linhas }: { titulo: string; linhas: LinhaSegmento[] }) {
  return (
    <Painel como="section" className="flex flex-col gap-3">
      <h2 className={secaoTituloClasse}>Por {titulo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-texto-suave">
            <tr>
              <th scope="col" className="py-2 pr-3 font-medium">{titulo}</th>
              <th scope="col" className="py-2 pr-3 font-medium">Leads</th>
              <th scope="col" className="py-2 pr-3 font-medium">Contatados</th>
              <th scope="col" className="py-2 pr-3 font-medium">Taxa de resposta</th>
              <th scope="col" className="py-2 pr-3 font-medium">Reuniões</th>
              <th scope="col" className="py-2 pr-3 font-medium">Propostas</th>
              <th scope="col" className="py-2 font-medium">Parcerias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {linhas.map((l) => (
              <tr key={l.segmento}>
                <th scope="row" className="py-2 pr-3 font-semibold">{l.segmento}</th>
                <td className="py-2 pr-3">{l.leads}</td>
                <td className="py-2 pr-3">{l.contatados}</td>
                <td className="py-2 pr-3">
                  {formatarTaxa(l.taxaResposta)}
                  {l.taxaResposta.amostraPequena && <span className="text-texto-suave"> · amostra pequena</span>}
                </td>
                <td className="py-2 pr-3">{l.reunioes}</td>
                <td className="py-2 pr-3">{l.propostas}</td>
                <td className="py-2">{l.conversoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Painel>
  );
}

export default async function IndicadoresPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const [leads, mensagens] = await Promise.all([listarLeads(), contarMensagens()]);
  const total = leads.length;
  const verificados = leads.filter((l) => l.evidenciasVerificadas > 0).length;
  const qualificados = leads.filter((l) => l.prioridade === "A" || l.prioridade === "B" || l.prioridade === "C").length;
  const contatados = leads.filter((l) => l.contatado).length;
  const responderam = leads.filter((l) => l.contatado && l.respondeu).length;
  const conversas = leads.filter((l) => l.status === "em_conversa" || l.status === "reuniao_proposta" || l.status === "convertido").length;
  const taxaResposta = taxa(responderam, contatados);
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}% de ${total}` : undefined);

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Indicadores"
        subtitulo="Funil de prospecção desde o início (sem filtro de período)."
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
      />
      <NavProspeccao atual="indicadores" />

      <section aria-label="Base" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Leads únicos cadastrados" valor={total} detalhe="duplicatas são barradas no cadastro" />
        <Indicador rotulo="Com fonte verificada" valor={verificados} detalhe={pct(verificados)} />
        <Indicador rotulo="Qualificados (A/B/C)" valor={qualificados} detalhe={pct(qualificados)} />
        <Indicador rotulo="Com canal utilizável" valor={leads.filter(temCanalUtilizavel).length} />
      </section>

      <section aria-label="Mensagens e funil" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Mensagens geradas" valor={mensagens.geradas} detalhe="todas as versões" />
        <Indicador rotulo="Mensagens aprovadas" valor={mensagens.aprovadas} />
        <Indicador rotulo="Mensagens enviadas" valor={mensagens.enviadas} detalhe="envio confirmado" />
        <Indicador
          rotulo="Taxa de resposta"
          valor={formatarTaxa(taxaResposta)}
          detalhe={taxaResposta.amostraPequena ? `amostra < ${AMOSTRA_MINIMA}: não conclua ainda` : "responderam ÷ contatados"}
        />
        <Indicador rotulo="Leads contatados" valor={contatados} />
        <Indicador rotulo="Conversas" valor={conversas} detalhe="em conversa, reunião ou convertido" />
        <Indicador rotulo="Reuniões / propostas" valor={`${leads.filter((l) => l.reuniao).length} / ${leads.filter((l) => l.proposta).length}`} />
        <Indicador rotulo="Parcerias fechadas" valor={leads.filter((l) => l.convertido).length} />
      </section>

      <Painel className="text-sm text-texto-suave">
        Critérios: “contatado” = lead com envio confirmado manualmente (gerar, aprovar ou abrir o WhatsApp não conta).
        Taxa de resposta = leads contatados que responderam ÷ leads contatados; sem contatados, “—”. Reunião, proposta e
        parceria contam leads com ao menos um registro desse tipo.
      </Painel>

      <TabelaSegmentos titulo="Categoria" linhas={resultadosPorSegmento(leads, (l) => ROTULOS_CATEGORIA[l.categoria])} />
      <TabelaSegmentos titulo="Prioridade" linhas={resultadosPorSegmento(leads, (l) => (l.prioridade ? ROTULOS_PRIORIDADE[l.prioridade] : "Não avaliado"))} />
      <TabelaSegmentos titulo="Município" linhas={resultadosPorSegmento(leads, (l) => l.municipio ?? "Não informado")} />
      <TabelaSegmentos titulo="Origem" linhas={resultadosPorSegmento(leads, (l) => (l.origem === "csv" ? "Importação CSV" : "Cadastro manual"))} />
    </main>
  );
}
