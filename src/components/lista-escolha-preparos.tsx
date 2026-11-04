"use client";

import type { Preparo } from "@/lib/cardapio";
import { agruparPorBase, partesNomeVariacao } from "@/lib/variacoes-preparo";

/**
 * Lista do modal "Adicionar ao cardápio" (SeletorCardapio e SeletorPreparos). Só apresentação:
 * a seleção continua pelo próprio preparo, como antes.
 *
 * Preparo com versões vira um bloco com borda: o base em cima e cada versão abaixo, com "↳" e o
 * nome completo (a parte igual ao base em texto suave, o que muda em destaque). O "Adicionar" fica
 * numa caixa que não quebra linha, para o toque não cair no nome em telas estreitas.
 */
export function ListaEscolhaPreparos({
  itens,
  selecionado,
  onAdicionar,
}: {
  itens: Preparo[];
  selecionado: (item: Preparo) => boolean;
  onAdicionar: (item: Preparo) => void;
}) {
  if (itens.length === 0) {
    return <p className="px-1 py-2 text-sm text-texto-suave">Nenhum item cadastrado nessa categoria.</p>;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {agruparPorBase(itens).map(({ item, variacoes }) => (
        <li
          key={item.id}
          className={variacoes.length > 0 ? "overflow-hidden rounded-tile border border-borda-forte" : undefined}
        >
          <OpcaoPreparo item={item} selecionado={selecionado(item)} onAdicionar={() => onAdicionar(item)} />
          {variacoes.length > 0 && (
            <ul aria-label={`Versões de ${item.nome}`} className="border-t border-borda">
              {variacoes.map((versao) => (
                <li key={versao.id} className="border-t border-borda first:border-t-0">
                  <OpcaoPreparo
                    item={versao}
                    nomeBase={item.nome}
                    selecionado={selecionado(versao)}
                    onAdicionar={() => onAdicionar(versao)}
                  />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function OpcaoPreparo({
  item,
  nomeBase,
  selecionado,
  onAdicionar,
}: {
  item: Preparo;
  nomeBase?: string;
  selecionado: boolean;
  onAdicionar: () => void;
}) {
  const partes = nomeBase ? partesNomeVariacao(nomeBase, item.nome) : null;

  return (
    <button
      type="button"
      disabled={selecionado}
      onClick={onAdicionar}
      aria-label={`${selecionado ? "Já adicionado" : "Adicionar"}: ${item.nome}`}
      className={`flex min-h-12 w-full items-center gap-3 py-2.5 pr-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foco ${
        partes ? "pl-3" : "rounded-controle pl-3"
      } ${selecionado ? "cursor-not-allowed bg-white/[0.04]" : "hover:bg-white/[0.06]"}`}
    >
      {partes && (
        <span aria-hidden className="shrink-0 self-start pt-px text-texto-suave">
          ↳
        </span>
      )}
      <span className={`min-w-0 flex-1 leading-snug ${selecionado ? "text-texto-suave" : "text-texto"}`}>
        {partes && partes.comum ? (
          <>
            <span className="text-texto-suave">{partes.comum}</span> <span className="font-medium">{partes.diferenca}</span>
          </>
        ) : (
          item.nome
        )}
      </span>
      <span
        aria-hidden
        className={`shrink-0 whitespace-nowrap rounded-chip border px-2.5 py-1.5 text-[13px] font-medium ${
          selecionado ? "border-transparent text-sucesso" : "border-borda-forte bg-white/5 text-texto"
        }`}
      >
        {selecionado ? "✓ Adicionado" : "+ Adicionar"}
      </span>
    </button>
  );
}
