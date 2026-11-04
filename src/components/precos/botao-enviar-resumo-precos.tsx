"use client";

import { useState } from "react";
import { enviarResumoPrecosAction, type ResultadoEnvioResumoPrecos } from "@/app/actions/precos";
import { Alerta } from "@/components/alerta";
import { Botao } from "@/components/botao";
import { Modal } from "@/components/modal";

type Props = {
  /** Números da família mascarados ("•••• 1234"); vazio = não configurado no servidor. */
  destinos: string[];
  /** Insumos com mudança de preço ainda não enviada; null = registro de mudanças inativo no banco. */
  pendentes: number | null;
};

/** Envia na hora o PDF de preços (o que mudou + tabela completa) pelo WhatsApp da família. */
export function BotaoEnviarResumoPrecos({ destinos, pendentes }: Props) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvioResumoPrecos | null>(null);

  const bloqueio =
    destinos.length === 0
      ? "Os números da família não estão configurados no servidor. Nada pode ser enviado."
      : pendentes === null
        ? "O registro de mudanças de preço ainda não está ativo no banco. Nada pode ser enviado."
        : null;

  async function enviar() {
    setEnviando(true);
    try {
      setResultado(await enviarResumoPrecosAction());
    } catch {
      setResultado({ ok: false, mensagem: "Não foi possível enviar. Tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setResultado(null);
  }

  const enviado = resultado !== null && resultado.mensagem.startsWith("PDF enviado");

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        Enviar PDF de preços
      </Botao>

      {aberto && (
        <Modal titulo="Enviar PDF de preços" onFechar={fechar} className="max-w-md" cliqueForaFecha={!enviando}>
          {!enviado && (
            <>
              <p className="text-sm text-texto-suave">
                Envia agora, pelo WhatsApp conectado, o PDF com{" "}
                {pendentes
                  ? `o que mudou desde o último resumo (${pendentes} ${pendentes === 1 ? "insumo" : "insumos"}) e`
                  : "a"}{" "}
                tabela completa de preços para{" "}
                <strong className="text-texto">{destinos.length ? destinos.join(", ") : "(números não configurados)"}</strong>.
              </p>
              {pendentes === 0 && (
                <Alerta tipo="aviso">Nenhum preço mudou desde o último resumo: o PDF vai só com a tabela completa.</Alerta>
              )}
              {bloqueio && <Alerta tipo="perigo">{bloqueio}</Alerta>}
              {resultado && !resultado.ok && <Alerta tipo="perigo">{resultado.mensagem}</Alerta>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Botao variante="secundario" onClick={fechar} disabled={enviando} data-foco-inicial>
                  Cancelar
                </Botao>
                <Botao onClick={enviar} disabled={enviando || bloqueio !== null} aria-busy={enviando}>
                  {enviando ? "Enviando…" : "Enviar agora"}
                </Botao>
              </div>
            </>
          )}

          {enviado && resultado && (
            <>
              <p role="status" className={`text-sm ${resultado.ok ? "text-sucesso" : "text-aviso"}`}>
                {resultado.mensagem}
              </p>
              <Botao variante="secundario" onClick={fechar} className="self-end" data-foco-inicial>
                Fechar
              </Botao>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
