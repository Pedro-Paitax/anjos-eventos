import Link from "next/link";
import type { Evento } from "@/lib/eventos";
import {
  corEmpresa,
  formatarData,
  formatarHora,
  formatarValor,
  rotuloStatus,
} from "@/lib/formatacao";

export function ListaEventos({ eventos }: { eventos: Evento[] }) {
  if (eventos.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
        Nenhum evento ainda. Cadastre o primeiro pra começar a montar a
        agenda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-paper-ink/10">
      {eventos.map((evento) => (
        <li key={evento.id}>
          <Link
            href={`/agenda/${evento.id}`}
            className="flex flex-col gap-2 px-6 py-4 transition hover:bg-paper-dim/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${corEmpresa(
                  evento.empresa_nome
                )}`}
              />
              <div>
                <p className="font-display text-lg italic">
                  {evento.cliente}
                </p>
                <p className="text-sm text-paper-ink/70">
                  {evento.empresa_nome}
                  {evento.tipo_evento ? `, ${evento.tipo_evento}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1 pl-6 sm:items-end sm:pl-0">
              <p className="text-sm">
                {formatarData(evento.data_evento)},{" "}
                {formatarHora(evento.data_evento)}
              </p>
              <div className="flex items-center gap-3 text-sm text-paper-ink/70">
                <span>{rotuloStatus(evento.status)}</span>
                {evento.valor && <span>{formatarValor(evento.valor)}</span>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
