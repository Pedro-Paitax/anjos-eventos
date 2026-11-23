"use client";

import { useState } from "react";
import { enviarChecklistAction, type ResultadoEnvioChecklist } from "@/app/actions/checklist-carregamento";
import { Alerta } from "@/components/alerta";
import { Botao, botaoClasse } from "@/components/botao";
import { Modal } from "@/components/modal";

type Props = {
  eventoId: number;
  /** Por que o checklist não pode sair (migração, cadastro vazio, sem cardápio); null = pode. */
  bloqueio: string | null;
  /** Quantos números da família estão configurados (FAMILIA_WHATSAPP_NUMEROS). */
  qtdNumerosFamilia: number;
};

/** Botões "Emitir checklist (PDF)" e "Enviar no WhatsApp" da tela do evento (Senhor Churrasco). */
export function ChecklistCarregamentoEvento({ eventoId, bloqueio, qtdNumerosFamilia }: Props) {
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvioChecklist | null>(null);
  const concluido = resultado?.tipo === "concluido" ? resultado : null;

  async function enviar() {
    setEnviando(true);
    try {
      setResultado(await enviarChecklistAction(eventoId));
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

  const destino = `${qtdNumerosFamilia} ${qtdNumerosFamilia === 1 ? "número da família" : "números da família"}`;

  return (
    <div className="flex flex-col gap-3">
      {bloqueio && <Alerta tipo="aviso">{bloqueio}</Alerta>}
      <div className="flex flex-wrap items-center gap-3">
        {bloqueio ? (
          <Botao variante="secundario" disabled title={bloqueio}>
            Emitir checklist (PDF)
          </Botao>
        ) : (
          <a
            href={`/agenda/${eventoId}/checklist-carregamento/pdf`}
            target="_blank"
            rel="noopener"
            className={botaoClasse("secundario")}
          >
            Emitir checklist (PDF)
          </a>
        )}
        <Botao
          variante="secundario"
          disabled={!!bloqueio}
          title={bloqueio ?? undefined}
          onClick={() => setAberto(true)}
        >
          Enviar no WhatsApp
        </Botao>
      </div>

      {aberto && (
        <Modal titulo="Enviar checklist no WhatsApp" onFechar={fechar} className="max-w-md" cliqueForaFecha={!enviando}>
          {!concluido && (
            <>
              <p className="text-sm text-texto-suave">
                Envia o PDF do checklist de carregamento pelo WhatsApp para{" "}
                <strong className="text-texto">{destino}</strong>.
              </p>
              {qtdNumerosFamilia === 0 && (
                <Alerta tipo="perigo">Os números da família não estão configurados no servidor. Nada pode ser enviado.</Alerta>
              )}
              {resultado?.tipo === "erro" && <Alerta tipo="perigo">{resultado.mensagem}</Alerta>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Botao variante="secundario" onClick={fechar} disabled={enviando} data-foco-inicial>
                  Cancelar
                </Botao>
                <Botao onClick={enviar} disabled={enviando || qtdNumerosFamilia === 0} aria-busy={enviando}>
                  {enviando ? "Enviando…" : "Enviar"}
                </Botao>
              </div>
            </>
          )}

          {concluido && (
            <>
              <p className={`text-sm ${concluido.falhas === 0 ? "text-sucesso" : "text-perigo"}`} role="status">
                {concluido.falhas === 0
                  ? `PDF enviado para ${concluido.enviados} ${concluido.enviados === 1 ? "número" : "números"}.`
                  : `PDF enviado para ${concluido.enviados} de ${concluido.enviados + concluido.falhas} números. ${concluido.falhas} ${concluido.falhas === 1 ? "falhou" : "falharam"}.`}
              </p>
              <Botao variante="secundario" onClick={fechar} className="self-end" data-foco-inicial>
                Fechar
              </Botao>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
