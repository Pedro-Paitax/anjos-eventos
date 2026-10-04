import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { StatusEvento } from "@/lib/eventos";
import type { AtivosPorFuncao, ItemPendencia } from "@/lib/pendencias-evento";
import { rotuloEmDias, varCorEmpresa } from "@/lib/formatacao";
import { botaoClasse } from "@/components/botao";
import { BotaoResolverPendencias } from "@/components/botao-resolver-pendencias";
import { ChipEmpresa, ChipStatus } from "@/components/chip-empresa";
import { Painel } from "@/components/painel";
import { TileData } from "@/components/tile-data";

/** Evento já formatado para a Home (sem valor: a lista não o traz e ele fica fora do redesign). */
export type EventoHome = {
  id: number;
  cliente: string;
  empresaNome: string;
  tipo: string | null;
  status: StatusEvento;
  semana: string;
  dia: string;
  mes: string;
  hora: string;
  emDias: number;
};

export type PendenciaHome = { evento: EventoHome; itens: ItemPendencia[] };

type HomeConteudoProps = {
  nome: string;
  dias: number;
  eventos: EventoHome[];
  pendencias: PendenciaHome[];
  empresas: { id: number; nome: string }[];
  ativosPorFuncao: AtivosPorFuncao;
};

function Icone({ caminho }: { caminho: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={caminho} />
    </svg>
  );
}

const ICONE_AGENDA = "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4";
const ICONE_CHURRASCO = "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z";
const ICONE_MAIS = "M12 5v14 M5 12h14";
const ICONE_AVISO = "M12 4 21 20H3z M12 10v4 M12 17v.01";

const tituloSecao = "font-titulo text-[22px] font-semibold leading-[1.2] tracking-[-0.01em]";
const cartaoLink =
  "flex rounded-linha border border-borda bg-superficie shadow-realce transition-[background-color,border-color] hover:border-borda-forte hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco";

