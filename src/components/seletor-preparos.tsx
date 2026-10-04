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

      <div className="flex flex-col gap-3 rounded-linha border border-borda bg-fundo p-3">
        {selecionados.length === 0 && (
          <p className="text-sm text-texto-suave">Nenhum item selecionado ainda.</p>
        )}
        {CATEGORIAS_CARDAPIO.map((categoria) => {
          const itensDaCategoria = preparosPorCategoria[categoria].filter((p) =>
            selecionados.includes(p.id)
          );
          if (itensDaCategoria.length === 0) return null;
          return (
            <div key={categoria} className="flex flex-col gap-1.5">
              <p className="text-[13px] font-medium text-texto-suave">
                {categoria}
              </p>
              <div className="flex flex-wrap gap-2">
                {itensDaCategoria.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded-chip bg-elevada py-1 pl-3 pr-1 text-sm text-texto"
                  >
                    {item.nome}
                    <button
                      type="button"
                      onClick={() => remover(item.id)}
                      aria-label={`Remover ${item.nome}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-chip text-texto-suave transition-colors hover:text-perigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-foco"
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
        <Modal titulo="Adicionar ao cardápio" mostrarFechar onFechar={() => setModalAberto(false)} className="max-w-lg">

          <div className="flex flex-wrap gap-1 rounded-tile bg-fundo p-1">
            {CATEGORIAS_CARDAPIO.map((categoria) => {
              const qtd = preparosPorCategoria[categoria].filter((p) =>
                selecionados.includes(p.id)
              ).length;
              return (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaAtiva(categoria)}
                  className={`min-h-10 rounded-[10px] px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-foco ${
                    categoriaAtiva === categoria
                      ? "bg-elevada text-texto shadow-realce"
                      : "text-texto-suave hover:text-texto"
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
              <p className="px-1 py-2 text-sm text-texto-suave">
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
                  className={`flex min-h-11 items-center justify-between rounded-controle px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco ${
                    jaSelecionado
                      ? "cursor-not-allowed bg-white/[0.04] text-texto-suave"
                      : "text-texto hover:bg-white/[0.06]"
                  }`}
                >
                  <span>{item.nome}</span>
                  <span className="text-[13px]">
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

