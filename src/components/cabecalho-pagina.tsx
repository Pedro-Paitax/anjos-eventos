import Link from "next/link";

type CabecalhoPaginaProps = {
  titulo: string;
  subtitulo?: string;
  voltarPara?: { href: string; rotulo: string };
  acao?: React.ReactNode;
};

export function CabecalhoPagina({
  titulo,
  subtitulo,
  voltarPara,
  acao,
}: CabecalhoPaginaProps) {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1">
        {voltarPara && (
          <Link
            href={voltarPara.href}
            className="text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper"
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
