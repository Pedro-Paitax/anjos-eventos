import Link from "next/link";
import type { ReactNode } from "react";
import type { Prioridade } from "@/lib/prospeccao-pontuacao";

// Peças visuais da prospecção (servidor). Cor nunca sozinha: o texto diz o estado.

const CORES_PRIORIDADE: Record<Prioridade, string> = {
  A: "border-sucesso/50 bg-sucesso/10 text-sucesso",
  B: "border-info/50 bg-info/10 text-info",
  C: "border-aviso/50 bg-aviso/10 text-aviso",
  baixa: "border-borda-forte text-texto-suave",
  indefinida: "border-borda-forte text-texto-suave",
};

export function SeloPrioridade({ prioridade, provisoria }: { prioridade: Prioridade | null; provisoria?: boolean | null }) {
  if (!prioridade) return <span className="text-[13px] text-texto-suave">não avaliado</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-chip border px-2 py-0.5 text-[13px] font-semibold ${CORES_PRIORIDADE[prioridade]}`}>
      {prioridade === "indefinida" ? "Indefinida" : prioridade === "baixa" ? "Baixa" : `Prioridade ${prioridade}`}
      {provisoria ? " · provisória" : ""}
    </span>
  );
}

export function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: ReactNode; detalhe?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-tile border border-borda bg-superficie p-4 shadow-realce">
      <span className="text-[13px] text-texto-suave">{rotulo}</span>
      <span className="font-titulo text-2xl font-bold">{valor}</span>
      {detalhe && <span className="text-[13px] text-texto-suave">{detalhe}</span>}
    </div>
  );
}

export function NavProspeccao({ atual }: { atual: "leads" | "fila" | "indicadores" | "importar" }) {
  const itens = [
    { chave: "leads", href: "/prospeccao", rotulo: "Leads" },
    { chave: "fila", href: "/prospeccao/fila", rotulo: "Fila de pesquisa" },
    { chave: "indicadores", href: "/prospeccao/indicadores", rotulo: "Indicadores" },
    { chave: "importar", href: "/prospeccao/importar", rotulo: "Importar CSV" },
  ] as const;
  return (
    <nav aria-label="Prospecção" className="flex flex-wrap gap-2">
      {itens.map((i) => (
        <Link
          key={i.chave}
          href={i.href}
          aria-current={i.chave === atual ? "page" : undefined}
          className={`inline-flex min-h-11 items-center rounded-controle border px-3.5 text-sm font-semibold ${
            i.chave === atual ? "border-brasa text-texto" : "border-borda text-texto-suave hover:text-texto"
          }`}
        >
          {i.rotulo}
        </Link>
      ))}
      {/* Download de route handler (CSV), não é página: <a download>, não <Link>. */}
      <a href="/prospeccao/exportar" download className="inline-flex min-h-11 items-center px-3.5 text-sm text-link underline">
        Exportar CSV
      </a>
    </nav>
  );
}
