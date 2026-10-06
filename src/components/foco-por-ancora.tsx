"use client";

import { useEffect } from "react";

const FOCAVEL = 'input:not([type="hidden"]), button, select, textarea, a[href], [tabindex]';

/**
 * Leva o foco ao campo da âncora (`#id`). Se o elemento não for focável (ex.: a seção
 * inteira), vai para o primeiro controle dentro dele.
 */
export function focarAncora(id: string): boolean {
  const alvo = document.getElementById(id);
  if (!alvo) return false;
  const focavel = alvo.matches(FOCAVEL) ? alvo : alvo.querySelector<HTMLElement>(FOCAVEL);
  if (!focavel) return false;
  alvo.scrollIntoView({ block: focavel === alvo ? "center" : "start" });
  focavel.focus({ preventScroll: true });
  return true;
}

/** Ao abrir a página com `#id` (vindo, por exemplo, da Home), foca o campo da âncora. */
export function FocoPorAncora() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const t = setTimeout(() => focarAncora(id), 150);
    return () => clearTimeout(t);
  }, []);
  return null;
}
