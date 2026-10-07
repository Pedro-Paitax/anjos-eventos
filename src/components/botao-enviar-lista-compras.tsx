"use client";

import { useState } from "react";
import { enviarListaComprasAction, type ResultadoEnvioListaCompras } from "@/app/actions/lista-compras";
import { Alerta } from "@/components/alerta";
import { Botao } from "@/components/botao";
import { Modal } from "@/components/modal";
import { formatarData, formatarHora } from "@/lib/formatacao";

type Props = {
  eventoId: number;
  temCardapioConfirmado: boolean;
  /** "•••• 1234"; null quando LISTA_COMPRAS_WHATSAPP não está configurada. */
  destinoMascarado: string | null;
  /** ISO do último envio, quando houver. */
  ultimoEnvio: string | null;
};

const dataHora = (iso: string) => `${formatarData(iso)}, ${formatarHora(iso)}`;

export function BotaoEnviarListaCompras({ eventoId, temCardapioConfirmado, destinoMascarado, ultimoEnvio }: Props) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvioListaCompras | null>(null);
  const [ultimo, setUltimo] = useState(ultimoEnvio);

  const concluido = resultado?.tipo === "concluido" ? resultado : null;
  const jaEnviado = ultimo !== null;

  async function enviar() {
    setEnviando(true);
    try {
      const r = await enviarListaComprasAction(eventoId, jaEnviado);
      if (r.tipo === "confirmar-reenvio") setUltimo(r.ultimoEnvio);
      if (r.tipo === "concluido" && r.pdf.ok && r.gravado) setUltimo(new Date().toISOString());
      setResultado(r.tipo === "confirmar-reenvio" ? null : r);
    } catch {
      setResultado({ tipo: "erro", mensagem: "Não foi possível enviar. Tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    setAberto(false);
    setResultado(null);
  }

  return (
    <>
      <Botao
        variante="secundario"
        disabled={!temCardapioConfirmado}
        title={temCardapioConfirmado ? undefined : "Este evento não tem cardápio confirmado"}
        onClick={() => setAberto(true)}
      >
        Enviar lista de compras
      </Botao>

      {aberto && (
        <Modal titulo="Enviar lista de compras" onFechar={fechar} className="max-w-md" cliqueForaFecha={!enviando}>
          {!concluido && (
            <>
              <p className="text-sm text-texto-suave">
                Envia o PDF da lista de compras e uma mensagem curta pelo WhatsApp para{" "}
                <strong className="text-texto">{destinoMascarado ?? "(destino não configurado)"}</strong>.
              </p>
              {ultimo && (
                <Alerta tipo="aviso">
                  Último envio: {dataHora(ultimo)}. Reenviar pode gerar um pedido duplicado ao
                  fornecedor. Só continue se for isso mesmo que você quer.
                </Alerta>
              )}
              {!destinoMascarado && (
                <Alerta tipo="perigo">Destino não configurado no servidor. Nada pode ser enviado.</Alerta>
              )}
              {resultado?.tipo === "erro" && <Alerta tipo="perigo">{resultado.mensagem}</Alerta>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Botao variante="secundario" onClick={fechar} disabled={enviando} data-foco-inicial>
                  Cancelar
                </Botao>
                <Botao onClick={enviar} disabled={enviando || !destinoMascarado} aria-busy={enviando}>
                  {enviando ? "Enviando…" : jaEnviado ? "Reenviar mesmo assim" : "Enviar"}
                </Botao>
              </div>
            </>
          )}

          {concluido && (
            <>
              <ul className="flex flex-col gap-2 text-sm" role="status">
                <li>
                  <span className={concluido.pdf.ok ? "text-sucesso" : "text-perigo"}>
                    PDF: {concluido.pdf.ok ? "enviado" : concluido.pdf.mensagem}
                  </span>
                </li>
                <li>
                  {concluido.texto ? (
                    <span className={concluido.texto.ok ? "text-sucesso" : "text-perigo"}>
                      Mensagem: {concluido.texto.ok ? "enviada" : concluido.texto.mensagem}
                    </span>
                  ) : (
                    <span className="text-texto-suave">Mensagem: não enviada (o PDF falhou).</span>
                  )}
                </li>
                {concluido.pdf.ok && !concluido.gravado && (
                  <li className="text-aviso">
                    O PDF foi enviado, mas o registro do envio não foi gravado. Não reenvie sem conferir.
                  </li>
                )}
              </ul>
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
