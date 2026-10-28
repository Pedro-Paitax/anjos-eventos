import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarLeads, contarMensagens } from "@/lib/prospeccao";
import { filtrarLeads, municipiosDistintos, temCanalUtilizavel, type FiltrosLeads } from "@/lib/prospeccao-filtros";
import { CATEGORIAS_LEAD, CONFIANCAS, ROTULOS_CATEGORIA, ROTULOS_CONFIANCA, ROTULOS_STATUS, STATUS_LEAD } from "@/lib/prospeccao-opcoes";
import { ROTULOS_PRIORIDADE } from "@/lib/prospeccao-pontuacao";
import { canaisDisponiveis } from "@/lib/prospeccao-canais";
import { ROTULOS_CANAL } from "@/lib/prospeccao-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { botaoClasse } from "@/components/botao";
import { campoClasse, rotuloClasse } from "@/components/campo";
import { Vazio } from "@/components/vazio";
import { Seletor } from "@/components/seletor";
import { Alerta } from "@/components/alerta";
import { Indicador, NavProspeccao, SeloPrioridade } from "@/components/prospeccao/visual";

export const metadata: Metadata = { title: "Prospecção" };

type ProspeccaoPageProps = {
  searchParams: Promise<FiltrosLeads & { importados?: string }>;
};

