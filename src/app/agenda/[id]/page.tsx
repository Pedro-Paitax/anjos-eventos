import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEmpresas } from "@/lib/empresas";
import { obterEvento } from "@/lib/eventos";
import { atualizarEventoAction } from "@/app/actions/evento";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioEvento } from "@/components/formulario-evento";

type PaginaEventoProps = {
  params: Promise<{ id: string }>;
};

export default async function EventoPage({ params }: PaginaEventoProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const [empresas, evento] = await Promise.all([
    listarEmpresas(),
    obterEvento(idNumero),
  ]);

  if (!evento) {
    notFound();
  }

  const atualizarComId = atualizarEventoAction.bind(null, evento.id);

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={evento.cliente}
          subtitulo={evento.empresa_nome}
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          <FormularioEvento
            empresas={empresas}
            valoresIniciais={evento}
            action={atualizarComId}
            rotuloEnvio="Salvar alterações"
          />
        </div>
      </div>
    </main>
  );
}
