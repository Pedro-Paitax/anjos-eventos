import Link from "next/link";
import type { Evento } from "@/lib/eventos";
import { chaveAnoMes, formatarHora, nomeMes, partesDataEvento, varCorEmpresa } from "@/lib/formatacao";
import { ChipEmpresa, ChipStatus } from "@/components/chip-empresa";

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const empresasLegenda = [
  "Buffet Senhor Churrasco",
  "Anjos Cerimonial",
  "Em Plena Natureza Chácara de Eventos",
];

function mesAdjacente(ano: number, mesIndice: number, delta: number) {
  const data = new Date(ano, mesIndice + delta, 1);
  return chaveAnoMes(data);
}

export function CalendarioEventos({
  eventos,
  mesParam,
}: {
  eventos: Evento[];
  mesParam: string;
}) {
  const [anoTexto, mesTexto] = mesParam.split("-");
  const ano = Number(anoTexto);
  const mesIndice = Number(mesTexto) - 1;

  const primeiroDiaSemana = new Date(ano, mesIndice, 1).getDay();
  const diasNoMes = new Date(ano, mesIndice + 1, 0).getDate();
  const hoje = new Date();
  const ehMesAtual =
    hoje.getFullYear() === ano && hoje.getMonth() === mesIndice;

  const eventosPorDia = new Map<number, Evento[]>();
  for (const evento of eventos) {
    const data = new Date(evento.data_evento);
    if (data.getFullYear() === ano && data.getMonth() === mesIndice) {
      const dia = data.getDate();
      const lista = eventosPorDia.get(dia) ?? [];
      lista.push(evento);
      eventosPorDia.set(dia, lista);
    }
  }

  const celulas: Array<{ dia: number } | null> = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1 })),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);

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

      {/* Abaixo de 768 px: lista agrupada por dia (mesmos eventos e links da grade). */}
      <div className="md:hidden">
        {eventosPorDia.size === 0 ? (
          <p className="rounded-cartao border border-borda bg-superficie p-[18px] text-texto-suave">
            Nenhum evento neste mês.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {[...eventosPorDia.entries()]
              .sort(([a], [b]) => a - b)
              .map(([dia, eventosDoDia]) => {
                const data = partesDataEvento(new Date(ano, mesIndice, dia));
                return (
                  <section key={dia} className="flex flex-col gap-2">
                    <h3 className="px-1 text-[17px] font-semibold">
                      {data.semana}, {data.dia} {data.mes}
                    </h3>
                    <ul className="divide-y divide-borda overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
                      {eventosDoDia.map((evento) => (
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
                  </section>
                );
              })}
          </div>
        )}
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
                    <p className="text-sm text-texto-suave">
                      +{eventosDoDia.length - 3} mais
                    </p>
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