// Filtros por GET: a URL guarda o filtro (dá para salvar e compartilhar o link).
function Filtro({ nome, rotulo, valor, opcoes }: { nome: string; rotulo: string; valor?: string; opcoes: { valor: string; rotulo: string }[] }) {
  const id = `filtro-${nome}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={rotuloClasse}>
        {rotulo}
      </label>
      <Seletor id={id} name={nome} defaultValue={valor ?? ""} opcoes={[{ valor: "", rotulo: "Todos" }, ...opcoes]} />
    </div>
  );
}

export default async function ProspeccaoPage({ searchParams }: ProspeccaoPageProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const { importados, ...filtros } = await searchParams;
  const [todos, mensagens] = await Promise.all([listarLeads(), contarMensagens()]);
  const leads = filtrarLeads(todos, filtros);

  const verificados = todos.filter((l) => l.evidenciasVerificadas > 0).length;
  const qualificados = todos.filter((l) => l.prioridade === "A" || l.prioridade === "B" || l.prioridade === "C").length;
  const prontos = todos.filter((l) => l.status === "pronto_para_contato").length;
  const contatados = todos.filter((l) => l.contatado).length;
  const responderam = todos.filter((l) => l.contatado && l.respondeu).length;

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Prospecção"
        subtitulo="Parceiros para experiências com parrilla e fogo ao vivo — Curitiba e RMC. Contato sempre manual."
        voltarPara={{ href: "/", rotulo: "← Início" }}
        acao={
          <Link href="/prospeccao/novo" className={botaoClasse()}>
            Novo lead
          </Link>
        }
      />
      <NavProspeccao atual="leads" />

      {importados && <Alerta tipo="sucesso">{importados} lead(s) importado(s).</Alerta>}

      <section aria-label="Visão geral" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Leads" valor={todos.length} />
        <Indicador rotulo="Com fonte verificada" valor={verificados} />
        <Indicador rotulo="Qualificados (A/B/C)" valor={qualificados} />
        <Indicador rotulo="Prontos para contato" valor={prontos} />
        <Indicador rotulo="Mensagens aprovadas" valor={mensagens.aprovadas} detalhe={`${mensagens.geradas} geradas`} />
        <Indicador rotulo="Contatados" valor={contatados} detalhe="envio confirmado" />
        <Indicador rotulo="Responderam" valor={responderam} />
        <Indicador rotulo="Convertidos" valor={todos.filter((l) => l.convertido).length} />
      </section>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce sm:grid-cols-4">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={rotuloClasse}>Buscar</span>
          <input name="busca" defaultValue={filtros.busca ?? ""} placeholder="Nome ou segmento" className={campoClasse} />
        </label>
        <Filtro nome="categoria" rotulo="Categoria" valor={filtros.categoria} opcoes={CATEGORIAS_LEAD.map((c) => ({ valor: c, rotulo: ROTULOS_CATEGORIA[c] }))} />
        <Filtro nome="municipio" rotulo="Município" valor={filtros.municipio} opcoes={municipiosDistintos(todos).map((m) => ({ valor: m, rotulo: m }))} />
        <Filtro
          nome="prioridade"
          rotulo="Prioridade"
          valor={filtros.prioridade}
          opcoes={[
            ...(["A", "B", "C", "baixa", "indefinida"] as const).map((p) => ({ valor: p, rotulo: ROTULOS_PRIORIDADE[p] })),
            { valor: "sem", rotulo: "Não avaliado" },
          ]}
        />
        <Filtro nome="status" rotulo="Status" valor={filtros.status} opcoes={STATUS_LEAD.map((s) => ({ valor: s, rotulo: ROTULOS_STATUS[s] }))} />
        <Filtro
          nome="canal"
          rotulo="Canal de contato"
          valor={filtros.canal}
          opcoes={[
            { valor: "com", rotulo: "Com canal utilizável" },
            { valor: "sem", rotulo: "Sem canal (pesquisar)" },
          ]}
        />
        <Filtro nome="confianca" rotulo="Confiança da avaliação" valor={filtros.confianca} opcoes={CONFIANCAS.map((c) => ({ valor: c, rotulo: ROTULOS_CONFIANCA[c] }))} />
        <Filtro nome="ordem" rotulo="Ordenar" valor={filtros.ordem} opcoes={[{ valor: "pontuacao", rotulo: "Maior pontuação" }]} />
        <div className="flex items-end gap-3 sm:col-span-4">
          <button type="submit" className={botaoClasse("secundario")}>
            Filtrar
          </button>
          <Link href="/prospeccao" className={botaoClasse("link", "sm")}>
            Limpar
          </Link>
          <span className="ml-auto text-sm text-texto-suave">
            {leads.length} de {todos.length}
          </span>
        </div>
      </form>

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        {leads.length === 0 ? (
          <Vazio
            acao={
              <Link href="/prospeccao/novo" className={botaoClasse()}>
                Novo lead
              </Link>
            }
          >
            {todos.length === 0 ? "Nenhum lead cadastrado. Cadastre ou importe um CSV." : "Nenhum lead com esses filtros."}
          </Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {leads.map((l) => {
              const canais = canaisDisponiveis(l);
              return (
                <li key={l.id}>
                  <Link href={`/prospeccao/${l.id}`} className="flex flex-col gap-1.5 px-6 py-4 hover:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[17px] font-semibold">{l.nomeComercial}</p>
                      <p className="text-sm text-texto-suave">
                        {ROTULOS_CATEGORIA[l.categoria]} · {l.municipio ?? "município ?"} · {ROTULOS_STATUS[l.status]}
                        {" · "}
                        {temCanalUtilizavel(l)
                          ? canais.map((c) => ROTULOS_CANAL[c]).join(", ")
                          : l.naoContatar
                            ? "não contatar"
                            : "sem canal"}
                      </p>
                      {l.proximaAcao && (
                        <p className="text-[13px] text-texto-suave">
                          Próxima ação: {l.proximaAcao}
                          {l.proximaAcaoEm ? ` (${l.proximaAcaoEm.split("-").reverse().join("/")})` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {l.pontuacao !== null && (
                        <span className="text-sm text-texto-suave">
                          {l.pontuacao}
                          {l.pontuacaoMaxima !== l.pontuacao ? `–${l.pontuacaoMaxima}` : ""} pts
                        </span>
                      )}
                      <SeloPrioridade prioridade={l.prioridade} provisoria={l.provisoria} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
