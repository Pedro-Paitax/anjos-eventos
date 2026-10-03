"use client";

import Link from "next/link";

// Não exibe error.message: pode conter detalhes de banco/servidor. O digest
// identifica a falha no log do servidor (PM2).
export default function ErroDaPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="venue-glow flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div role="alert" className="flex flex-col items-center gap-4">
        <p className="font-display text-sm italic text-brass">Anjos Eventos</p>
        <h1 className="font-display text-4xl italic text-paper">Algo deu errado</h1>
        <p className="max-w-sm text-sm text-paper-dim">
          Não foi possível carregar esta página. Tente de novo; se continuar, avise o responsável
          {error.digest ? ` (código ${error.digest})` : ""}.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-[2px] bg-ember px-4 py-2 text-sm font-medium text-paper transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className="rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm text-paper transition hover:border-paper-dim hover:bg-paper/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
