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
import { ChipEmpresa } from "@/components/chip-empresa";
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

  const churrasco = empresaEscolhida?.nome === "Buffet Senhor Churrasco";

  return (
    <main
      className={`mx-auto flex w-full flex-col gap-8 ${churrasco ? "max-w-pagina" : "max-w-pagina-documento"}`}
    >
      <CabecalhoPagina
        brasa
        titulo="Novo orçamento"
        subtitulo="Passo 2 da Máquina de Estados: Orçamento → Aprovar → Evento. Cadastro manual — a extração automática de contrato vem numa etapa futura."
        voltarPara={
          empresaEscolhida
            ? { href: "/agenda/novo", rotulo: "← Trocar empresa" }
            : { href: "/agenda", rotulo: "← Agenda" }
        }
      />

      {!empresaEscolhida ? (
        <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-3">
          {empresas.map((item) => (
            <Link
              key={item.id}
              href={`/agenda/novo?empresa=${item.id}`}
              className="flex flex-col gap-2 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce transition-[background-color,border-color] hover:border-borda-forte hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <ChipEmpresa nome={item.nome} />
              <p className="text-sm text-texto-suave">Cadastrar evento para esta empresa.</p>
            </Link>
          ))}
        </div>
      ) : churrasco ? (
        <FormularioOrcamentoChurrasco
          empresaId={empresaEscolhida.id}
          preparosPorCategoria={await listarPreparosPorCategoria()}
          cardapiosModelo={await listarCardapiosModelo()}
          action={criarOrcamentoAction}
        />
      ) : (
        <Painel>
          <FormularioOrcamentoGenerico empresaId={empresaEscolhida.id} action={criarOrcamentoAction} />
        </Painel>
      )}
    </main>
  );
}
