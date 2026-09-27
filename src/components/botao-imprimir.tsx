"use client";

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center justify-center self-start rounded-[2px] bg-black px-6 py-2.5 text-sm font-medium text-white shadow-[0_10px_20px_-10px_rgba(0,0,0,0.4)] transition hover:brightness-110"
    >
      Imprimir / Salvar como PDF
    </button>
  );
}
