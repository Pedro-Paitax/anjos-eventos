import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterOrcamento } from "@/lib/orcamentos";
import { aprovarConfirmarEventoAction } from "@/app/actions/orcamento";
import { calcularPrecificacaoParaEvento } from "@/lib/precificacao-cardapio";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioConfirmarEvento } from "@/components/formulario-confirmar-evento";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orçamento" };

type PaginaOrcamentoProps = {
  params: Promise<{ id: string }>;
};

export default async function OrcamentoPage({ params }: PaginaOrcamentoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const orcamento = await obterOrcamento(idNumero);
  if (!orcamento) {
    notFound();
  }

  const confirmarComId = aprovarConfirmarEventoAction.bind(null, orcamento.id);

  // Mesma função pura usada de verdade na confirmação (src/lib/orcamentos.ts,
  // montarValoresEvento) — sem I/O, já que o preço vem pronto do Orçamento
  // (itens=[] porque precoPorPessoaEscolhido substitui o cálculo de custo).
  const ehChurrasco = orcamento.itens.length > 0;
  const precificacaoChurrasco =
    ehChurrasco && orcamento.precoPessoa != null
      ? (() => {
          const resultado = calcularPrecificacaoParaEvento(
            [],
            {
              numConvidados: orcamento.numConvidados,
              regiaoMetropolitanaCuritiba: orcamento.regiaoMetropolitanaCuritiba ?? false,
              quantidadeGarcom: orcamento.qtdGarcons ?? undefined,
              valorGarcom: orcamento.valorGarcom ?? undefined,
              precoPorPessoaEscolhido: orcamento.precoPessoa,
            },
            {
              adultos: orcamento.qtdAdultos ?? 0,
              criancasAte5: orcamento.qtdCriancasAte5 ?? 0,
              criancas5a10: orcamento.qtdCriancas5a10 ?? 0,
            }
          );
          return {
            precoPessoa: resultado.valor_sugerido_por_pessoa,
            precoCrianca: resultado.valor_sugerido_crianca,
            taxaDeslocamento: resultado.taxa_deslocamento,
            qtdGarcons: resultado.quantidade_garcom_usada,
            valorGarcom: resultado.valor_garcom,
            valorTotal: resultado.valor_sugerido_total_evento,
          };
        })()
      : undefined;

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={`Orçamento #${orcamento.id} — ${orcamento.clienteNome ?? "sem cliente"}`}
          subtitulo={`${orcamento.empresaNome} · ${orcamento.numConvidados} convidados · status: ${orcamento.status}`}
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
        />

        {orcamento.status !== "Simulação" ? (
          <Painel className="text-sm text-paper-dim">
            Este Orçamento já foi {orcamento.status === "Aceito" ? "aceito e convertido em Evento" : orcamento.status.toLowerCase()}
            {orcamento.eventoId != null && (
              <>
                {" "}
                — <a className="underline" href={`/agenda/${orcamento.eventoId}`}>ver o Evento</a>.
              </>
            )}
          </Painel>
        ) : (
          <Painel>
            {orcamento.itens.length > 0 && (
              <div className="mb-6 flex flex-col gap-2 rounded-[2px] border border-paper-dim/20 bg-ink-soft p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-paper-dim/70">
                  Cardápio do Orçamento (fixado — trocar item exige um novo Orçamento)
                </p>
                <ul className="list-disc pl-5 text-sm text-paper">
                  {orcamento.itens.map((item) => (
                    <li key={item.preparoId}>{item.preparoNome}</li>
                  ))}
                </ul>
              </div>
            )}

            <FormularioConfirmarEvento
              orcamento={orcamento}
              action={confirmarComId}
              precificacaoChurrasco={precificacaoChurrasco}
            />
          </Painel>
        )}
      </div>
    </main>
  );
}
