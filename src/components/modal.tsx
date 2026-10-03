"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal único do app. Renderizado em portal no <body>: um ancestral com
 * transform/translate/filter/overflow (ex.: card com hover) prende
 * `position: fixed` e corta o modal. Montar = abrir (o pai só renderiza
 * quando aberto). Esc e clique fora fecham; foco preso e devolvido a quem
 * abriu.
 */
type ModalProps = {
  onFechar: () => void;
  /** aria-labelledby (id do título dentro do modal) ou aria-label. */
  labelledBy?: string;
  rotulo?: string;
  /** Classes da caixa (largura máxima, fundo). */
  className?: string;
  children: ReactNode;
};

/** Igual a --motion-fast em globals.css. */
const SAIDA_MS = 150;

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  onFechar,
  labelledBy,
  rotulo,
  className = "max-w-md bg-ink",
  children,
}: ModalProps) {
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
      (painel.querySelector<HTMLElement>(FOCAVEIS) ?? painel).focus();
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
      className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 print:hidden"
      data-saindo={saindo ? "" : undefined}
      onClick={fecharComSaida}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={rotulo}
        tabIndex={-1}
        className={`modal-caixa flex max-h-[calc(100dvh-2rem)] w-full flex-col gap-4 overflow-y-auto rounded-[2px] p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)] outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
