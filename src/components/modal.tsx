"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Botao } from "@/components/botao";

/**
 * Modal único do app. Renderizado em portal no <body>: um ancestral com
 * transform/translate/filter/overflow (ex.: card com hover) prende
 * `position: fixed` e corta o modal. Montar = abrir (o pai só renderiza
 * quando aberto). Esc e clique fora fecham (clique fora pode ser desligado
 * com `cliqueForaFecha={false}` quando há dados digitados); foco preso e
 * devolvido a quem abriu. Foco inicial: elemento com `data-foco-inicial`,
 * senão o primeiro focável. `titulo` vira o <h2> do diálogo.
 */
type ModalProps = {
  onFechar: () => void;
  /** Título do diálogo (<h2>, ligado por aria-labelledby). */
  titulo?: string;
  /** Mostra "Fechar" ao lado do título. */
  mostrarFechar?: boolean;
  /** Clique no fundo fecha? Desligue em modal com formulário preenchido. */
  cliqueForaFecha?: boolean;
  /** aria-labelledby (id do título dentro do modal) ou aria-label. */
  labelledBy?: string;
  rotulo?: string;
  /** Classes da caixa (largura máxima). O fundo e o raio vêm do Brasa. */
  className?: string;
  children: ReactNode;
};

/** Igual a --motion-micro em globals.css. */
const SAIDA_MS = 120;

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onFechar,
  titulo,
  mostrarFechar = false,
  cliqueForaFecha = true,
  labelledBy,
  rotulo,
  className = "max-w-md",
  children,
}: ModalProps) {
  const tituloId = useId();
  const painelRef = useRef<HTMLDivElement>(null);
  const [saindo, setSaindo] = useState(false);
  // Sempre a versão mais recente, sem reexecutar o efeito a cada render.
  const fecharRef = useRef(onFechar);
  useEffect(() => {
    fecharRef.current = onFechar;
  });

  // Esc e clique fora fecham com animação de saída (sem ela, com
  // prefers-reduced-motion). Botões dentro do conteúdo fecham direto.
  const fecharComSaida = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fecharRef.current();
      return;
    }
    setSaindo(true);
    setTimeout(() => fecharRef.current(), SAIDA_MS);
  }, []);
  const saidaRef = useRef(fecharComSaida);
  useEffect(() => {
    saidaRef.current = fecharComSaida;
  });

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const painel = painelRef.current;
    if (painel && !painel.contains(document.activeElement)) {
      (
        painel.querySelector<HTMLElement>("[data-foco-inicial]") ??
        painel.querySelector<HTMLElement>(FOCAVEIS) ??
        painel
      ).focus();
    }

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        saidaRef.current();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;
      const focaveis = painelRef.current.querySelectorAll<HTMLElement>(FOCAVEIS);
      if (focaveis.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (!painelRef.current.contains(ativo)) {
        e.preventDefault();
        primeiro.focus();
      } else if (e.shiftKey && ativo === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-[rgb(10_7_6/0.72)] sm:items-center sm:p-4 print:hidden"
      data-saindo={saindo ? "" : undefined}
      onClick={cliqueForaFecha ? fecharComSaida : undefined}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (titulo ? tituloId : undefined)}
        aria-label={titulo ? undefined : rotulo}
        tabIndex={-1}
        className={`modal-caixa flex max-h-[calc(100dvh-1rem)] w-full flex-col gap-4 overflow-y-auto rounded-t-modal border border-borda-forte bg-elevada font-texto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 text-texto shadow-overlay outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-modal sm:p-7 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && (
          <div className="flex items-start justify-between gap-3">
            <h2 id={tituloId} className="font-titulo text-2xl font-bold tracking-tight">
              {titulo}
            </h2>
            {mostrarFechar && (
              <Botao variante="link" tamanho="sm" onClick={() => fecharRef.current()}>
                Fechar
              </Botao>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
