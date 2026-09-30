"use client";

import { useEffect, useState } from "react";

type StatusWhatsapp = {
  status: "connected" | "disconnected" | "connecting";
  qr_code: string | null;
  worker_offline?: boolean;
};

const INTERVALO_NORMAL_MS = 15_000;
const INTERVALO_MODAL_MS = 3_000; // QR muda a cada ~20s; acompanha de perto com o modal aberto

const ROTULOS = {
  connected: { icone: "🟢", texto: "WhatsApp conectado" },
  connecting: { icone: "🟡", texto: "WhatsApp conectando…" },
  disconnected: { icone: "🔴", texto: "WhatsApp desconectado" },
} as const;

export function IndicadorWhatsapp() {
  const [dados, setDados] = useState<StatusWhatsapp | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function consultar(forcar = false) {
      if (!forcar && document.visibilityState === "hidden") return;
      try {
        const resposta = await fetch("/api/whatsapp/status", { cache: "no-store" });
        if (!resposta.ok) throw new Error();
        const json = (await resposta.json()) as StatusWhatsapp;
        if (ativo) setDados(json);
      } catch {
        if (ativo) setDados({ status: "disconnected", qr_code: null, worker_offline: true });
      }
    }

    void consultar(true);
    const timer = setInterval(() => void consultar(), modalAberto ? INTERVALO_MODAL_MS : INTERVALO_NORMAL_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [modalAberto]);

  if (!dados) return null;
  const { icone, texto } = ROTULOS[dados.status];
  // Conectou com o modal aberto: ele some sozinho.
  const modalVisivel = modalAberto && dados.status !== "connected";

  return (
    <>
      <button
        type="button"
        onClick={() => dados.status !== "connected" && setModalAberto(true)}
        title={texto}
        aria-label={texto}
        className="text-base leading-none"
      >
        {icone}
      </button>

      {modalVisivel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Reconectar WhatsApp"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 print:hidden"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[2px] bg-paper p-6 text-center text-paper-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl italic">Reconectar WhatsApp</h2>
            {dados.worker_offline ? (
              <p className="text-sm">
                O serviço de WhatsApp não está respondendo. O restante do sistema
                continua funcionando normalmente.
              </p>
            ) : dados.qr_code ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada pelo worker */}
                <img src={dados.qr_code} alt="QR Code do WhatsApp" className="h-64 w-64" />
                <p className="text-sm">
                  No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho, e
                  aponte para este código.
                </p>
              </>
            ) : (
              <p className="text-sm">Aguardando o QR Code…</p>
            )}
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="rounded-[2px] border border-paper-ink/30 px-4 py-2 text-sm transition hover:bg-paper-ink/5"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
