"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/modal";
import {
  ANCORA_DECISOES_OPERACIONAIS,
  destinoItemPendencia,
  type AtivosPorFuncao,
  type ItemPendencia,
} from "@/lib/pendencias-evento";
import { Botao, botaoClasse } from "@/components/botao";
import { focarAncora } from "@/components/foco-por-ancora";

type Props = {
  eventoId: number;
  itens: ItemPendencia[];
  ativosPorFuncao: AtivosPorFuncao;
  className?: string;
};

// Cada item leva ao campo que resolve a pendência (id do primeiro controle da função ou do campo).
// A lib só conhece a âncora da seção; o campo é decidido aqui.
function idDoCampo(item: ItemPendencia): string {
  if (item.tipo === "equipe") return `equipe-${item.funcao}`;
  return item.campo === "decisoes" ? ANCORA_DECISOES_OPERACIONAIS : item.campo;
}

export function BotaoResolverPendencias({ eventoId, itens, ativosPorFuncao, className }: Props) {
  const [aberto, setAberto] = useState(false);

  if (itens.length === 0) return null;

  const grupos = [
    { titulo: "Equipe", itens: itens.filter((i) => i.tipo === "equipe") },
    { titulo: "Logística", itens: itens.filter((i) => i.tipo === "logistica") },
  ].filter((g) => g.itens.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className={
          className ?? botaoClasse("secundario", "sm")
        }
      >
        Resolver pendências
      </button>

      {aberto && (
        <Modal titulo="Pendências do evento" onFechar={() => setAberto(false)} className="max-w-md">
          {grupos.map((grupo) => (
            <section key={grupo.titulo} className="flex flex-col gap-2">
              <h3 className="text-[13px] text-texto-suave">{grupo.titulo}</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {grupo.itens.map((item) => {
                  const destino = destinoItemPendencia(item, eventoId, ativosPorFuncao);
                  const campo = destino.href.startsWith("/colaboradores") ? null : idDoCampo(item);
                  const href = campo ? `/agenda/${eventoId}#${campo}` : destino.href;
                  return (
                    <li key={item.texto}>
                      <Link
                        href={href}
                        onClick={() => {
                          setAberto(false);
                          // Mesma página: a navegação não remonta, então o foco vai daqui.
                          if (campo) setTimeout(() => focarAncora(campo), 200);
                        }}
                        className={botaoClasse("link", "sm")}
                      >
                        {destino.texto}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <Botao variante="secundario" onClick={() => setAberto(false)} className="self-end">
            Fechar
          </Botao>
        </Modal>
      )}
    </>
  );
}
