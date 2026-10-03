"use client";

import Link from "next/link";
import { botaoClasse } from "@/components/botao";

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
            className={botaoClasse()}
          >
            Tentar de novo
          </button>
          <Link
            href="/"
            className={botaoClasse("secundario")}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
