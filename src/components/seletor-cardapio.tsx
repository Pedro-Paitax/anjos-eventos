"use client";

import { useEffect, useState } from "react";
import type { Evento } from "@/lib/eventos";
import { CATEGORIAS_CARDAPIO, type CategoriaCardapio, type Preparo } from "@/lib/cardapio";
import { rotuloClasse } from "@/components/formulario-evento";
import { Modal } from "@/components/modal";
import { botaoClasse } from "@/components/botao";

type SelecaoCardapio = Record<CategoriaCardapio, string[]>;

const NOME_CAMPO: Record<CategoriaCardapio, string> = {
  Entrada: "cardapioEntrada",
  Acompanhamentos: "cardapioAcompanhamentos",
  Carnes: "cardapioCarnes",
  Saladas: "cardapioSaladas",
  Bebidas: "cardapioBebidas",
  Sobremesa: "cardapioSobremesa",
};

export const VALOR_SALVO = {
  Entrada: "cardapio_entrada",
  Acompanhamentos: "cardapio_acompanhamentos",
  Carnes: "cardapio_carnes",
  Saladas: "cardapio_saladas",
  Bebidas: "cardapio_bebidas",
  Sobremesa: "cardapio_sobremesa",
} satisfies Record<CategoriaCardapio, keyof Evento>;

function dividir(valor: string | null | undefined): string[] {
  return valor ? valor.split(", ") : [];
}

// Subconjunto de Evento que o seletor realmente usa — permite montar um
// valoresIniciais sintético (ex.: a partir de um Cardápio Pré-Montado) sem
// precisar de um Evento completo.
export type ValoresIniciaisCardapio = Pick<
  Evento,
  (typeof VALOR_SALVO)[CategoriaCardapio]
>;

/** Monta um valoresIniciais sintético (Nome, ", "-joined por categoria) a
 * partir de uma lista de preparo_id — usado pra pré-popular o SeletorCardapio
 * ao escolher um Cardápio Pré-Montado (Criar Evento e Simulador de
 * Cardápio), sem criar nenhum vínculo permanente. */
export function paraValoresIniciaisCardapio(
  preparoIds: number[],
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>
): ValoresIniciaisCardapio {
  const idsSelecionados = new Set(preparoIds);
  const resultado: Record<string, string | null> = {};
  for (const categoria of Object.keys(VALOR_SALVO) as CategoriaCardapio[]) {
    const nomes = preparosPorCategoria[categoria]
      .filter((p) => idsSelecionados.has(p.id))
      .map((p) => p.nome);
    resultado[VALOR_SALVO[categoria]] = nomes.length > 0 ? nomes.join(", ") : null;
  }
  return resultado as ValoresIniciaisCardapio;
}

function selecaoInicial(valoresIniciais?: ValoresIniciaisCardapio): SelecaoCardapio {
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
  valoresIniciais?: ValoresIniciaisCardapio;
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

      {/* preparo_id de cada item selecionado — usado pelo fluxo de Orçamento
          (src/lib/orcamentos.ts) pra gravar itens_orcamento. Os hidden inputs
          acima (por nome) continuam existindo só pro fluxo antigo de edição
          direta de Evento (campos de texto livre). */}
      {CATEGORIAS_CARDAPIO.map((categoria) =>
        selecao[categoria].map((nome) => {
          const id = preparosPorCategoria[categoria].find((p) => p.nome === nome)?.id;
          return id == null ? null : (
            <input key={`id-${categoria}-${nome}`} type="hidden" name="preparoIds" value={id} />
          );
        })
      )}

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
        {totalSelecionado === 0 && (
          <p className="text-sm text-texto-suave">
            Nenhum item selecionado ainda.
          </p>
        )}
        {CATEGORIAS_CARDAPIO.map(
          (categoria) =>
            selecao[categoria].length > 0 && (
              <div key={categoria} className="flex flex-col gap-1.5">
                <p className="text-[13px] font-medium text-texto-suave">
                  {categoria}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selecao[categoria].map((nome) => (
                    <span
                      key={nome}
                      className="inline-flex items-center gap-1 rounded-chip bg-elevada py-1 pl-3 pr-1 text-sm text-texto"
                    >
                      {nome}
                      <button
                        type="button"
                        onClick={() => remover(categoria, nome)}
                        aria-label={`Remover ${nome}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-chip text-texto-suave transition-colors hover:text-perigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-foco"
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
        <Modal titulo="Adicionar ao cardápio" mostrarFechar onFechar={() => setModalAberto(false)} className="max-w-lg">

          <div className="flex flex-wrap gap-1 rounded-tile bg-fundo p-1">
            {CATEGORIAS_CARDAPIO.map((categoria) => (
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
                {selecao[categoria].length > 0 && ` (${selecao[categoria].length})`}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto">
            {preparosPorCategoria[categoriaAtiva].length === 0 && (
              <p className="px-1 py-2 text-sm text-texto-suave">
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
