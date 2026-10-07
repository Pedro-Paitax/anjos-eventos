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
import { FocoPorAncora } from "@/components/foco-por-ancora";
import { formatarData, formatarHora } from "@/lib/formatacao";
import { atualizarEventoAction } from "@/app/actions/evento";
import { salvarDecisoesOperacionaisAction } from "@/app/actions/decisoes-operacionais";
import { FormularioDecisoesOperacionais } from "@/components/formulario-decisoes-operacionais";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormularioEventoChurrasco } from "@/components/formulario-evento-churrasco";
import { FormularioEventoGenerico } from "@/components/formulario-evento-generico";
import { BotaoExcluirEvento } from "@/components/botao-excluir-evento";
import { BotaoEnviarListaCompras } from "@/components/botao-enviar-lista-compras";
import { botaoClasse } from "@/components/botao";
import {
  destinoListaCompras,
  mascararDestino,
  obterUltimoEnvioListaCompras,
} from "@/lib/lista-compras-envio";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Evento" };

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

  // Consulta própria (coluna da migração 0007): se falhar, volta null e a tela abre igual.
  const ultimoEnvioLista = await obterUltimoEnvioListaCompras(evento.id);
  const destinoLista = destinoListaCompras();

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
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      {ehChurrasco && <FocoPorAncora />}
      <CabecalhoPagina
        titulo={evento.cliente}
        subtitulo={evento.empresa_nome}
        voltarPara={{ href: "/agenda", rotulo: "← Agenda" }}
        acao={
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/agenda/${evento.id}/lista-compras`} className={botaoClasse("secundario")}>
              Lista de compras
            </Link>
            <BotaoEnviarListaCompras
              eventoId={evento.id}
              temCardapioConfirmado={temCardapioConfirmado}
              destinoMascarado={destinoLista ? mascararDestino(destinoLista) : null}
              ultimoEnvio={ultimoEnvioLista}
            />
            {temCardapioConfirmado && (
              <Link
                href={`/agenda/${evento.id}/fichas-tecnicas`}
                target="_blank"
                className={botaoClasse("secundario")}
              >
                Exportar Fichas Técnicas
              </Link>
            )}
            <BotaoExcluirEvento eventoId={evento.id} clienteNome={evento.cliente} />
          </div>
        }
      />

      <Painel>
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
      </Painel>

      {ehChurrasco && (
        <Painel como="section" id={ANCORA_DECISOES_OPERACIONAIS} className="flex scroll-mt-6 flex-col gap-4">
          <h2 className="font-titulo text-xl font-semibold leading-[1.2] tracking-[-0.01em]">
            Decisões operacionais
          </h2>
          {decisoes?.ordens_disparadas_em && (
            <p className="text-sm text-texto-suave">
              Ordens de Ação enviadas em{" "}
              {formatarData(decisoes.ordens_disparadas_em)},{" "}
              {formatarHora(decisoes.ordens_disparadas_em)}. Mudanças feitas depois
              não atualizam mensagens já enviadas.
            </p>
          )}
          {pendencias.length > 0 && (
            <Alerta tipo="aviso">
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
            </Alerta>
          )}
          <FormularioDecisoesOperacionais
            colaboradoresAtivos={colaboradoresAtivos}
            equipeIds={equipeIds}
            garconsNecessarios={evento.qtd_garcons}
            valoresIniciais={decisoes}
            action={salvarDecisoesOperacionaisAction.bind(null, evento.id)}
          />
        </Painel>
      )}
    </main>
  );
}
