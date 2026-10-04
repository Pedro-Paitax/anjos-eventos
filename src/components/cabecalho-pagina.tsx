import Link from "next/link";

type CabecalhoPaginaProps = {
  titulo: string;
  subtitulo?: string;
  voltarPara?: { href: string; rotulo: string };
  acao?: React.ReactNode;
  /** Visual Brasa (títulos em Bricolage, cores novas). Padrão: visual antigo, até as demais telas migrarem. */
  brasa?: boolean;
};

export function CabecalhoPagina({
  titulo,
  subtitulo,
  voltarPara,
  acao,
  brasa = false,
}: CabecalhoPaginaProps) {
  if (brasa) {
    return (
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          {voltarPara && (
            <Link
              href={voltarPara.href}
              className="inline-flex min-h-11 items-center self-start text-texto-suave transition-colors hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              {voltarPara.rotulo}
            </Link>
          )}
          <h1 className="font-titulo text-[clamp(30px,4vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">
            {titulo}
          </h1>
          {subtitulo && <p className="max-w-prose text-texto-suave">{subtitulo}</p>}
        </div>
        {acao}
      </div>
    );
  }
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {voltarPara && (
          <Link
            href={voltarPara.href}
            className="inline-flex min-h-11 items-center self-start text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper"
          >
            {voltarPara.rotulo}
          </Link>
        )}
        <h1 className="font-display text-3xl italic text-paper sm:text-4xl">
          {titulo}
        </h1>
        {subtitulo && <p className="text-sm text-paper-dim">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}
