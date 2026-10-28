import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEvidencias, listarInteracoes, listarMensagens, listarQualificacoes, obterLead } from "@/lib/prospeccao";
import {
  ROTULOS_CAMPO,
  ROTULOS_CATEGORIA,
  ROTULOS_CONFIANCA,
  ROTULOS_INTERACAO,
  ROTULOS_STATUS,
  ROTULOS_TIPO_EVIDENCIA,
  ROTULOS_VERIFICACAO,
} from "@/lib/prospeccao-opcoes";
import { DIMENSOES, pendenciasCadastro } from "@/lib/prospeccao-pontuacao";
import { linkInstagram } from "@/lib/prospeccao-canais";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { SeloPrioridade } from "@/components/prospeccao/visual";
import {
  AcoesStatus,
  FormularioEvidencia,
  FormularioInteracao,
  FormularioQualificacao,
  VerificacaoEvidencia,
} from "@/components/prospeccao/secoes-lead";
import { MensagensLead } from "@/components/prospeccao/mensagens-lead";

export const metadata: Metadata = { title: "Lead" };

const data = (iso: string) => iso.split("-").reverse().join("/");
const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-texto-suave">não informado</span>}</dd>
    </div>
  );
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const lead = await obterLead(id);
  if (!lead) notFound();

  const [evidencias, qualificacoes, mensagens, interacoes] = await Promise.all([
    listarEvidencias(id),
    listarQualificacoes(id),
    listarMensagens(id),
    listarInteracoes(id),
  ]);
  const vigente = qualificacoes[0] ?? null;
  const pendencias = pendenciasCadastro({ ...lead, temQualificacao: vigente !== null });
  const evidenciaPorId = new Map(evidencias.map((e) => [e.id, e]));
  // Quais campos do cadastro têm fonte verificada (o resto é informado sem fonte).
  const camposComFonte = new Set(evidencias.filter((e) => e.campo && e.verificacao === "verificado").map((e) => e.campo));
  const fonte = (campo: string) =>
    camposComFonte.has(campo as never) ? null : <span className="ml-2 text-[13px] text-aviso">sem fonte verificada</span>;

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo={lead.nomeComercial}
        subtitulo={`${ROTULOS_CATEGORIA[lead.categoria]} · ${lead.municipio ?? "município não informado"} · ${ROTULOS_STATUS[lead.status]}`}
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
        acao={
          <Link href={`/prospeccao/${id}/editar`} className={botaoClasse("secundario")}>
            Editar dados
          </Link>
        }
      />

      {lead.naoContatar && (
        <Alerta tipo="perigo">Não contatar. Motivo: {lead.naoContatarMotivo ?? "não informado"}.</Alerta>
      )}
      {pendencias.length > 0 && <Alerta tipo="aviso">Pesquisa pendente: {pendencias.join(", ")}.</Alerta>}

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Dados comerciais</h2>
        <dl className="flex flex-col gap-3">
          <Linha rotulo="Nome legal">{lead.nomeLegal}</Linha>
          <Linha rotulo="Segmento">{lead.segmento}</Linha>
          <Linha rotulo="Endereço">{lead.endereco && <>{lead.endereco}{fonte("endereco")}</>}</Linha>
          <Linha rotulo="Site">
            {lead.site && (
              <>
                <a href={lead.site} target="_blank" rel="noopener noreferrer" className="text-link underline">{lead.site}</a>
                {fonte("site")}
              </>
            )}
          </Linha>
          <Linha rotulo="Instagram">
            {lead.instagram && (
              <>
                <a href={linkInstagram(lead.instagram)} target="_blank" rel="noopener noreferrer" className="text-link underline">@{lead.instagram}</a>
                {fonte("instagram")}
              </>
            )}
          </Linha>
          <Linha rotulo="Telefone">{lead.telefone && <>+{lead.telefone}{fonte("telefone")}</>}</Linha>
          <Linha rotulo="E-mail">{lead.email && <>{lead.email}{fonte("email")}</>}</Linha>
          <Linha rotulo="Outros perfis">{lead.outrosPerfis}</Linha>
          <Linha rotulo="Responsável comercial">{lead.responsavelComercial && <>{lead.responsavelComercial}{fonte("responsavel_comercial")}</>}</Linha>
          <Linha rotulo="Sinais de demanda">{lead.sinaisDemanda}</Linha>
          <Linha rotulo="Compatibilidade com parrilla">{lead.compatibilidadeParrilla}</Linha>
          <Linha rotulo="Limitações">{lead.limitacoes}</Linha>
          <Linha rotulo="Observações">{lead.observacoes}</Linha>
          <Linha rotulo="Responsável interno">{lead.responsavelNome}</Linha>
          <Linha rotulo="Origem">{lead.origem === "csv" ? "Importação CSV" : "Cadastro manual"}</Linha>
          <Linha rotulo="Criado / atualizado">{`${dataHora(lead.createdAt)} / ${dataHora(lead.updatedAt)}`}</Linha>
        </dl>
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Status e próxima ação</h2>
        <AcoesStatus lead={lead} />
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Evidências e fontes ({evidencias.length})</h2>
        {evidencias.length === 0 ? (
          <p className="text-texto-suave">Nenhuma fonte registrada. Sem fonte, nada aqui é fato verificado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {evidencias.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded-controle border border-borda p-3 text-sm">
                <p>
                  <span className="text-texto-suave">#{e.id}</span>{" "}
                  <strong className={e.verificacao === "divergente" ? "line-through" : ""}>{e.fato}</strong>
                </p>
                <p className="text-texto-suave">
                  {e.natureza === "inferencia" ? "Inferência" : "Fato"} · {ROTULOS_VERIFICACAO[e.verificacao]} · confiança{" "}
                  {ROTULOS_CONFIANCA[e.confianca].toLowerCase()} · {ROTULOS_TIPO_EVIDENCIA[e.tipo]}
                  {e.campo ? ` · sustenta "${ROTULOS_CAMPO[e.campo]}"` : ""}
                </p>
                <p className="text-texto-suave">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-link underline">{e.fonte}</a>
                  ) : (
                    e.fonte
                  )}{" "}
                  · consultada em {data(e.consultadoEm)}
                  {e.registradoPorNome ? ` · por ${e.registradoPorNome}` : ""}
                </p>
                {e.trecho && <blockquote className="border-l-2 border-borda-forte pl-3 italic">{e.trecho}</blockquote>}
                <VerificacaoEvidencia leadId={id} evidencia={e} />
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-controle border border-borda p-4">
          <summary className="cursor-pointer font-semibold">Registrar nova evidência</summary>
          <div className="mt-4">
            <FormularioEvidencia leadId={id} />
          </div>
        </details>
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Qualificação</h2>
        {vigente ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SeloPrioridade prioridade={vigente.prioridade} provisoria={vigente.provisoria} />
              <span>
                <strong>{vigente.pontuacao}</strong>
                {vigente.pontuacaoMaxima !== vigente.pontuacao ? ` (até ${vigente.pontuacaoMaxima} se as desconhecidas forem confirmadas)` : ""}{" "}
                / 100
              </span>
              <span className="text-sm text-texto-suave">
                completude {vigente.completude}% · confiança {ROTULOS_CONFIANCA[vigente.confianca].toLowerCase()} ·{" "}
                {vigente.avaliadoPorNome ?? "—"} em {dataHora(vigente.createdAt)}
              </span>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {DIMENSOES.map((d) => {
                const a = vigente.dimensoes.find((x) => x.chave === d.chave);
                return (
                  <li key={d.chave}>
                    <strong>{d.rotulo}:</strong>{" "}
                    {!a || a.pontos === null ? (
                      <span className="text-aviso">desconhecida (pesquisar)</span>
                    ) : (
                      <>
                        {a.pontos}/{a.maximo} — {a.justificativa}{" "}
                        <span className="text-texto-suave">
                          (confiança {ROTULOS_CONFIANCA[a.confianca].toLowerCase()}
                          {a.evidenciaIds.length > 0
                            ? `; evidências ${a.evidenciaIds.map((eid) => `#${eid}${evidenciaPorId.get(eid)?.natureza === "inferencia" ? " (inferência)" : ""}`).join(", ")}`
                            : "; sem evidência"}
                          )
                        </span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
            {vigente.observacoes && <p className="text-sm">{vigente.observacoes}</p>}
            {qualificacoes.length > 1 && (
              <p className="text-[13px] text-texto-suave">
                Avaliações anteriores:{" "}
                {qualificacoes
                  .slice(1)
                  .map((q) => `${q.pontuacao} pts (${q.prioridade}) em ${dataHora(q.createdAt)}`)
                  .join(" · ")}
              </p>
            )}
          </div>
        ) : (
          <p className="text-texto-suave">Ainda não avaliado.</p>
        )}
        <details className="rounded-controle border border-borda p-4">
          <summary className="cursor-pointer font-semibold">{vigente ? "Reavaliar" : "Avaliar"}</summary>
          <div className="mt-4">
            <FormularioQualificacao leadId={id} evidencias={evidencias} vigente={vigente} />
          </div>
        </details>
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Mensagens</h2>
        <MensagensLead lead={lead} mensagens={mensagens} evidencias={evidencias} />
      </Painel>

      <Painel como="section" className="flex flex-col gap-4">
        <h2 className={secaoTituloClasse}>Resultado do contato e histórico</h2>
        <FormularioInteracao lead={lead} />
        {interacoes.length > 0 && (
          <ol className="flex flex-col gap-2 border-t border-borda pt-4 text-sm">
            {interacoes.map((i) => (
              <li key={i.id}>
                <strong>{ROTULOS_INTERACAO[i.tipo]}</strong>
                {i.mensagemVersao ? ` (mensagem v${i.mensagemVersao})` : ""} — {dataHora(i.ocorridaEm)}
                {i.usuarioNome ? ` · ${i.usuarioNome}` : ""}
                {i.resumo && <p className="text-texto-suave">{i.resumo}</p>}
              </li>
            ))}
          </ol>
        )}
      </Painel>
    </main>
  );
}
