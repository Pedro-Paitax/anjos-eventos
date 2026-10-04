import { useId, type ReactNode } from "react";

// Campo do Brasa: o estilo mora em `.campo-controle` (globals.css), que também cobre select e textarea.
export const campoClasse = "campo-controle";

// Campo sobre papel (filtros, tabelas): borda do campo e foco escuros, nunca brass.
export const campoClassePapel =
  "min-h-11 rounded-[2px] border border-borda-campo bg-transparent px-3 py-2 text-base text-paper-ink placeholder:text-texto-suave-papel focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper-ink aria-[invalid=true]:border-2 aria-[invalid=true]:border-perigo-escuro md:min-h-10";

export const rotuloClasse = "text-sm font-medium text-texto-suave";

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
          className={`text-[13px] ${papel ? "text-texto-suave-papel" : "text-texto-suave"}`}
        >
          {ajuda}
        </p>
      )}
      {erro && (
        <p
          id={erroId}
          className={`flex items-center gap-1.5 text-sm ${papel ? "text-perigo-escuro" : "text-perigo"}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="10" cy="10" r="8" />
            <path d="m7.5 7.5 5 5m0-5-5 5" />
          </svg>
          {erro}
        </p>
      )}
    </div>
  );
}
