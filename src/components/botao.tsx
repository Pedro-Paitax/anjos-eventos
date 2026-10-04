import type { ButtonHTMLAttributes } from "react";

export type VarianteBotao = "primario" | "secundario" | "perigo" | "link";
export type TamanhoBotao = "md" | "sm";
export type SuperficieBotao = "escuro" | "papel";

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
  secundario: "", // depende da superfície, ver secundarioPorSuperficie
  perigo: "bg-perigo text-sobre-perigo hover:bg-perigo-hover",
  link: "px-1 underline underline-offset-4",
};

// O secundário não define cor de texto no papel (herda o texto escuro do papel).
const secundarioPorSuperficie: Record<SuperficieBotao, string> = {
  escuro: "border-borda-forte bg-white/5 text-texto hover:bg-white/10",
  papel: "border-borda-campo hover:bg-paper-dim/10",
};

const linkPorSuperficie: Record<SuperficieBotao, string> = {
  escuro: "text-link decoration-link/40 hover:decoration-link",
  papel: "text-acao decoration-acao/40 hover:decoration-acao",
};

/** Classes de botão; use direto em `<Link>` que deve parecer botão. */
export function botaoClasse(
  variante: VarianteBotao = "primario",
  tamanho: TamanhoBotao = "md",
  sobre: SuperficieBotao = "escuro"
) {
  return [
    base,
    tamanhos[tamanho],
    variantes[variante],
    variante === "secundario" ? secundarioPorSuperficie[sobre] : "",
    variante === "link" ? linkPorSuperficie[sobre] : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  sobre?: SuperficieBotao;
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  sobre = "escuro",
  type = "button",
  className,
  ...props
}: BotaoProps) {
  return (
    <button
      type={type}
      className={`${botaoClasse(variante, tamanho, sobre)}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
