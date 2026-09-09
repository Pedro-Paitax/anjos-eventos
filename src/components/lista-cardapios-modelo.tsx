"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import { excluirCardapioModeloAction } from "@/app/actions/cardapio-modelo";

function formatarPreco(preco: number | null): string {
  if (preco == null) return "Sem preço fixo";
  return preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) + "/pessoa";
}

function CardCardapioModelo({ cardapio }: { cardapio: CardapioModeloResumo }) {
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
    <div className="flex flex-col gap-3 rounded-[2px] border border-paper-ink/15 bg-paper p-5 text-paper-ink shadow-[0_12px_24px_-16px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <p className="font-display text-lg italic">{cardapio.nome}</p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            cardapio.precoFixoPorPessoa != null
              ? "bg-ember/15 text-ember"
              : "bg-paper-ink/10 text-paper-ink/60"
          }`}
        >
          {formatarPreco(cardapio.precoFixoPorPessoa)}
        </span>
      </div>

      {cardapio.descricao && (
        <p className="line-clamp-2 text-sm text-paper-ink/70">{cardapio.descricao}</p>
      )}

      <p className="text-sm text-paper-ink/60">
        {cardapio.quantidadeItens} {cardapio.quantidadeItens === 1 ? "item" : "itens"}
      </p>

      <div className="mt-1 flex items-center gap-4">
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
    </div>
  );
}

type FiltroPreco = "todos" | "com-preco-fixo" | "sem-preco-fixo";

export function ListaCardapiosModelo({ cardapios }: { cardapios: CardapioModeloResumo[] }) {
  const [filtro, setFiltro] = useState<FiltroPreco>("todos");

  const cardapiosFiltrados = useMemo(() => {
    if (filtro === "com-preco-fixo") return cardapios.filter((c) => c.precoFixoPorPessoa != null);
    if (filtro === "sem-preco-fixo") return cardapios.filter((c) => c.precoFixoPorPessoa == null);
    return cardapios;
  }, [cardapios, filtro]);

  if (cardapios.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-paper-dim">
        Nenhum cardápio pré-montado ainda. Cadastre o primeiro pra agilizar o
        Criar Evento.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="filtroPreco" className="text-sm text-paper-dim">
          Filtrar:
        </label>
        <select
          id="filtroPreco"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroPreco)}
          className="rounded-[2px] border border-paper-dim/20 bg-ink-soft px-3 py-2 text-sm text-paper focus:border-brass focus:outline-none"
        >
          <option value="todos">Todos</option>
          <option value="com-preco-fixo">Com preço fixo</option>
          <option value="sem-preco-fixo">Sem preço fixo</option>
        </select>
      </div>

      {cardapiosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-paper-dim">
          Nenhum cardápio encontrado com esse filtro.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {cardapiosFiltrados.map((cardapio) => (
            <CardCardapioModelo key={cardapio.id} cardapio={cardapio} />
          ))}
        </div>
      )}
    </div>
  );
}
