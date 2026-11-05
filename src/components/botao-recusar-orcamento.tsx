"use client";

import { useState } from "react";
import { recusarOrcamentoAction } from "@/app/actions/orcamento";
import { Botao } from "@/components/botao";
import { ModalConfirmacao } from "@/components/modal-confirmacao";

export function BotaoRecusarOrcamento({
  orcamentoId,
  clienteNome,
}: {
  orcamentoId: number;
  clienteNome: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, setPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function recusar() {
    setErro(null);
    setPendente(true);
    try {
      const resultado = await recusarOrcamentoAction(orcamentoId);
      if (resultado.erro) {
        setErro(resultado.erro);
        setPendente(false);
        return;
      }
      // Sucesso: a action revalida a página e ela passa a mostrar o status Recusado.
      setConfirmando(false);
      setPendente(false);
    } catch (e) {
      // redirect("/login") da action lança NEXT_REDIRECT: precisa propagar.
      if (typeof e === "object" && e !== null && "digest" in e && String(e.digest).startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      setPendente(false);
      setErro("Não foi possível recusar o orçamento. Tente de novo.");
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
        Recusar orçamento
      </Botao>
      {confirmando && (
        <ModalConfirmacao
          titulo="Recusar orçamento"
          rotuloConfirmar="Recusar orçamento"
          rotuloConfirmando="Recusando…"
          onConfirmar={recusar}
          onCancelar={() => setConfirmando(false)}
          pendente={pendente}
          erro={erro}
        >
          Recusar o orçamento de &quot;{clienteNome}&quot;? Ele não poderá mais ser aprovado nem virar evento.
        </ModalConfirmacao>
      )}
    </>
  );
}
