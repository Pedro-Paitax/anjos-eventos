"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import { excluirCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import { ModalConfirmacao } from "@/components/modal-confirmacao";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";
import { Seletor } from "@/components/seletor";

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
    <div className="flex flex-col gap-3 rounded-controle border border-borda bg-superficie p-5 text-texto">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[17px] font-semibold">{cardapio.nome}</p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            cardapio.precoFixoPorPessoa != null
              ? "bg-brasa/15 text-link"
              : "bg-white/[0.03] text-texto-suave"
          }`}
        >
          {formatarPreco(cardapio.precoFixoPorPessoa)}
        </span>
      </div>

      {cardapio.descricao && (
        <p className="line-clamp-2 text-sm text-texto-suave">{cardapio.descricao}</p>
      )}

      <p className="text-sm text-texto-suave">
        {cardapio.quantidadeItens} {cardapio.quantidadeItens === 1 ? "item" : "itens"}
      </p>

      <div className="mt-1 flex items-center gap-4">
        <Link
          href={`/cardapios-modelo/${cardapio.id}`}
          aria-label={`Editar ${cardapio.nome}`}
          className={botaoClasse("link", "sm")}
        >
          Editar
        </Link>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          disabled={pendente}
          aria-label={`Excluir ${cardapio.nome}`}
          className={botaoClasse("link", "sm")}
        >
          {pendente ? "Excluindo…" : "Excluir"}
        </button>
      </div>
      {erro && <Alerta tipo="perigo">{erro}</Alerta>}

      {confirmando && (
        <ModalConfirmacao
          titulo="Excluir cardápio"
          rotuloConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmando(false)}
        >
          Excluir o cardápio &quot;{cardapio.nome}&quot;? Essa ação não pode ser desfeita.
        </ModalConfirmacao>
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
      <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="max-w-prose text-sm text-texto-suave">
          Nenhum cardápio pré-montado ainda. Cadastre o primeiro pra agilizar o
          Criar Evento.
        </p>
        <Link href="/cardapios-modelo/novo" className={botaoClasse()}>
          Novo cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label htmlFor="filtroPreco" className="text-sm text-texto-suave">
          Filtrar:
        </label>
        <Seletor
          id="filtroPreco"
          value={filtro}
          onChange={(v) => setFiltro(v as FiltroPreco)}
          opcoes={[
            { valor: "todos", rotulo: "Todos" },
            { valor: "com-preco-fixo", rotulo: "Com preço fixo" },
            { valor: "sem-preco-fixo", rotulo: "Sem preço fixo" },
          ]}
        />
      </div>

      {cardapiosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-texto-suave">
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
