import Link from "next/link";
import type { Evento } from "@/lib/eventos";
import { formatarHora, formatarValor, partesDataEvento } from "@/lib/formatacao";
import { ChipEmpresa, ChipStatus } from "@/components/chip-empresa";
import { TileData } from "@/components/tile-data";
import { Vazio } from "@/components/vazio";

export function ListaEventos({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <Vazio>
        Nenhum evento ainda. Cadastre o primeiro pra começar a montar a
        agenda.
      </Vazio>
    );
  }

  return (
    <ul className="divide-y divide-borda">
      {eventos.map((evento) => {
        const data = partesDataEvento(evento.data_evento);
        return (
          <li key={evento.id}>
            <Link
              href={`/agenda/${evento.id}`}
              className="grid grid-cols-[60px_minmax(0,1fr)] items-center gap-3 px-3 py-3 transition-colors hover:bg-elevada focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco rail:grid-cols-[68px_minmax(0,1fr)_auto] rail:gap-4 rail:px-4"
            >
              <TileData
                empresaNome={evento.empresa_nome}
                semana={data.semana}
                dia={data.dia}
                mes={data.mes}
              />
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-semibold">{evento.cliente}</span>
                <span className="block text-sm text-texto-suave">
                  {evento.tipo_evento ? `${evento.tipo_evento} · ` : ""}
                  {formatarHora(evento.data_evento)}
                </span>
              </span>
              <span className="col-span-2 flex flex-wrap items-center gap-3 rail:col-span-1 rail:justify-end">
                <ChipEmpresa nome={evento.empresa_nome} />
                <ChipStatus status={evento.status} />
                {evento.valor && (
                  <span className="font-semibold tabular-nums">{formatarValor(evento.valor)}</span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
