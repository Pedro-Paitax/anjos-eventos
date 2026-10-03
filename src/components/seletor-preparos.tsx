"use client";

import { useState } from "react";
import { CATEGORIAS_CARDAPIO, type CategoriaCardapio, type Preparo } from "@/lib/cardapio";
import { rotuloClasse } from "@/components/formulario-evento";
import { Modal } from "@/components/modal";
import { botaoClasse } from "@/components/botao";

export function SeletorPreparos({
  preparosPorCategoria,
  selecaoInicial,
}: {
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  /** IDs de preparo já selecionados (edição de um cardápio existente). */
  selecaoInicial?: number[];
}) {
  const [selecionados, setSelecionados] = useState<number[]>(selecaoInicial ?? []);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaCardapio>(
    CATEGORIAS_CARDAPIO[0]
  );

  function adicionar(id: number) {
    setSelecionados((atual) => (atual.includes(id) ? atual : [...atual, id]));
  }

  function remover(id: number) {
    setSelecionados((atual) => atual.filter((item) => item !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {selecionados.map((id) => (
        <input key={id} type="hidden" name="preparoId" value={id} />
      ))}

      <div className="flex items-center justify-between">
        <p className={rotuloClasse}>Itens selecionados</p>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={botaoClasse("secundario", "sm")}
        >
          + Adicionar itens
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[2px] border border-paper-dim/20 bg-ink-soft p-3">
        {selecionados.length === 0 && (
          <p className="text-sm text-paper-dim">Nenhum item selecionado ainda.</p>
        )}
        {CATEGORIAS_CARDAPIO.map((categoria) => {
          const itensDaCategoria = preparosPorCategoria[categoria].filter((p) =>
            selecionados.includes(p.id)
          );
          if (itensDaCategoria.length === 0) return null;
          return (
            <div key={categoria} className="flex flex-col gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-texto-suave-escuro">
                {categoria}
              </p>
              <div className="flex flex-wrap gap-2">
                {itensDaCategoria.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-sm text-paper-ink"
                  >
                    {item.nome}
                    <button
                      type="button"
                      onClick={() => remover(item.id)}
                      aria-label={`Remover ${item.nome}`}
                      className="text-texto-suave-papel transition hover:text-perigo-escuro"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalAberto && (
        <Modal titulo="Adicionar ao cardápio" mostrarFechar onFechar={() => setModalAberto(false)} className="max-w-lg bg-ink">

          <div className="flex flex-wrap gap-1 rounded-[2px] bg-ink-soft p-1">
            {CATEGORIAS_CARDAPIO.map((categoria) => {
              const qtd = preparosPorCategoria[categoria].filter((p) =>
                selecionados.includes(p.id)
              ).length;
              return (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaAtiva(categoria)}
                  className={`rounded-[2px] px-3 py-1.5 text-sm transition ${
                    categoriaAtiva === categoria
                      ? "bg-paper text-paper-ink"
                      : "text-paper-dim hover:text-paper"
                  }`}
                >
                  {categoria}
                  {qtd > 0 && ` (${qtd})`}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto">
            {preparosPorCategoria[categoriaAtiva].length === 0 && (
              <p className="px-1 py-2 text-sm text-paper-dim">
                Nenhum item cadastrado nessa categoria.
              </p>
            )}
            {preparosPorCategoria[categoriaAtiva].map((item) => {
              const jaSelecionado = selecionados.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={jaSelecionado}
                  onClick={() => adicionar(item.id)}
                  className={`flex items-center justify-between rounded-[2px] px-3 py-2 text-left text-sm transition ${
                    jaSelecionado
                      ? "cursor-not-allowed bg-ink-soft/60 text-texto-suave-escuro"
                      : "text-paper hover:bg-ink-soft"
                  }`}
                >
                  <span>{item.nome}</span>
                  <span className="text-xs">
                    {jaSelecionado ? "Adicionado" : "+ Adicionar"}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

