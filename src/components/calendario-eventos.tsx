import Link from "next/link";
import type { Evento } from "@/lib/eventos";
import { agruparPorDia, celulasDoMes, diaSelecionado, interpretarMes, mesAdjacente } from "@/lib/calendario-agenda";
import {
  chaveDiaEvento,
  formatarHora,
  nomeMes,
  partesDataEvento,
  varCorEmpresa,
} from "@/lib/formatacao";
import { ChipEmpresa, ChipStatus } from "@/components/chip-empresa";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const empresasLegenda = [
  "Buffet Senhor Churrasco",
  "Anjos Cerimonial",
  "Em Plena Natureza Chácara de Eventos",
];

function ListaDoDia({ eventos }: { eventos: Evento[] }) {
  return (
    <ul className="divide-y divide-borda overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <Link
            href={`/agenda/${evento.id}`}
            className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco"
          >
            <span className="font-semibold">{evento.cliente}</span>
            <span className="flex flex-wrap items-center gap-2">
              <ChipEmpresa nome={evento.empresa_nome} />
              <ChipStatus status={evento.status} />
              <span className="text-sm text-texto-suave">{formatarHora(evento.data_evento)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CalendarioEventos({
  eventos,
  mesParam,
  diaParam,
}: {
  eventos: Evento[];
  mesParam: string;
  diaParam?: string;
}) {
  const hoje = new Date();
  const { ano, mesIndice } = interpretarMes(mesParam, hoje);
  const mesChave = mesAdjacente(ano, mesIndice, 0);
  const ehMesAtual = hoje.getFullYear() === ano && hoje.getMonth() === mesIndice;

  const eventosPorDia = agruparPorDia(eventos, ano, mesIndice);
  const celulas = celulasDoMes(ano, mesIndice);
  const diaEscolhido = diaSelecionado(diaParam, ano, mesIndice);
  const dataEscolhida = diaEscolhido ? partesDataEvento(new Date(ano, mesIndice, diaEscolhido)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <Link
          href={`/agenda?visao=agenda&mes=${mesAdjacente(ano, mesIndice, -1)}`}
          className="rounded-controle px-3 py-1.5 text-sm text-texto-suave transition hover:bg-elevada hover:text-texto"
        >
          ← Mês anterior
        </Link>
        <p className="text-[17px] font-semibold text-texto">
          {nomeMes(ano, mesIndice)} de {ano}
        </p>
        <Link
          href={`/agenda?visao=agenda&mes=${mesAdjacente(ano, mesIndice, 1)}`}
          className="rounded-controle px-3 py-1.5 text-sm text-texto-suave transition hover:bg-elevada hover:text-texto"
        >
          Próximo mês →
        </Link>
      </div>

      {/* Abaixo de 768 px: grade compacta; tocar num dia mostra os eventos dele logo abaixo. */}
      <div className="flex flex-col gap-4 md:hidden">
        <div className="overflow-hidden rounded-cartao border border-borda bg-superficie text-texto">
          <div className="grid grid-cols-7 border-b border-borda">
            {diasSemana.map((dia) => (
              <div key={dia} className="py-2 text-center text-[13px] text-texto-suave">
                {dia.slice(0, 3)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {celulas.map((celula, indice) => {
              if (!celula) return <div key={`vazio-m-${indice}`} className="min-h-14 border-b border-r border-borda" />;
              const doDia = eventosPorDia.get(celula.dia) ?? [];
              const ehHoje = ehMesAtual && hoje.getDate() === celula.dia;
              const escolhido = diaEscolhido === celula.dia;
              const rotulo = `${celula.dia} de ${nomeMes(ano, mesIndice).toLowerCase()}, ${
                doDia.length === 0 ? "sem eventos" : doDia.length === 1 ? "1 evento" : `${doDia.length} eventos`
              }`;
              return (
                <Link
                  key={celula.dia}
                  href={`/agenda?visao=agenda&mes=${mesChave}&dia=${celula.dia}#eventos-do-dia`}
                  aria-label={rotulo}
                  aria-current={escolhido ? "date" : undefined}
                  className={`flex min-h-14 flex-col items-center gap-1 border-b border-r border-borda px-0.5 py-1.5 transition-colors hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco ${
                    escolhido ? "bg-elevada ring-1 ring-inset ring-brasa" : ""
                  }`}
                >
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full text-sm ${
                      ehHoje ? "bg-brasa font-semibold text-texto" : doDia.length > 0 ? "font-semibold" : "text-texto-suave"
                    }`}
                  >
                    {celula.dia}
                  </span>
                  <span aria-hidden className="flex h-2 items-center gap-0.5">
                    {doDia.slice(0, 3).map((evento) => (
                      <span
                        key={evento.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: varCorEmpresa(evento.empresa_nome) }}
                      />
                    ))}
                    {doDia.length > 3 && <span className="text-[10px] leading-none text-texto-suave">+</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <section id="eventos-do-dia" className="flex scroll-mt-4 flex-col gap-3">
          {diaEscolhido && dataEscolhida ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                <h2 className="text-[17px] font-semibold">
                  {dataEscolhida.semana}, {dataEscolhida.dia} {dataEscolhida.mes}
                </h2>
                <Link
                  href={`/agenda?visao=agenda&mes=${mesChave}`}
                  className="text-sm text-link underline decoration-link/40 underline-offset-4 hover:decoration-link"
                >
                  Ver o mês inteiro
                </Link>
              </div>
              {(eventosPorDia.get(diaEscolhido) ?? []).length === 0 ? (
                <p className="rounded-cartao border border-borda bg-superficie p-[18px] text-texto-suave">
                  Nenhum evento neste dia.
                </p>
              ) : (
                <ListaDoDia eventos={eventosPorDia.get(diaEscolhido) ?? []} />
              )}
            </>
          ) : eventosPorDia.size === 0 ? (
            <p className="rounded-cartao border border-borda bg-superficie p-[18px] text-texto-suave">
              Nenhum evento neste mês.
            </p>
          ) : (
            [...eventosPorDia.entries()]
              .sort(([a], [b]) => a - b)
              .map(([dia, doDia]) => {
                const data = partesDataEvento(new Date(ano, mesIndice, dia));
                return (
                  <div key={dia} className="flex flex-col gap-2">
                    <h2 className="px-1 text-[17px] font-semibold">
                      {data.semana}, {data.dia} {data.mes}
                    </h2>
                    <ListaDoDia eventos={doDia} />
                  </div>
                );
              })
          )}
        </section>
      </div>

      {/* A partir de 768 px: a grade mensal. */}
      <div className="hidden overflow-hidden rounded-cartao border border-borda bg-superficie text-texto md:block">
        <div className="grid grid-cols-7 border-b border-borda">
          {diasSemana.map((dia) => (
            <div
              key={dia}
              className="px-2 py-2 text-center text-sm text-texto-suave"
            >
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celulas.map((celula, indice) => {
            if (!celula) {
              return (
                <div
                  key={`vazio-${indice}`}
                  className="min-h-24 border-b border-r border-borda"
                />
              );
            }
            const eventosDoDia = eventosPorDia.get(celula.dia) ?? [];
            const ehHoje = ehMesAtual && hoje.getDate() === celula.dia;
            return (
              <div
                key={celula.dia}
                className="flex min-h-24 flex-col gap-1.5 border-b border-r border-borda p-2"
              >
                <span
                  className={`self-start text-sm ${
                    ehHoje
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-brasa text-texto"
                      : "text-texto-suave"
                  }`}
                >
                  {celula.dia}
                </span>
                <div className="flex flex-col gap-1">
                  {eventosDoDia.slice(0, 3).map((evento) => (
                    <Link
                      key={evento.id}
                      href={`/agenda/${evento.id}`}
                      title={`${evento.cliente} — ${evento.empresa_nome}`}
                      className="flex items-center gap-1.5 truncate text-sm hover:underline"
                    >
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: varCorEmpresa(evento.empresa_nome) }}
                      />
                      <span className="truncate">{evento.cliente}</span>
                    </Link>
                  ))}
                  {eventosDoDia.length > 3 && (
                    <Link
                      href={`/agenda?visao=sequencia#dia-${chaveDiaEvento(new Date(ano, mesIndice, celula.dia))}`}
                      aria-label={`Ver todos os ${eventosDoDia.length} eventos do dia ${celula.dia}, em sequência`}
                      className="self-start rounded-chip py-1 text-sm text-link underline decoration-link/40 underline-offset-4 hover:decoration-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                    >
                      +{eventosDoDia.length - 3} mais
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
        {empresasLegenda.map((nome) => (
          <div key={nome} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: varCorEmpresa(nome) }}
            />
            <p className="text-sm text-texto-suave">{nome}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
