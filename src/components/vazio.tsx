import type { ReactNode } from "react";

type VazioProps = {
  /** O que está vazio e por quê. */
  children: ReactNode;
  /** A ação para sair do vazio (um verbo): link ou botão. */
  acao?: ReactNode;
};

/** Estado vazio sobre papel: texto objetivo + ação, sem ilustração. */
export function Vazio({ children, acao }: VazioProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <p className="max-w-prose text-sm text-texto-suave-papel">{children}</p>
      {acao}
    </div>
  );
}
