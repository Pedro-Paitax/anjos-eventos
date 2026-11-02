"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InsumoResumo } from "@/lib/insumos";
import { UNIDADES_INSUMO } from "@/lib/preparos-opcoes";
import { campoClasse } from "@/components/campo";
import { Vazio } from "@/components/vazio";
import { botaoClasse } from "@/components/botao";
import { Seletor } from "@/components/seletor";
import type { OrigemResumo } from "@/lib/precos-insumo";
import {
  PRAZO_PRECO_DIAS,
  ROTULOS_CANAL,
  ROTULOS_FONTE,
  diasEntre,
  estadoPreco,
  idadeTexto,
} from "@/lib/precos-opcoes";
import { ChipDesatualizado } from "@/components/precos/visual";
import { Alerta } from "@/components/alerta";

// Preço corrigido já vem calculado do servidor (calcularPrecoCorrigido em
// src/lib/custo-preparo.ts, que depende de "server-only" — não pode ser
// importado num "use client"). Ver src/app/insumos/page.tsx.
export type InsumoComPrecoCorrigido = InsumoResumo & {
  precoCorrigido: number;
  /** Migração 0011: null quando o histórico de preços não está ativo ou o insumo não tem origem registrada. */
  origem: OrigemResumo | null;
};

/** "Atacado · Frigorífico X · Manual, há 3 dias" — só as partes preenchidas. */
function textoOrigem(origem: OrigemResumo | null, hoje: string): string | null {
  if (!origem) return null;
  const fonte = origem.fontePreco
    ? `${ROTULOS_FONTE[origem.fontePreco]}${origem.atualizadoEm ? `, ${idadeTexto(diasEntre(origem.atualizadoEm, hoje))}` : ""}`
    : null;
  const partes = [
    origem.canal ? ROTULOS_CANAL[origem.canal] : null,
    origem.fornecedorNome,
    fonte ?? (origem.atualizadoEm ? null : "preço sem data"),
  ].filter(Boolean);
  return partes.join(" · ");
}

const campoFiltroClasse = campoClasse;

// Insumos não têm campo Categoria no banco (src/db/schema/insumos.ts) —
// só Unidade, Nome e Preço fazem sentido como filtro/ordenação aqui.
type Ordenacao = "nome" | "preco-asc" | "preco-desc";
type FiltroPreco = "" | "conferir";

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

function LinhaInsumo({ insumo, hoje }: { insumo: InsumoComPrecoCorrigido; hoje: string }) {
  const origem = textoOrigem(insumo.origem, hoje);
  const desatualizado = insumo.origem && estadoPreco(insumo.origem.atualizadoEm, hoje) === "desatualizado";
  return (
    <li className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
          {insumo.nome}
          {desatualizado && <ChipDesatualizado />}
        </p>
        <p className="text-sm text-texto-suave">
          {insumo.udm} · {formatarReais(insumo.preco)} · fator{" "}
          {insumo.fatorCorrecao ?? "—"} · corrigido {formatarReais(insumo.precoCorrigido)}
        </p>
        {origem && <p className="text-sm text-texto-suave">{origem}</p>}
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

export function ListaInsumos({ insumos, hoje }: { insumos: InsumoComPrecoCorrigido[]; hoje: string }) {
  const [buscaNome, setBuscaNome] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [filtroPreco, setFiltroPreco] = useState<FiltroPreco>("");
  // Só existe com a migração 0011 aplicada (origem preenchida pelo servidor).
  const temOrigem = insumos.some((i) => i.origem !== null);
  const contagem = useMemo(() => {
    let desatualizados = 0;
    let semData = 0;
    for (const i of insumos) {
      if (!i.origem) continue;
      const e = estadoPreco(i.origem.atualizadoEm, hoje);
      if (e === "desatualizado") desatualizados++;
      if (e === "sem_data") semData++;
    }
    return { desatualizados, semData };
  }, [insumos, hoje]);

  const insumosFiltrados = useMemo(() => {
    const buscaNormalizada = buscaNome.trim().toLowerCase();
    const filtrados = insumos.filter((insumo) => {
      if (unidadeFiltro && insumo.udm !== unidadeFiltro) return false;
      if (filtroPreco === "conferir" && (!insumo.origem || estadoPreco(insumo.origem.atualizadoEm, hoje) === "em_dia")) {
        return false;
      }
      if (buscaNormalizada && !insumo.nome.toLowerCase().includes(buscaNormalizada)) return false;
      return true;
    });
    return [...filtrados].sort(compararPorOrdenacao(ordenacao));
  }, [insumos, buscaNome, unidadeFiltro, ordenacao, filtroPreco, hoje]);

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
        <Seletor
          aria-label="Filtrar por unidade"
          value={unidadeFiltro}
          onChange={setUnidadeFiltro}
          className="sm:w-56"
          opcoes={[
            { valor: "", rotulo: "Todas as unidades" },
            ...UNIDADES_INSUMO.map((unidade) => ({ valor: unidade, rotulo: unidade })),
          ]}
        />
        {temOrigem && (
          <Seletor
            aria-label="Filtrar por idade do preço"
            value={filtroPreco}
            onChange={(v) => setFiltroPreco(v as FiltroPreco)}
            className="sm:w-56"
            opcoes={[
              { valor: "", rotulo: "Todos os preços" },
              { valor: "conferir", rotulo: "Desatualizados ou sem data" },
            ]}
          />
        )}
        <Seletor
          aria-label="Ordenação"
          value={ordenacao}
          onChange={(v) => setOrdenacao(v as Ordenacao)}
          className="sm:w-56"
          opcoes={[
            { valor: "nome", rotulo: "Ordenar por Nome" },
            { valor: "preco-asc", rotulo: "Preço crescente" },
            { valor: "preco-desc", rotulo: "Preço decrescente" },
          ]}
        />
      </div>

      {temOrigem && (contagem.desatualizados > 0 || contagem.semData > 0) && (
        <div className="border-b border-borda p-4">
          <Alerta tipo="aviso">
            {[
              contagem.desatualizados > 0 &&
                `${contagem.desatualizados} ${contagem.desatualizados === 1 ? "insumo está" : "insumos estão"} com preço de mais de ${PRAZO_PRECO_DIAS} dias`,
              contagem.semData > 0 &&
                `${contagem.semData} ${contagem.semData === 1 ? "insumo não tem" : "insumos não têm"} data de atualização`,
            ]
              .filter(Boolean)
              .join(" e ")}
            . Os orçamentos usam esses preços.
          </Alerta>
        </div>
      )}

      {insumosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-texto-suave">
          Nenhum insumo encontrado com esse filtro.
        </p>
      ) : (
        <ul className="divide-y divide-borda">
          {insumosFiltrados.map((insumo) => (
            <LinhaInsumo key={insumo.id} insumo={insumo} hoje={hoje} />
          ))}
        </ul>
      )}
    </div>
  );
}
