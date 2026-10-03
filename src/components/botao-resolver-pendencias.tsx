"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/modal";
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

export function BotaoResolverPendencias({ eventoId, itens, ativosPorFuncao, className }: Props) {
  const [aberto, setAberto] = useState(false);

  if (itens.length === 0) return null;

  const grupos = [
    { titulo: "Equipe", itens: itens.filter((i) => i.tipo === "equipe") },
    { titulo: "Logística", itens: itens.filter((i) => i.tipo === "logistica") },
  ].filter((g) => g.itens.length > 0);
  const tituloId = `pendencias-titulo-${eventoId}`;

  return (
    <>
      <button
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
        <Modal onFechar={() => setAberto(false)} labelledBy={tituloId} className="max-w-md bg-ink-soft text-paper">
          <h2 id={tituloId} className="font-display text-xl italic">
            Pendências do evento
          </h2>
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className="flex flex-col gap-2">
              <h3 className="text-xs uppercase tracking-wide text-paper-dim">{grupo.titulo}</h3>
              <ul className="lista-enter flex flex-col gap-1.5 text-sm">
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
        </Modal>
      )}
    </>
  );
}
