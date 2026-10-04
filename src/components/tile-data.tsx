import type { CSSProperties } from "react";
import { varCorEmpresa } from "@/lib/formatacao";

type TileDataProps = {
  empresaNome: string;
  semana: string;
  dia: string;
  mes: string;
};

/** Tile de data: dia grande sobre a tinta da empresa a 16 % (contraste calculado em DESIGN-SYSTEM §4.2). */
export function TileData({ empresaNome, semana, dia, mes }: TileDataProps) {
  return (
    <div
      aria-hidden="true"
      className="flex h-[68px] flex-col items-center justify-center rounded-tile bg-[color-mix(in_srgb,var(--emp)_16%,var(--color-superficie))] text-[var(--emp)] rail:h-[76px]"
      style={{ ["--emp" as string]: varCorEmpresa(empresaNome) } as CSSProperties}
    >
      <span className="text-xs font-semibold leading-[1.2]">{semana}</span>
      <span className="font-titulo text-[28px] font-bold leading-[1.05] text-texto">{dia}</span>
      <span className="text-xs font-semibold leading-[1.2]">{mes}</span>
    </div>
  );
}
