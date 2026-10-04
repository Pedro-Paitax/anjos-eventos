import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { obterFichasTecnicasEvento } from "@/lib/ficha-tecnica-evento";
import { formatarData } from "@/lib/formatacao";
import { BotaoImprimir } from "@/components/botao-imprimir";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fichas técnicas" };

type PaginaFichasTecnicasProps = {
  params: Promise<{ id: string }>;
};

const NOME_UNIDADE_RENDIMENTO: Record<string, string> = {
  G: "g",
  ML: "ml",
  Unidade: "unidade(s)",
};

function formatarQuantidade(valor: number): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export default async function PaginaFichasTecnicas({ params }: PaginaFichasTecnicasProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const evento = await obterEvento(idNumero);
  if (!evento) {
    notFound();
  }

  const fichas = await obterFichasTecnicasEvento(idNumero);
  const numConvidados =
    (evento.qtd_adultos ?? 0) + (evento.qtd_criancas_ate_5 ?? 0) + (evento.qtd_criancas_5_a_10 ?? 0);

  return (
    <main className="sem-animacao min-h-full bg-white px-6 py-10 text-black print:px-0 print:py-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col print:max-w-none">
        <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
          <a
            href={`/agenda/${evento.id}`}
            className="text-sm text-black/60 underline decoration-black/30 underline-offset-4 transition hover:text-black"
          >
            ← Voltar pro evento
          </a>
          <BotaoImprimir />
        </div>

        {/* Cabeçalho do documento — uma vez só, não repetido por preparo. */}
        <header className="mb-10 border-b-2 border-black pb-6 print:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
            Ficha Técnica de Produção
          </p>
          <h1 className="mt-1 font-display text-3xl italic">{evento.cliente}</h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-black/50">Empresa</dt>
              <dd className="mt-0.5">{evento.empresa_nome}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-black/50">Data do evento</dt>
              <dd className="mt-0.5 capitalize">{formatarData(evento.data_evento)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-black/50">Convidados</dt>
              <dd className="mt-0.5">{numConvidados > 0 ? numConvidados : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-black/50">Preparos</dt>
              <dd className="mt-0.5">
                {fichas.length} · produção real + 10% de buffer
              </dd>
            </div>
          </dl>
        </header>

        {fichas.length === 0 && (
          <p className="text-sm text-black/70">
            Este evento não tem cardápio confirmado em Itens_Evento_Confirmados — nada pra exportar.
          </p>
        )}

        {/*
          Bloco de listagem em fluxo normal (display: block), NUNCA flex —
          break-after/page-break-after em filhos de um container flex é mal
          suportado no motor de impressão do Chromium e gera uma página em
          branco/gigante extra depois do ÚLTIMO item (achado em produção,
          docs/PENDENCIAS_NOTURNAS.md). O espaçamento vertical por isso vem
          de margin em cada artigo, não de gap no pai.
        */}
        <div>
          {fichas.map((ficha, indice) => (
            <article
              key={ficha.preparoId}
              className={
                indice < fichas.length - 1
                  ? "break-after-page mb-12 border-b border-black/10 pb-10 print:mb-0 print:border-none print:pb-0"
                  : undefined
              }
            >
              <p className="text-xs font-medium uppercase tracking-wide text-black/40">
                Preparo {indice + 1} de {fichas.length}
              </p>
              <h2 className="mt-1 font-display text-2xl italic">{ficha.nomePreparo}</h2>
              <p className="mt-1 text-sm text-black/60">
                Rendimento ajustado: {formatarQuantidade(ficha.rendimentoAjustado)}{" "}
                {NOME_UNIDADE_RENDIMENTO[ficha.unidadeRendimento] ?? ficha.unidadeRendimento}
              </p>

              <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-black/60">
                Insumos
              </h3>
              {ficha.insumos.length === 0 ? (
                <p className="text-sm text-black/70">Sem itens de composição cadastrados.</p>
              ) : (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-black/[0.06] text-left">
                      <th className="border border-black/15 px-3 py-1.5 font-semibold">Insumo</th>
                      <th className="border border-black/15 px-3 py-1.5 text-right font-semibold">
                        Quantidade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ficha.insumos.map((insumo, indiceInsumo) => (
                      <tr
                        key={insumo.insumoId}
                        className={indiceInsumo % 2 === 1 ? "bg-black/[0.03]" : undefined}
                      >
                        <td className="border border-black/10 px-3 py-1.5">{insumo.nome}</td>
                        <td className="border border-black/10 px-3 py-1.5 text-right tabular-nums">
                          {formatarQuantidade(insumo.quantidadeEscalada)} {insumo.unidade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-black/60">
                Modo de preparo
              </h3>
              {ficha.passos ? (
                <ol className="flex list-none flex-col gap-4">
                  {ficha.passos.map((passo) => (
                    <li key={passo.ordem} className="flex items-start gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-black text-sm font-semibold">
                        {passo.ordem}
                      </span>
                      <p className="flex-1 pt-1 text-base leading-relaxed">
                        {passo.descricao}
                        {passo.tempo_estimado_min && (
                          <span className="ml-2 text-sm text-black/50">
                            ({passo.tempo_estimado_min} min)
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="whitespace-pre-wrap text-base leading-relaxed">{ficha.modoPreparoBruto}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
