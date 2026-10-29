import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import {
  contarEnviosHoje,
  listarCandidatos,
  listarFila,
  listarMensagensModelo,
  obterConfigEnvio,
} from "@/lib/prospeccao-envio-auto";
import { LIMITE_DIARIO_MAXIMO, liberacaoValida } from "@/lib/prospeccao-envio";
import { statusWorker } from "@/lib/whatsapp-worker";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";
import { campoClasse, rotuloClasse } from "@/components/campo";
import { Vazio } from "@/components/vazio";
import { Indicador, NavProspeccao } from "@/components/prospeccao/visual";
import {
  cancelarItemAction,
  conferirItemAction,
  desligarEnvioAction,
  enfileirarLeadAction,
  ligarEnvioAction,
} from "@/app/actions/prospeccao-envio";

export const metadata: Metadata = { title: "Envio automático — Prospecção" };
export const dynamic = "force-dynamic";

const ROTULO_ESTADO = {
  pendente: "Na fila",
  enviando: "Enviando",
  enviada: "Enviada",
  falhou: "Falhou",
  cancelada: "Cancelada",
  conferir: "Conferir no WhatsApp",
} as const;

const dataHora = (d: Date | string) =>
  new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function EnvioAutomaticoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  const { erro, ok } = await searchParams;

  // Tabelas da migração 0010: sem ela, a página explica em vez de quebrar.
  let dados;
  try {
    const [config, hoje, fila, candidatos, modelos, worker] = await Promise.all([
      obterConfigEnvio(),
      contarEnviosHoje(),
      listarFila(),
      listarCandidatos(),
      listarMensagensModelo(),
      statusWorker(),
    ]);
    dados = { config, hoje, fila, candidatos, modelos, worker };
  } catch (e) {
    if ((e as { code?: string }).code === "42P01") {
      return (
        <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
          <CabecalhoPagina titulo="Envio automático" voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }} />
          <Alerta tipo="aviso">A migração 0010 ainda não foi aplicada neste banco.</Alerta>
        </main>
      );
    }
    throw e;
  }
  const { config, hoje, fila, candidatos, modelos, worker } = dados;
  const ligado = liberacaoValida(config);
  const limite = config?.limiteDiario ?? LIMITE_DIARIO_MAXIMO;

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-8">
      <CabecalhoPagina
        titulo="Envio automático"
        subtitulo="O Gemini escreve o WhatsApp de cada lead da fila e o sistema envia sozinho, no horário comercial, até o limite diário. Só a primeira mensagem passa por validação humana."
        voltarPara={{ href: "/prospeccao", rotulo: "← Prospecção" }}
      />
      <NavProspeccao atual="envio" />

      {erro && <Alerta tipo="perigo">{erro}</Alerta>}
      {ok && <Alerta tipo="sucesso">{ok}</Alerta>}

      <section aria-label="Situação" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Envio automático" valor={ligado ? "Ligado" : "Desligado"} />
        <Indicador rotulo="Enviados hoje" valor={`${hoje} / ${limite}`} detalhe="dia de São Paulo" />
        <Indicador
          rotulo="WhatsApp"
          valor={worker ? (worker.status === "connected" ? "Conectado" : "Desconectado") : "Worker fora do ar"}
        />
        <Indicador rotulo="Na fila" valor={fila.filter((f) => f.estado === "pendente").length} />
      </section>

      <section className="flex flex-col gap-4 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce">
        <h2 className="font-titulo text-xl font-bold">1. Validar a primeira mensagem</h2>
        <p className="text-sm text-texto-suave">
          Gere uma mensagem de WhatsApp com a IA (Gemini) na página de um lead, revise e aprove. Depois escolha-a aqui:
          é a única validação humana; as demais seguem o mesmo padrão sem revisão. Sem frase de saída (decisão do Pedro).
        </p>
        {ligado ? (
          <>
            <Alerta tipo="sucesso">
              Ligado. Remetente: {config?.nomeRemetente}. Limite: {config?.limiteDiario} por dia.
            </Alerta>
            <form action={desligarEnvioAction}>
              <button type="submit" className={botaoClasse("perigo")}>
                Desligar envio automático
              </button>
            </form>
          </>
        ) : modelos.length === 0 ? (
          <Alerta tipo="info">Ainda não há mensagem do Gemini (WhatsApp) aprovada. Gere e aprove uma na página de um lead.</Alerta>
        ) : (
          <form action={ligarEnvioAction} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className={rotuloClasse}>Mensagem validada</legend>
              {modelos.map((m, i) => (
                <label key={m.id} className="flex gap-3 rounded-controle border border-borda p-3">
                  <input type="radio" name="mensagem_id" value={m.id} defaultChecked={i === 0} required />
                  <span className="flex flex-col gap-1 text-sm">
                    <span className="text-texto-suave">
                      {m.leadNome} · aprovada por {m.aprovadaPorNome ?? "—"} em {dataHora(m.aprovadaEm)}
                    </span>
                    <span className="whitespace-pre-wrap">{m.conteudo}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1.5">
              <span className={rotuloClasse}>Nome que assina as mensagens</span>
              <input name="nome_remetente" defaultValue={usuario.nome} required maxLength={60} className={campoClasse} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={rotuloClasse}>Limite por dia (máximo {LIMITE_DIARIO_MAXIMO})</span>
              <input
                name="limite_diario"
                type="number"
                min={1}
                max={LIMITE_DIARIO_MAXIMO}
                defaultValue={LIMITE_DIARIO_MAXIMO}
                required
                className={campoClasse}
              />
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="confirmo" className="mt-1" />
              <span>
                Validei esta mensagem e autorizo o envio automático, pelo WhatsApp conectado, de textos escritos pelo Gemini no
                mesmo padrão, para os leads da fila.
              </span>
            </label>
            <button type="submit" className={botaoClasse()}>
              Ligar envio automático
            </button>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce">
        <h2 className="font-titulo text-xl font-bold">2. Leads que podem entrar na fila</h2>
        <p className="text-sm text-texto-suave">
          Só aparecem leads com telefone no formato 55 + DDD + número, sem contato anterior e sem bloqueio.
        </p>
        {candidatos.length === 0 ? (
          <Vazio>Nenhum lead elegível fora da fila.</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {candidatos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/prospeccao/${c.id}`} className="min-w-0 text-sm hover:underline">
                  {c.nomeComercial}
                  {c.municipio ? ` · ${c.municipio}` : ""}
                </Link>
                <form action={enfileirarLeadAction.bind(null, c.id)}>
                  <button type="submit" className={botaoClasse("secundario", "sm")}>
                    Enfileirar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce">
        <h2 className="font-titulo text-xl font-bold">3. Fila e histórico</h2>
        {fila.length === 0 ? (
          <Vazio>Fila vazia.</Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {fila.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <Link href={`/prospeccao/${f.leadId}`} className="font-semibold hover:underline">
                    {f.leadNome}
                  </Link>
                  <p className="text-texto-suave">
                    {ROTULO_ESTADO[f.estado]}
                    {f.motivo ? ` — ${f.motivo}` : ""} · {dataHora(f.concluidoEm ?? f.createdAt)}
                  </p>
                </div>
                {f.estado === "pendente" && (
                  <form action={cancelarItemAction.bind(null, f.id)}>
                    <button type="submit" className={botaoClasse("secundario", "sm")}>
                      Cancelar
                    </button>
                  </form>
                )}
                {f.estado === "conferir" && (
                  <div className="flex gap-2">
                    <form action={conferirItemAction.bind(null, f.id, true)}>
                      <button type="submit" className={botaoClasse("secundario", "sm")}>
                        A mensagem saiu
                      </button>
                    </form>
                    <form action={conferirItemAction.bind(null, f.id, false)}>
                      <button type="submit" className={botaoClasse("secundario", "sm")}>
                        Não saiu
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
