"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import { excluirCardapioModeloAction } from "@/app/actions/cardapio-modelo";

function LinhaCardapioModelo({ cardapio }: { cardapio: CardapioModeloResumo }) {
  const [erro, setErro] = useState<string | null>(null);
  const [excluido, setExcluido] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function confirmarExclusao() {
    setErro(null);
    setConfirmando(false);
    iniciarTransicao(async () => {
      const resultado = await excluirCardapioModeloAction(cardapio.id);
      if (resultado?.erro) {
        setErro(resultado.erro);
      } else {
        setExcluido(true);
      }
    });
  }

  if (excluido) return null;

  return (
    <li className="flex flex-col gap-2 px-6 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="font-display text-lg italic">{cardapio.nome}</p>
          {cardapio.descricao && (
            <p className="text-sm text-paper-ink/70">{cardapio.descricao}</p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link
            href={`/cardapios-modelo/${cardapio.id}`}
            className="text-sm underline decoration-paper-ink/30 underline-offset-4 transition hover:decoration-paper-ink"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={pendente}
            className="text-sm text-ember underline decoration-ember/40 underline-offset-4 transition hover:decoration-ember disabled:opacity-50"
          >
            {pendente ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
      {erro && <p className="text-sm text-ember">{erro}</p>}

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirmando(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-[2px] bg-ink p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="font-display text-lg italic text-paper">Excluir cardápio</h4>
            <p className="text-sm text-paper-dim">
              Excluir o cardápio &quot;{cardapio.nome}&quot;? Essa ação não pode ser
              desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="inline-flex items-center justify-center rounded-[2px] bg-ember px-4 py-2 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

export function ListaCardapiosModelo({ cardapios }: { cardapios: CardapioModeloResumo[] }) {
  if (cardapios.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
        Nenhum cardápio pré-montado ainda. Cadastre o primeiro pra agilizar o
        Criar Evento.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-paper-ink/10">
      {cardapios.map((cardapio) => (
        <LinhaCardapioModelo key={cardapio.id} cardapio={cardapio} />
      ))}
    </ul>
  );
}
