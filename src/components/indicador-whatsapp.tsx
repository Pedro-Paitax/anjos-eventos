"use client";

import { useEffect, useState } from "react";
import { Botao } from "@/components/botao";
import { Modal } from "@/components/modal";

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
        <span key={dados.status} className="troca-suave inline-block">
          {icone}
        </span>
      </button>

      {modalVisivel && (
        <Modal titulo="Reconectar WhatsApp" onFechar={() => setModalAberto(false)} className="max-w-sm bg-ink">
          {dados.worker_offline ? (
            <p className="text-sm text-paper-dim">
              O serviço de WhatsApp não está respondendo. O restante do sistema
              continua funcionando normalmente.
            </p>
          ) : dados.qr_code ? (
            <>
              {/* Fundo claro fixo: o QR precisa de margem clara para ser lido. */}
              <div className="self-center rounded-[2px] bg-paper p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada pelo worker */}
                <img src={dados.qr_code} alt="QR Code do WhatsApp" className="h-64 w-64" />
              </div>
              <p className="text-sm text-paper-dim">
                No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho, e
                aponte para este código.
              </p>
            </>
          ) : (
            <p className="text-sm text-paper-dim" role="status">Aguardando o QR Code…</p>
          )}
          <Botao variante="secundario" onClick={() => setModalAberto(false)} className="self-end">
            Fechar
          </Botao>
        </Modal>
      )}
    </>
  );
}
