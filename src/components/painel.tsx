import type { ElementType, ReactNode } from "react";

type PainelProps = {
  como?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
};

/** Painel de seção do Brasa: `superficie` + borda fina + realce interno, raio de cartão, sem sombra. */
export function Painel({ como: Tag = "div", className, ...props }: PainelProps) {
  return (
    <Tag
      className={`rounded-cartao border border-borda bg-superficie p-[18px] shadow-realce sm:p-6${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
