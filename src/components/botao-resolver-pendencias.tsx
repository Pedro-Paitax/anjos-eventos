"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  destinoItemPendencia,
  type AtivosPorFuncao,
  type ItemPendencia,
} from "@/lib/pendencias-evento";

type Props = {
  eventoId: number;
  itens: ItemPendencia[];
  ativosPorFuncao: AtivosPorFuncao;
  className?: string;
};

const FOCAVEIS = "a[href], button:not([disabled])";

export function BotaoResolverPendencias({ eventoId, itens, ativosPorFuncao, className }: Props) {
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const gatilho = gatilhoRef.current;
    painelRef.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(false);
        return;
      }
      if (e.key !== "Tab") return;
      const focaveis = painelRef.current?.querySelectorAll<HTMLElement>(FOCAVEIS);
      if (!focaveis || focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      gatilho?.focus();
    };
  }, [aberto]);

  if (itens.length === 0) return null;

  const grupos = [
    { titulo: "Equipe", itens: itens.filter((i) => i.tipo === "equipe") },
    { titulo: "Logística", itens: itens.filter((i) => i.tipo === "logistica") },
  ].filter((g) => g.itens.length > 0);

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto(true)}
        className={
          className ??
          "rounded-[2px] border border-ember/60 px-3 py-1.5 text-sm text-ember transition hover:bg-ember/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        }
      >
        Resolver pendências
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`pendencias-titulo-${eventoId}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 print:hidden"
          onClick={() => setAberto(false)}
        >
          <div
            ref={painelRef}
            className="flex w-full max-w-md flex-col gap-4 rounded-[2px] bg-ink-soft p-6 text-paper shadow-[0_20px_40px_-24px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={`pendencias-titulo-${eventoId}`} className="font-display text-xl italic">
              Pendências do evento
            </h2>
            {grupos.map((grupo) => (
              <section key={grupo.titulo} className="flex flex-col gap-2">
                <h3 className="text-xs uppercase tracking-wide text-paper-dim">{grupo.titulo}</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {grupo.itens.map((item) => {
                    const destino = destinoItemPendencia(item, eventoId, ativosPorFuncao);
                    return (
                      <li key={item.texto}>
                        <Link
                          href={destino.href}
                          onClick={() => setAberto(false)}
                          className="text-ember underline underline-offset-4 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                        >
                          {destino.texto}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="self-end rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm transition hover:border-paper-dim hover:bg-paper/5"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
