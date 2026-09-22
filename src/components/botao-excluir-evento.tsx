"use client";

import { useState } from "react";
import { excluirEventoAction } from "@/app/actions/evento";

export function BotaoExcluirEvento({
  eventoId,
  clienteNome,
}: {
  eventoId: number;
  clienteNome: string;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    const confirmado = window.confirm(
      `Excluir o evento de "${clienteNome}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    setExcluindo(true);
    try {
      await excluirEventoAction(eventoId);
    } catch (erro) {
      // redirect() do Server Action lança um erro especial do Next.js
      // (digest começando com "NEXT_REDIRECT") pra disparar a navegação —
      // não é falha real, precisa propagar pro Next tratar. Só erro sem
      // esse digest é falha de verdade (ex.: banco fora do ar).
      if (
        typeof erro === "object" &&
        erro !== null &&
        "digest" in erro &&
        typeof erro.digest === "string" &&
        erro.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw erro;
      }
      setExcluindo(false);
      window.alert("Não foi possível excluir o evento. Tente de novo.");
    }
  }

  return (
    <button
      type="button"
      onClick={excluir}
      disabled={excluindo}
      className="inline-flex items-center justify-center rounded-[2px] border border-red-500/50 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:opacity-50"
    >
      {excluindo ? "Excluindo…" : "Excluir evento"}
    </button>
  );
}
