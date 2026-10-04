import type { CSSProperties } from "react";
import type { StatusEvento } from "@/lib/eventos";
import { rotuloStatus, varCorEmpresa } from "@/lib/formatacao";

/** Empresa: ponto de 8 px na cor da empresa + o nome (a cor nunca é o único sinal). */
export function ChipEmpresa({ nome }: { nome: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-chip bg-white/[0.06] px-2.5 py-1 text-[13px] font-medium text-texto"
      style={{ ["--emp" as string]: varCorEmpresa(nome) } as CSSProperties}
    >
      <i aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[var(--emp)]" />
      {nome}
    </span>
  );
}

// Classes literais (o Tailwind só gera o que aparece escrito por inteiro).
const coresStatus: Record<StatusEvento, string> = {
  confirmado: "bg-sucesso/[0.14] text-sucesso",
  orcado: "bg-info/[0.14] text-info",
  realizado: "bg-white/[0.06] text-texto-suave",
  cancelado: "bg-perigo/[0.14] text-perigo",
};

/** Status do evento: o texto sempre aparece junto da cor. */
export function ChipStatus({ status }: { status: StatusEvento }) {
  return (
    <span className={`rounded-chip px-2.5 py-1 text-[13px] font-semibold ${coresStatus[status]}`}>
      {rotuloStatus(status)}
    </span>
  );
}
