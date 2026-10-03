import { useId, type ReactNode } from "react";

export const campoClasse =
  "min-h-11 rounded-[2px] border border-borda-campo bg-ink-soft px-3 py-2 text-base text-paper placeholder:text-texto-suave-escuro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass aria-[invalid=true]:border-2 aria-[invalid=true]:border-perigo-claro md:min-h-10";

// Campo sobre papel (filtros, tabelas): borda do campo e foco escuros, nunca brass.
export const campoClassePapel =
  "min-h-11 rounded-[2px] border border-borda-campo bg-transparent px-3 py-2 text-base text-paper-ink placeholder:text-texto-suave-papel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-perigo-escuro md:min-h-10";

export const rotuloClasse = "text-sm font-medium text-paper-dim";

export type PropsControle = {
  id: string;
  className: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type CampoProps = {
  rotulo: string;
  ajuda?: string;
  erro?: string;
  sobre?: "escuro" | "papel";
  /** Recebe id, className e aria-*: espalhe no input/select/textarea (`name` continua com você). */
  children: (props: PropsControle) => ReactNode;
};

export function Campo({ rotulo, ajuda, erro, sobre = "escuro", children }: CampoProps) {
  const id = useId();
  const ajudaId = ajuda ? `${id}-ajuda` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  const descricao = [ajudaId, erroId].filter(Boolean).join(" ") || undefined;
  const papel = sobre === "papel";
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={papel ? "text-sm font-medium text-paper-ink" : rotuloClasse}
      >
        {rotulo}
      </label>
      {children({
        id,
        className: papel ? campoClassePapel : campoClasse,
        "aria-describedby": descricao,
        "aria-invalid": erro ? true : undefined,
      })}
      {ajuda && (
        <p
          id={ajudaId}
          className={`text-xs ${papel ? "text-texto-suave-papel" : "text-texto-suave-escuro"}`}
        >
          {ajuda}
        </p>
      )}
      {erro && (
        <p
          id={erroId}
          className={`text-sm ${papel ? "text-perigo-escuro" : "text-perigo-claro"}`}
        >
          {erro}
        </p>
      )}
    </div>
  );
}
