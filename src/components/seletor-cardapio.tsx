"use client";

import { useEffect, useState } from "react";
import type { Evento } from "@/lib/eventos";
import { CATEGORIAS_CARDAPIO, type CategoriaCardapio, type Preparo } from "@/lib/cardapio";
import { rotuloClasse } from "@/components/formulario-evento";

type SelecaoCardapio = Record<CategoriaCardapio, string[]>;

const NOME_CAMPO: Record<CategoriaCardapio, string> = {
  Entrada: "cardapioEntrada",
  Acompanhamentos: "cardapioAcompanhamentos",
  Carnes: "cardapioCarnes",
  Saladas: "cardapioSaladas",
  Bebidas: "cardapioBebidas",
  Sobremesa: "cardapioSobremesa",
};

const VALOR_SALVO: Record<CategoriaCardapio, keyof Evento> = {
  Entrada: "cardapio_entrada",
  Acompanhamentos: "cardapio_acompanhamentos",
  Carnes: "cardapio_carnes",
  Saladas: "cardapio_saladas",
  Bebidas: "cardapio_bebidas",
  Sobremesa: "cardapio_sobremesa",
};

function dividir(valor: string | null | undefined): string[] {
  return valor ? valor.split(", ") : [];
}

function selecaoInicial(valoresIniciais?: Evento): SelecaoCardapio {
  return Object.fromEntries(
    CATEGORIAS_CARDAPIO.map((categoria) => [
      categoria,
      dividir(valoresIniciais?.[VALOR_SALVO[categoria]] as string | null | undefined),
    ])
  ) as SelecaoCardapio;
}

export function SeletorCardapio({
  preparosPorCategoria,
  valoresIniciais,
  onSelecaoIdsChange,
}: {
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  valoresIniciais?: Evento;
  /** Notifica os preparo_id atualmente selecionados (ex.: pra recalcular o Valor Sugerido) — não afeta os hidden inputs de nome já salvos no evento. */
  onSelecaoIdsChange?: (idsSelecionados: number[]) => void;
}) {
  const [selecao, setSelecao] = useState<SelecaoCardapio>(() =>
    selecaoInicial(valoresIniciais)
  );
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaCardapio>(
    CATEGORIAS_CARDAPIO[0]
  );

  useEffect(() => {
    if (!modalAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") setModalAberto(false);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [modalAberto]);

  useEffect(() => {
    if (!onSelecaoIdsChange) return;
    const ids = CATEGORIAS_CARDAPIO.flatMap((categoria) =>
      selecao[categoria]
        .map((nome) => preparosPorCategoria[categoria].find((p) => p.nome === nome)?.id)
        .filter((id): id is number => id != null)
    );
    onSelecaoIdsChange(ids);
  }, [selecao, preparosPorCategoria, onSelecaoIdsChange]);

  function adicionar(categoria: CategoriaCardapio, nome: string) {
    setSelecao((atual) =>
      atual[categoria].includes(nome)
        ? atual
        : { ...atual, [categoria]: [...atual[categoria], nome] }
    );
  }

  function remover(categoria: CategoriaCardapio, nome: string) {
    setSelecao((atual) => ({
      ...atual,
      [categoria]: atual[categoria].filter((item) => item !== nome),
    }));
  }

  const totalSelecionado = CATEGORIAS_CARDAPIO.reduce(
    (soma, categoria) => soma + selecao[categoria].length,
    0
  );

  return (
    <div className="flex flex-col gap-3">
      {CATEGORIAS_CARDAPIO.map((categoria) =>
        selecao[categoria].map((nome) => (
          <input
            key={`${categoria}-${nome}`}
            type="hidden"
            name={NOME_CAMPO[categoria]}
            value={nome}
          />
        ))
      )}

      <div className="flex items-center justify-between">
        <p className={rotuloClasse}>Itens selecionados</p>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="rounded-[2px] bg-paper px-3 py-1.5 text-sm font-medium text-paper-ink transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          + Adicionar itens
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[2px] border border-paper-dim/20 bg-ink-soft p-3">
        {totalSelecionado === 0 && (
          <p className="text-sm text-paper-dim">
            Nenhum item selecionado ainda.
          </p>
        )}
        {CATEGORIAS_CARDAPIO.map(
          (categoria) =>
            selecao[categoria].length > 0 && (
              <div key={categoria} className="flex flex-col gap-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-paper-dim/70">
                  {categoria}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selecao[categoria].map((nome) => (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1 text-sm text-paper-ink"
                    >
                      {nome}
                      <button
                        type="button"
                        onClick={() => remover(categoria, nome)}
                        aria-label={`Remover ${nome}`}
                        className="text-paper-ink/50 transition hover:text-ember"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col gap-4 rounded-[2px] bg-ink p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg italic text-paper">
                Adicionar ao cardápio
              </h4>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-wrap gap-1 rounded-[2px] bg-ink-soft p-1">
              {CATEGORIAS_CARDAPIO.map((categoria) => (
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
                  {selecao[categoria].length > 0 && ` (${selecao[categoria].length})`}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 overflow-y-auto">
              {preparosPorCategoria[categoriaAtiva].length === 0 && (
                <p className="px-1 py-2 text-sm text-paper-dim">
                  Nenhum item cadastrado nessa categoria.
                </p>
              )}
              {preparosPorCategoria[categoriaAtiva].map((item) => {
                const jaSelecionado = selecao[categoriaAtiva].includes(item.nome);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={jaSelecionado}
                    onClick={() => adicionar(categoriaAtiva, item.nome)}
                    className={`flex items-center justify-between rounded-[2px] px-3 py-2 text-left text-sm transition ${
                      jaSelecionado
                        ? "cursor-not-allowed bg-ink-soft/60 text-paper-dim/50"
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
          </div>
        </div>
      )}
    </div>
  );
}
