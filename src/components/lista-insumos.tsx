"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InsumoResumo } from "@/lib/insumos";
import { calcularPrecoCorrigido, arredondarCentavos } from "@/lib/custo-preparo";

const campoFiltroClasse =
  "rounded-[2px] border border-paper-ink/20 bg-transparent px-3 py-2 text-sm text-paper-ink placeholder:text-paper-ink/40 focus:border-brass focus:outline-none";

function formatarReais(valor: number | null): string {
  if (valor == null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function LinhaInsumo({ insumo }: { insumo: InsumoResumo }) {
  const precoCorrigido = arredondarCentavos(
    calcularPrecoCorrigido(insumo.preco, insumo.fatorCorrecao)
  );

  return (
    <li className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="font-display text-lg italic">{insumo.nome}</p>
        <p className="text-sm text-paper-ink/70">
          {insumo.udm} · {formatarReais(insumo.preco)} · fator{" "}
          {insumo.fatorCorrecao ?? "—"} · corrigido {formatarReais(precoCorrigido)}
        </p>
      </div>
      <Link
        href={`/insumos/${insumo.id}`}
        className="self-start text-sm underline decoration-paper-ink/30 underline-offset-4 transition hover:decoration-paper-ink sm:self-center"
      >
        Editar
      </Link>
    </li>
  );
}

export function ListaInsumos({ insumos }: { insumos: InsumoResumo[] }) {
  const [buscaNome, setBuscaNome] = useState("");

  const insumosFiltrados = useMemo(() => {
    const buscaNormalizada = buscaNome.trim().toLowerCase();
    if (!buscaNormalizada) return insumos;
    return insumos.filter((insumo) =>
      insumo.nome.toLowerCase().includes(buscaNormalizada)
    );
  }, [insumos, buscaNome]);

  if (insumos.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
        Nenhum insumo cadastrado ainda. Insumos são criados a partir da
        Composição de um Preparo.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-paper-ink/10 p-4">
        <input
          type="text"
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          placeholder="Buscar por nome…"
          className={campoFiltroClasse}
        />
      </div>

      {insumosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
          Nenhum insumo encontrado com esse filtro.
        </p>
      ) : (
        <ul className="divide-y divide-paper-ink/10">
          {insumosFiltrados.map((insumo) => (
            <LinhaInsumo key={insumo.id} insumo={insumo} />
          ))}
        </ul>
      )}
    </div>
  );
}
