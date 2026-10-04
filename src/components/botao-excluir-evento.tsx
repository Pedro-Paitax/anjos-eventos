"use client";

import { useState } from "react";
import { excluirEventoAction } from "@/app/actions/evento";
import { Botao } from "@/components/botao";
import { ModalConfirmacao } from "@/components/modal-confirmacao";

export function BotaoExcluirEvento({
  eventoId,
  clienteNome,
}: {
  eventoId: number;
  clienteNome: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    try {
      await excluirEventoAction(eventoId);
    } catch (erro) {
      // redirect() do Server Action lança um erro especial do Next.js
      // (digest começando com "NEXT_REDIRECT") pra disparar a navegação —
      // não é falha real, precisa propagar pro Next tratar. Só erro sem
      // esse digest é falha de verdade (ex.: banco fora do ar).
      if (
        typeof erro === "object" &&
        erro !== null &&
        "digest" in erro &&
        typeof erro.digest === "string" &&
        erro.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw erro;
      }
      setExcluindo(false);
      setErro("Não foi possível excluir o evento. Tente de novo.");
    }
  }

  return (
    <>
      <Botao
        variante="secundario"
        onClick={() => {
          setErro(null);
          setConfirmando(true);
        }}
      >
        Excluir evento
      </Botao>
      {confirmando && (
        <ModalConfirmacao
          titulo="Excluir evento"
          rotuloConfirmar="Excluir evento"
          onConfirmar={excluir}
          onCancelar={() => setConfirmando(false)}
          pendente={excluindo}
          erro={erro}
        >
          Excluir o evento de &quot;{clienteNome}&quot;? Essa ação não pode ser desfeita.
        </ModalConfirmacao>
      )}
    </>
  );
}
