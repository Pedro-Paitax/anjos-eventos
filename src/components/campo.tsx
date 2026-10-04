import { useId, type ReactNode } from "react";

// Campo do Brasa: o estilo mora em `.campo-controle` (globals.css), que também cobre select e textarea.
export const campoClasse = "campo-controle";

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
  /** Recebe id, className e aria-*: espalhe no input/select/textarea (`name` continua com você). */
  children: (props: PropsControle) => ReactNode;
};

export function Campo({ rotulo, ajuda, erro, children }: CampoProps) {
  const id = useId();
  const ajudaId = ajuda ? `${id}-ajuda` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  const descricao = [ajudaId, erroId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={rotuloClasse}
      >
        {rotulo}
      </label>
      {children({
        id,
        className: campoClasse,
        "aria-describedby": descricao,
        "aria-invalid": erro ? true : undefined,
      })}
      {ajuda && (
        <p
          id={ajudaId}
          className="text-[13px] text-texto-suave"
        >
          {ajuda}
        </p>
      )}
      {erro && (
        <p
          id={erroId}
          className="flex items-center gap-1.5 text-sm text-perigo"
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
