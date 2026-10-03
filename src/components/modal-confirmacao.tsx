"use client";

import type { ReactNode } from "react";
import { Alerta } from "@/components/alerta";
import { Botao } from "@/components/botao";
import { Modal } from "@/components/modal";

type ModalConfirmacaoProps = {
  titulo: string;
  rotuloConfirmar: string;
  rotuloConfirmando?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  pendente?: boolean;
  erro?: string | null;
  /** Texto que diz o que será perdido. */
  children: ReactNode;
};

/** Confirmação de ação destrutiva: foco inicial no botão seguro (Cancelar). */
export function ModalConfirmacao({
  titulo,
  rotuloConfirmar,
  rotuloConfirmando = "Excluindo…",
  onConfirmar,
  onCancelar,
  pendente = false,
  erro,
  children,
}: ModalConfirmacaoProps) {
  return (
    <Modal titulo={titulo} onFechar={onCancelar} className="max-w-sm bg-ink">
      <div className="text-sm text-paper-dim">{children}</div>
      {erro && <Alerta tipo="perigo">{erro}</Alerta>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Botao variante="secundario" onClick={onCancelar} disabled={pendente} data-foco-inicial>
          Cancelar
        </Botao>
        <Botao variante="perigo" onClick={onConfirmar} disabled={pendente} aria-busy={pendente}>
          {pendente ? rotuloConfirmando : rotuloConfirmar}
        </Botao>
      </div>
    </Modal>
  );
}
