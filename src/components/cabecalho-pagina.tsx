import Link from "next/link";

type CabecalhoPaginaProps = {
  titulo: string;
  subtitulo?: string;
  voltarPara?: { href: string; rotulo: string };
  acao?: React.ReactNode;
};

/** Cabeçalho de página do Brasa: voltar, título (H1), subtítulo e a ação principal à direita. */
export function CabecalhoPagina({ titulo, subtitulo, voltarPara, acao }: CabecalhoPaginaProps) {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
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