function Heroi({ evento }: { evento: EventoHome }) {
  const emDias = rotuloEmDias(evento.emDias);
  return (
    <section
      aria-labelledby="home-proximo"
      className="relative flex min-h-[280px] flex-col justify-between gap-7 overflow-hidden rounded-cartao border border-borda bg-superficie p-[22px] shadow-realce sm:p-7"
    >
      {/* Único brilho decorativo do produto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-[120px] h-[420px] w-[420px] bg-[radial-gradient(closest-side,rgb(242_117_63/0.34),transparent)]"
      />
      <p id="home-proximo" className="relative font-medium text-texto-suave">
        Próximo evento
      </p>
      <div className="relative flex items-center gap-[18px] sm:gap-7">
        <div className="flex min-w-20 flex-col items-center border-r border-borda-forte pr-[18px] font-medium text-link sm:min-w-[104px] sm:pr-7">
          <span>{evento.semana}</span>
          <strong className="font-titulo text-[clamp(64px,9vw,92px)] font-bold leading-[0.95] tracking-[-0.04em] text-texto">
            {evento.dia}
          </strong>
          <span>{evento.mes}</span>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <h2 className="font-titulo text-[clamp(24px,3vw,32px)] font-bold leading-[1.1] tracking-[-0.02em]">
            {evento.cliente}
          </h2>
          <p className="text-texto-suave">
            {evento.tipo ? `${evento.tipo}, às ${evento.hora}` : `às ${evento.hora}`}
          </p>
          <ChipEmpresa nome={evento.empresaNome} />
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3">
        {emDias ? <span className="font-titulo text-lg font-semibold text-link">{emDias}</span> : <span />}
        <Link href={`/agenda/${evento.id}`} className={botaoClasse("secundario")}>
          Abrir evento
        </Link>
      </div>
    </section>
  );
}

function PainelPendencias({
  pendencias,
  ativosPorFuncao,
}: {
  pendencias: PendenciaHome[];
  ativosPorFuncao: AtivosPorFuncao;
}) {
  return (
    <section
      aria-labelledby="home-pendencias"
      className="self-start rounded-cartao border border-borda bg-superficie p-[22px] shadow-realce"
    >
      <h2 id="home-pendencias" className="flex items-center gap-2.5 font-titulo text-xl font-semibold">
        <span className="text-aviso">
          <Icone caminho={ICONE_AVISO} />
        </span>
        Pendências
      </h2>
      {pendencias.map(({ evento, itens }) => (
        <div key={evento.id} className="mt-3.5 rounded-linha bg-elevada p-3.5">
          <p className="flex justify-between gap-2 font-semibold">
            <span className="min-w-0 truncate">{evento.cliente}</span>
            <span className="shrink-0 font-normal text-texto-suave">
              {evento.dia} {evento.mes}
            </span>
          </p>
          <ul className="mb-3 ml-[18px] mt-2 list-disc text-[15px] text-texto-suave">
            {itens.map((item) => (
              <li key={item.texto}>{item.texto}</li>
            ))}
          </ul>
          <BotaoResolverPendencias
            eventoId={evento.id}
            itens={itens}
            ativosPorFuncao={ativosPorFuncao}
            className={botaoClasse("secundario", "sm")}
          />
        </div>
      ))}
    </section>
  );
}

function Atalho({
  href,
  titulo,
  descricao,
  icone,
  corIcone,
}: {
  href: string;
  titulo: string;
  descricao: ReactNode;
  icone: ReactNode;
  corIcone?: CSSProperties;
}) {
  return (
    <Link href={href} className={`${cartaoLink} items-start gap-3.5 p-[18px]`}>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-controle bg-elevada text-brasa"
        style={corIcone}
      >
        {icone}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] font-semibold">{titulo}</span>
        <span className="text-sm text-texto-suave">{descricao}</span>
      </span>
    </Link>
  );
}

export function HomeConteudo({
  nome,
  dias,
  eventos,
  pendencias,
  empresas,
  ativosPorFuncao,
}: HomeConteudoProps) {
  const proximo = eventos[0];
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-titulo text-[clamp(30px,4vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">
          Bem-vindo, {nome}.
        </h1>
        <p className="max-w-prose text-texto-suave">
          Central de eventos do Buffet Senhor Churrasco, da Anjos Cerimonial e da Em Plena Natureza.
        </p>
      </header>

      {proximo ? (
        <div
          className={`grid gap-5 ${pendencias.length > 0 ? "rail:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" : ""}`}
        >
          <Heroi evento={proximo} />
          {pendencias.length > 0 && (
            <PainelPendencias pendencias={pendencias} ativosPorFuncao={ativosPorFuncao} />
          )}
        </div>
      ) : null}

      <section aria-labelledby="home-lista" className="flex flex-col gap-3.5">
        <h2 id="home-lista" className={tituloSecao}>
          Próximos {dias} dias
        </h2>
        {eventos.length === 0 ? (
          <Painel className="flex flex-col items-start gap-1">
            <p className="text-texto-suave">Nenhum evento nos próximos {dias} dias.</p>
            <Link href="/agenda" className={botaoClasse("link", "sm")}>
              Ver agenda completa
            </Link>
          </Painel>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {eventos.map((evento) => (
              <li key={evento.id}>
                <Link
                  href={`/agenda/${evento.id}`}
                  className={`${cartaoLink} grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3 py-3 pl-3 pr-3 rail:grid-cols-[68px_minmax(0,1fr)_auto] rail:gap-4 rail:pr-[18px]`}
                >
                  <TileData
                    empresaNome={evento.empresaNome}
                    semana={evento.semana}
                    dia={evento.dia}
                    mes={evento.mes}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[17px] font-semibold">{evento.cliente}</span>
                    <span className="block text-sm text-texto-suave">
                      {evento.tipo ? `${evento.tipo} · ${evento.hora}` : evento.hora}
                    </span>
                  </span>
                  <span className="col-span-2 flex flex-wrap items-center gap-3 rail:col-span-1 rail:justify-end">
                    <ChipEmpresa nome={evento.empresaNome} />
                    <ChipStatus status={evento.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {empresas.length > 0 && (
        <section aria-labelledby="home-orcamento" className="flex flex-col gap-3.5">
          <h2 id="home-orcamento" className={tituloSecao}>
            Novo orçamento
          </h2>
          <div className="grid gap-3.5 sm:grid-cols-3">
            {empresas.map((empresa) => (
              <Atalho
                key={empresa.id}
                href={`/agenda/novo?empresa=${empresa.id}`}
                titulo={empresa.nome}
                descricao="Cadastrar evento para esta empresa."
                corIcone={{ color: varCorEmpresa(empresa.nome) }}
                icone={<Icone caminho={ICONE_MAIS} />}
              />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="home-atalhos" className="flex flex-col gap-3.5">
        <h2 id="home-atalhos" className={tituloSecao}>
          Atalhos
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Atalho
            href="/agenda"
            titulo="Agenda unificada"
            descricao="Todos os eventos das três empresas, num só calendário."
            icone={<Icone caminho={ICONE_AGENDA} />}
          />
          <Atalho
            href="/senhor-churrasco"
            titulo="Senhor Churrasco"
            descricao="Preparos, Cardápios Feitos e Simulador de Cardápio."
            icone={<Icone caminho={ICONE_CHURRASCO} />}
          />
        </div>
      </section>
    </>
  );
}
