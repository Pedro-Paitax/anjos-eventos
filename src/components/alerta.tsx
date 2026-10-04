import type { ReactNode } from "react";

export type TipoAlerta = "perigo" | "aviso" | "sucesso" | "info";
export type SuperficieAlerta = "escuro" | "papel";

// Classes literais (o Tailwind só gera o que aparece escrito por inteiro).
const cores: Record<TipoAlerta, Record<SuperficieAlerta, string>> = {
  perigo: {
    escuro: "border-perigo/50 bg-perigo/10 text-perigo",
    papel: "border-perigo-escuro/50 bg-perigo-escuro/10 text-perigo-escuro",
  },
  aviso: {
    escuro: "border-aviso/50 bg-aviso/10 text-aviso",
    papel: "border-aviso-escuro/50 bg-aviso-escuro/10 text-aviso-escuro",
  },
  sucesso: {
    escuro: "border-sucesso/50 bg-sucesso/10 text-sucesso",
    papel: "border-sucesso-escuro/50 bg-sucesso-escuro/10 text-sucesso-escuro",
  },
  info: {
    escuro: "border-info/50 bg-info/10 text-info",
    papel: "border-info-escuro/50 bg-info-escuro/10 text-info-escuro",
  },
};

// A forma do ícone muda por tipo: o estado nunca depende só da cor.
function Icone({ tipo }: { tipo: TipoAlerta }) {
  const comum = {
    "aria-hidden": true,
    viewBox: "0 0 20 20",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "mt-0.5 shrink-0",
  };
  if (tipo === "aviso")
    return (
      <svg {...comum}>
        <path d="M10 3 18 17H2L10 3Z" />
        <path d="M10 8v4M10 14.5v.01" />
      </svg>
    );
  if (tipo === "sucesso")
    return (
      <svg {...comum}>
        <circle cx="10" cy="10" r="8" />
        <path d="m6.5 10.5 2.5 2.5 4.5-5" />
      </svg>
    );
  if (tipo === "info")
    return (
      <svg {...comum}>
        <circle cx="10" cy="10" r="8" />
        <path d="M10 9v5M10 6.5v.01" />
      </svg>
    );
  return (
    <svg {...comum}>
      <circle cx="10" cy="10" r="8" />
      <path d="m7.5 7.5 5 5m0-5-5 5" />
    </svg>
  );
}

type AlertaProps = {
  tipo: TipoAlerta;
  sobre?: SuperficieAlerta;
  titulo?: string;
  className?: string;
  children: ReactNode;
};

/** Erro = role="alert" (urgente); aviso, sucesso e informação = role="status" (anunciados sem interromper). */
export function Alerta({ tipo, sobre = "escuro", titulo, className, children }: AlertaProps) {
  return (
    <div
      role={tipo === "perigo" ? "alert" : "status"}
      className={`flex gap-2 rounded-linha border p-3.5 text-sm ${cores[tipo][sobre]}${className ? ` ${className}` : ""}`}
    >
      <Icone tipo={tipo} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}
