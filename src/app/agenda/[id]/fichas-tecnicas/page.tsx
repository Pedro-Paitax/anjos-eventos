import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { obterFichasTecnicasEvento } from "@/lib/ficha-tecnica-evento";
import { formatarData } from "@/lib/formatacao";
import { BotaoImprimir } from "@/components/botao-imprimir";

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

  return (
    <main className="min-h-full bg-white px-6 py-10 text-black print:px-0 print:py-0">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 print:max-w-none">
        <header className="flex flex-col gap-3 print:hidden">
          <a
            href={`/agenda/${evento.id}`}
            className="text-sm text-black/60 underline decoration-black/30 underline-offset-4 transition hover:text-black"
          >
            ← Voltar pro evento
          </a>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl italic">Fichas Técnicas — {evento.cliente}</h1>
              <p className="text-sm text-black/60">
                {formatarData(evento.data_evento)} · {evento.empresa_nome} · produção real + 10% de buffer
              </p>
            </div>
            <BotaoImprimir />
          </div>
        </header>

        {fichas.length === 0 && (
          <p className="text-sm text-black/70">
            Este evento não tem cardápio confirmado em Itens_Evento_Confirmados — nada pra exportar.
          </p>
        )}

        {fichas.map((ficha, indice) => (
          <article
            key={ficha.preparoId}
            className={indice < fichas.length - 1 ? "break-after-page" : undefined}
          >
            <h2 className="font-display text-xl italic">{ficha.nomePreparo}</h2>
            <p className="mt-1 text-sm text-black/70">
              Rendimento ajustado: {formatarQuantidade(ficha.rendimentoAjustado)}{" "}
              {NOME_UNIDADE_RENDIMENTO[ficha.unidadeRendimento] ?? ficha.unidadeRendimento}
            </p>

            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-black/60">
              Insumos
            </h3>
            {ficha.insumos.length === 0 ? (
              <p className="mt-1 text-sm text-black/70">Sem itens de composição cadastrados.</p>
            ) : (
              <table className="mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/20 text-left">
                    <th className="py-1 pr-3 font-normal">Insumo</th>
                    <th className="py-1 font-normal">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.insumos.map((insumo) => (
                    <tr key={insumo.insumoId} className="border-b border-black/10">
                      <td className="py-1 pr-3">{insumo.nome}</td>
                      <td className="py-1">
                        {formatarQuantidade(insumo.quantidadeEscalada)} {insumo.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-black/60">
              Modo de preparo
            </h3>
            {ficha.passos ? (
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                {ficha.passos.map((passo) => (
                  <li key={passo.ordem}>
                    {passo.descricao}
                    {passo.tempo_estimado_min && (
                      <span className="text-black/60"> ({passo.tempo_estimado_min} min)</span>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm">{ficha.modoPreparoBruto}</p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
