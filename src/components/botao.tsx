import type { ButtonHTMLAttributes } from "react";

export type VarianteBotao = "primario" | "secundario" | "perigo" | "link";
export type TamanhoBotao = "md" | "sm";

// Brasa (DESIGN-SYSTEM §11.1). Toque de 44 px; no desktop (rail, 900 px) o `sm` vai a 36 px.
// A transição não inclui outline-color: o anel de foco aparece na hora.
const base =
  "inline-flex items-center justify-center gap-2 rounded-controle border border-transparent font-semibold transition-[color,background-color,border-color,text-decoration-color,opacity,box-shadow,translate,scale] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:cursor-not-allowed disabled:opacity-50";

const tamanhos: Record<TamanhoBotao, string> = {
  md: "min-h-11 px-5 text-[15px]",
  sm: "min-h-11 px-3.5 text-sm rail:min-h-9",
};

const variantes: Record<VarianteBotao, string> = {
  primario: "bg-brasa text-sobre-brasa shadow-brasa hover:bg-brasa-hover",
  secundario: "border-borda-forte bg-white/5 text-texto hover:bg-white/10",
  perigo: "bg-perigo text-sobre-perigo hover:bg-perigo-hover",
  link: "px-1 text-link underline decoration-link/40 underline-offset-4 hover:decoration-link",
};

/** Classes de botão; use direto em `<Link>` que deve parecer botão. */
export function botaoClasse(variante: VarianteBotao = "primario", tamanho: TamanhoBotao = "md") {
  return [base, tamanhos[tamanho], variantes[variante]].join(" ");
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  type = "button",
  className,
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      className={`${botaoClasse(variante, tamanho)}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
