"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InsumoResumo } from "@/lib/insumos";
import { UNIDADES_INSUMO } from "@/lib/preparos-opcoes";
import { campoClasse } from "@/components/campo";
import { Vazio } from "@/components/vazio";
import { botaoClasse } from "@/components/botao";

// Preço corrigido já vem calculado do servidor (calcularPrecoCorrigido em
// src/lib/custo-preparo.ts, que depende de "server-only" — não pode ser
// importado num "use client"). Ver src/app/insumos/page.tsx.
export type InsumoComPrecoCorrigido = InsumoResumo & { precoCorrigido: number };

const campoFiltroClasse = campoClasse;

// Insumos não têm campo Categoria no banco (src/db/schema/insumos.ts) —
// só Unidade, Nome e Preço fazem sentido como filtro/ordenação aqui.
type Ordenacao = "nome" | "preco-asc" | "preco-desc";

function compararPorOrdenacao(ordenacao: Ordenacao) {
  return (a: InsumoComPrecoCorrigido, b: InsumoComPrecoCorrigido) => {
    if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
    const precoA = a.preco ?? 0;
    const precoB = b.preco ?? 0;
    return ordenacao === "preco-asc" ? precoA - precoB : precoB - precoA;
  };
}

function formatarReais(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LinhaInsumo({ insumo }: { insumo: InsumoComPrecoCorrigido }) {
  return (
    <li className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-[17px] font-semibold">{insumo.nome}</p>
        <p className="text-sm text-texto-suave">
          {insumo.udm} · {formatarReais(insumo.preco)} · fator{" "}
          {insumo.fatorCorrecao ?? "—"} · corrigido {formatarReais(insumo.precoCorrigido)}
        </p>
      </div>
      <Link
        href={`/insumos/${insumo.id}`}
        aria-label={`Editar ${insumo.nome}`}
        className={`${botaoClasse("link", "sm")} self-start sm:self-center`}
      >
        Editar
      </Link>
    </li>
  );
}

export function ListaInsumos({ insumos }: { insumos: InsumoComPrecoCorrigido[] }) {
  const [buscaNome, setBuscaNome] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");

  const insumosFiltrados = useMemo(() => {
    const buscaNormalizada = buscaNome.trim().toLowerCase();
    const filtrados = insumos.filter((insumo) => {
      if (unidadeFiltro && insumo.udm !== unidadeFiltro) return false;
      if (buscaNormalizada && !insumo.nome.toLowerCase().includes(buscaNormalizada)) return false;
      return true;
    });
    return [...filtrados].sort(compararPorOrdenacao(ordenacao));
  }, [insumos, buscaNome, unidadeFiltro, ordenacao]);

  if (insumos.length === 0) {
    return (
      <Vazio
        acao={
          <Link href="/preparos" className={botaoClasse("secundario")}>
            Ir para Preparos
          </Link>
        }
      >
        Nenhum insumo cadastrado ainda. Insumos são criados a partir da
        Composição de um Preparo.
      </Vazio>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-borda p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          placeholder="Buscar por nome…"
          aria-label="Buscar insumo por nome"
          className={`${campoFiltroClasse} sm:min-w-48 sm:flex-1`}
        />
        <select
          aria-label="Filtrar por unidade"
          value={unidadeFiltro}
          onChange={(e) => setUnidadeFiltro(e.target.value)}
          className={`${campoFiltroClasse} sm:w-56`}
        >
          <option value="">Todas as unidades</option>
          {UNIDADES_INSUMO.map((unidade) => (
            <option key={unidade} value={unidade}>
              {unidade}
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenação"
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          className={`${campoFiltroClasse} sm:w-56`}
        >
          <option value="nome">Ordenar por Nome</option>
          <option value="preco-asc">Preço crescente</option>
          <option value="preco-desc">Preço decrescente</option>
        </select>
      </div>

      {insumosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-texto-suave">
          Nenhum insumo encontrado com esse filtro.
        </p>
      ) : (
        <ul className="divide-y divide-borda">
          {insumosFiltrados.map((insumo) => (
            <LinhaInsumo key={insumo.id} insumo={insumo} />
          ))}
        </ul>
      )}
    </div>
  );
}
