import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEmpresas } from "@/lib/empresas";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { criarOrcamentoAction } from "@/app/actions/orcamento";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioOrcamentoChurrasco } from "@/components/formulario-orcamento-churrasco";
import { FormularioOrcamentoGenerico } from "@/components/formulario-orcamento-generico";
import { Painel } from "@/components/painel";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Novo orçamento" };

type NovoEventoPageProps = {
  searchParams: Promise<{ empresa?: string }>;
};

export default async function NovoEventoPage({
  searchParams,
}: NovoEventoPageProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { empresa } = await searchParams;
  const empresas = await listarEmpresas();
  const empresaEscolhida = empresa
    ? empresas.find((item) => item.id === Number(empresa))
    : undefined;

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Novo orçamento"
          subtitulo="Passo 2 da Máquina de Estados: Orçamento → Aprovar → Evento. Cadastro manual — a extração automática de contrato vem numa etapa futura."
          voltarPara={
            empresaEscolhida
              ? { href: "/agenda/novo", rotulo: "← Trocar empresa" }
              : { href: "/agenda", rotulo: "← Agenda" }
          }
        />

        {!empresaEscolhida ? (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            {empresas.map((item) => (
              <Link
                key={item.id}
                href={`/agenda/novo?empresa=${item.id}`}
                className="group relative flex flex-col gap-2 overflow-hidden rounded-[2px] bg-paper p-5 text-paper-ink shadow-[0_18px_28px_-16px_rgba(0,0,0,0.6)] transition hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1.5 bg-paper-dim"
                />
                <p className="font-display text-lg italic">{item.nome}</p>
                <p className="text-sm text-paper-ink/70">
                  Cadastrar evento para esta empresa.
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <Painel>
            {empresaEscolhida.nome === "Buffet Senhor Churrasco" ? (
              <FormularioOrcamentoChurrasco
                empresaId={empresaEscolhida.id}
                preparosPorCategoria={await listarPreparosPorCategoria()}
                cardapiosModelo={await listarCardapiosModelo()}
                action={criarOrcamentoAction}
              />
            ) : (
              <FormularioOrcamentoGenerico empresaId={empresaEscolhida.id} action={criarOrcamentoAction} />
            )}
          </Painel>
        )}
      </div>
    </main>
  );
}
