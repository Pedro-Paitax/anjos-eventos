import type { ButtonHTMLAttributes } from "react";

export type VarianteBotao = "primario" | "secundario" | "perigo" | "link";
export type TamanhoBotao = "md" | "sm";
export type SuperficieBotao = "escuro" | "papel";

const base =
  "inline-flex items-center justify-center rounded-[2px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-50";

const tamanhos: Record<TamanhoBotao, string> = {
  md: "min-h-11 px-5 text-sm md:min-h-10",
  sm: "min-h-11 px-3 text-sm md:min-h-8",
};

const variantes: Record<VarianteBotao, string> = {
  primario: "bg-acao text-paper shadow-elev-1 hover:bg-acao-forte",
  secundario: "border border-borda-campo hover:bg-paper-dim/10",
  perigo: "bg-perigo-escuro text-paper hover:brightness-110",
  link: "px-0 underline underline-offset-4",
};

const linkPorSuperficie: Record<SuperficieBotao, string> = {
  escuro: "text-acao-claro decoration-acao-claro/40 hover:decoration-acao-claro",
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
