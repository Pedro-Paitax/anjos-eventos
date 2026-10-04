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

// O estado nunca depende só da cor: cada um tem uma forma de ícone e um texto.
const ROTULOS = {
  connected: { texto: "WhatsApp conectado", curto: "Conectado", cor: "text-sucesso", caminho: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M7 10.5 9 12.5 13 8" },
  connecting: { texto: "WhatsApp conectando…", curto: "Conectando…", cor: "text-aviso", caminho: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M10 6.5V10l2.5 1.5" },
  disconnected: { texto: "WhatsApp desconectado", curto: "Desconectado", cor: "text-perigo", caminho: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M7.8 7.8l4.4 4.4 M12.2 7.8l-4.4 4.4" },
} as const;

/** `comTexto`: mostra o estado por escrito ao lado do ícone (menu lateral). */
export function IndicadorWhatsapp({ comTexto = false }: { comTexto?: boolean }) {
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
  const { texto, curto, cor, caminho } = ROTULOS[dados.status];
  // Conectou com o modal aberto: ele some sozinho.
  const modalVisivel = modalAberto && dados.status !== "connected";

  return (
    <>
      <button
        type="button"
        onClick={() => dados.status !== "connected" && setModalAberto(true)}
        title={texto}
        aria-label={texto}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-controle text-sm font-medium text-texto-suave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${comTexto ? "justify-start px-3" : ""}`}
      >
        <span key={dados.status} className={`troca-suave inline-flex items-center gap-2 ${cor}`}>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={caminho} />
          </svg>
          {comTexto && <span className="text-texto-suave">{curto}</span>}
        </span>
      </button>

      {modalVisivel && (
        <Modal titulo="Reconectar WhatsApp" onFechar={() => setModalAberto(false)} className="max-w-sm">
          {dados.worker_offline ? (
            <p className="text-sm text-texto-suave">
              O serviço de WhatsApp não está respondendo. O restante do sistema
              continua funcionando normalmente.
            </p>
          ) : dados.qr_code ? (
            <>
              {/* Fundo claro fixo: o QR precisa de margem clara para ser lido. */}
              <div className="self-center rounded-controle bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL gerada pelo worker */}
                <img src={dados.qr_code} alt="QR Code do WhatsApp" className="h-64 w-64" />
              </div>
              <p className="text-sm text-texto-suave">
                No celular: WhatsApp → Aparelhos conectados → Conectar um aparelho, e
                aponte para este código.
              </p>
            </>
          ) : (
            <p className="text-sm text-texto-suave" role="status">Aguardando o QR Code…</p>
          )}
          <Botao variante="secundario" onClick={() => setModalAberto(false)} className="self-end">
            Fechar
          </Botao>
        </Modal>
      )}
    </>
  );
}
