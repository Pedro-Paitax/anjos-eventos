import type { ElementType, ReactNode } from "react";

type PainelProps = {
  como?: ElementType;
  id?: string;
  className?: string;
  children: ReactNode;
};

/** Painel de formulário sobre a moldura escura: superfície `ink-soft` + borda suave, sem sombra. */
export function Painel({ como: Tag = "div", className, ...props }: PainelProps) {
  return (
    <Tag
      className={`rounded-[2px] border border-paper-dim/15 bg-ink-soft p-4 sm:p-6${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
