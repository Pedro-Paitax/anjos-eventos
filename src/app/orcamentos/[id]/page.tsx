import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterOrcamento } from "@/lib/orcamentos";
import { aprovarConfirmarEventoAction } from "@/app/actions/orcamento";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioConfirmarEvento } from "@/components/formulario-confirmar-evento";

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

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={`Orçamento #${orcamento.id} — ${orcamento.clienteNome ?? "sem cliente"}`}
          subtitulo={`${orcamento.empresaNome} · ${orcamento.numConvidados} convidados · status: ${orcamento.status}`}
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
        />

        {orcamento.status !== "Simulação" ? (
          <div className="rounded-[2px] bg-ink-soft/60 p-6 text-sm text-paper-dim shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
            Este Orçamento já foi {orcamento.status === "Aceito" ? "aceito e convertido em Evento" : orcamento.status.toLowerCase()}
            {orcamento.eventoId != null && (
              <>
                {" "}
                — <a className="underline" href={`/agenda/${orcamento.eventoId}`}>ver o Evento</a>.
              </>
            )}
          </div>
        ) : (
          <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
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

            <FormularioConfirmarEvento orcamento={orcamento} action={confirmarComId} />
          </div>
        )}
      </div>
    </main>
  );
}
