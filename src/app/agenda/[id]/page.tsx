import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { listarPreparosPorCategoria } from "@/lib/preparos";
import { listarCardapiosModelo } from "@/lib/cardapios-modelo";
import { eventoTemCardapioConfirmado, listarPreparosConfirmadosEvento } from "@/lib/ficha-tecnica-evento";
import { listarColaboradoresAtivos } from "@/lib/colaboradores";
import {
  EMPRESA_SENHOR_CHURRASCO,
  obterDecisoes,
  listarEquipeEvento,
  itensPendenciaPorEvento,
} from "@/lib/decisoes-operacionais";
import { ANCORA_DECISOES_OPERACIONAIS, type AtivosPorFuncao } from "@/lib/pendencias-evento";
import { BotaoResolverPendencias } from "@/components/botao-resolver-pendencias";
import { formatarData, formatarHora } from "@/lib/formatacao";
import { atualizarEventoAction } from "@/app/actions/evento";
import { salvarDecisoesOperacionaisAction } from "@/app/actions/decisoes-operacionais";
import { FormularioDecisoesOperacionais } from "@/components/formulario-decisoes-operacionais";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioEventoChurrasco } from "@/components/formulario-evento-churrasco";
import { FormularioEventoGenerico } from "@/components/formulario-evento-generico";
import { BotaoExcluirEvento } from "@/components/botao-excluir-evento";

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

  const evento = await obterEvento(idNumero);

  if (!evento) {
    notFound();
  }

  const atualizarComId = atualizarEventoAction.bind(null, evento.id);
  const temCardapioConfirmado = await eventoTemCardapioConfirmado(evento.id);
  const cardapioConfirmado = temCardapioConfirmado
    ? await listarPreparosConfirmadosEvento(evento.id)
    : null;

  const ehChurrasco = evento.empresa_nome === EMPRESA_SENHOR_CHURRASCO;
  const decisoes = ehChurrasco ? await obterDecisoes(evento.id) : null;
  const equipeIds = ehChurrasco ? await listarEquipeEvento(evento.id) : [];
  const colaboradoresAtivos = ehChurrasco ? await listarColaboradoresAtivos() : [];
  const pendencias = ehChurrasco
    ? ((await itensPendenciaPorEvento([evento.id])).get(evento.id) ?? [])
    : [];
  const ativosPorFuncao: AtivosPorFuncao = { copeira: 0, assador: 0, garcom: 0 };
  for (const c of colaboradoresAtivos) ativosPorFuncao[c.funcao] += 1;

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo={evento.cliente}
          subtitulo={evento.empresa_nome}
          voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
          acao={
            <div className="flex items-center gap-3">
              {temCardapioConfirmado && (
                <Link
                  href={`/agenda/${evento.id}/fichas-tecnicas`}
                  target="_blank"
                  className="rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm text-paper transition hover:border-paper-dim hover:bg-paper/5"
                >
                  Exportar Fichas Técnicas
                </Link>
              )}
              <BotaoExcluirEvento eventoId={evento.id} clienteNome={evento.cliente} />
            </div>
          }
        />

        <div className="rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
          {ehChurrasco ? (
            <FormularioEventoChurrasco
              empresaId={evento.empresa_id}
              valoresIniciais={evento}
              preparosPorCategoria={await listarPreparosPorCategoria()}
              cardapiosModelo={await listarCardapiosModelo()}
              cardapioConfirmado={cardapioConfirmado}
              action={atualizarComId}
              rotuloEnvio="Salvar alterações"
            />
          ) : (
            <FormularioEventoGenerico
              empresaId={evento.empresa_id}
              valoresIniciais={evento}
              action={atualizarComId}
              rotuloEnvio="Salvar alterações"
            />
          )}
        </div>

        {ehChurrasco && (
          <section id={ANCORA_DECISOES_OPERACIONAIS} className="flex scroll-mt-6 flex-col gap-4 rounded-[2px] bg-ink-soft/60 p-6 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-2xl italic text-paper">
              Decisões operacionais
            </h2>
            {decisoes?.ordens_disparadas_em && (
              <p className="text-sm text-paper-dim">
                Ordens de Ação enviadas em{" "}
                {formatarData(decisoes.ordens_disparadas_em)},{" "}
                {formatarHora(decisoes.ordens_disparadas_em)}. Mudanças feitas depois
                não atualizam mensagens já enviadas.
              </p>
            )}
            {pendencias.length > 0 && (
              <div className="flex flex-col items-start gap-3 rounded-[2px] border border-aviso-claro/40 p-3 text-sm text-aviso-claro">
                <ul className="list-disc pl-4">
                  {pendencias.map((p) => (
                    <li key={p.texto}>{p.texto}</li>
                  ))}
                </ul>
                <BotaoResolverPendencias
                  eventoId={evento.id}
                  itens={pendencias}
                  ativosPorFuncao={ativosPorFuncao}
                />
              </div>
            )}
            <FormularioDecisoesOperacionais
              colaboradoresAtivos={colaboradoresAtivos}
              equipeIds={equipeIds}
              valoresIniciais={decisoes}
              action={salvarDecisoesOperacionaisAction.bind(null, evento.id)}
            />
          </section>
        )}
      </div>
    </main>
  );
}
