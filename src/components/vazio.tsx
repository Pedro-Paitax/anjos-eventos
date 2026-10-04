import type { ReactNode } from "react";

type VazioProps = {
  /** Superfície onde o vazio aparece. Padrão `papel` (listas atuais); `escuro` já usa os tokens do Brasa. */
  sobre?: "escuro" | "papel";
  /** O que está vazio e por quê. */
  children: ReactNode;
  /** A ação para sair do vazio (um verbo): link ou botão. */
  acao?: ReactNode;
};

/** Estado vazio: texto objetivo + ação, sem ilustração. Ainda sobre papel até a Etapa 5 (listas). */
export function Vazio({ children, acao, sobre = "papel" }: VazioProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <p className={`max-w-prose text-sm ${sobre === "papel" ? "text-texto-suave-papel" : "text-texto-suave"}`}>{children}</p>
      {acao}
    </div>
  );
}
