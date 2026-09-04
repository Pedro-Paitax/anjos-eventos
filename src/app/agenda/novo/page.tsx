import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEmpresas } from "@/lib/empresas";
import { criarEventoAction } from "@/app/actions/evento";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioEvento } from "@/components/formulario-evento";

export default async function NovoEventoPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const empresas = await listarEmpresas();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Novo evento"
          subtitulo="Cadastro manual — a extração automática de contrato vem numa etapa futura."
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioEvento
            empresas={empresas}
            action={criarEventoAction}
            rotuloEnvio="Cadastrar evento"
          />
        </div>
      </div>
    </main>
  );
}
