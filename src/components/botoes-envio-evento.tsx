"use client";

import { useState } from "react";
import {
  enviarLembreteEventoAction,
  enviarOrdemAcaoAction,
  type ResultadoEnvioEvento,
} from "@/app/actions/envios-evento";
import { Alerta } from "@/components/alerta";
import { Botao } from "@/components/botao";
import { Modal } from "@/components/modal";
import { formatarData, formatarHora } from "@/lib/formatacao";

type Props = {
  eventoId: number;
  /** Há pendências nas decisões operacionais: a Ordem não pode sair. */
  temPendencias: boolean;
  /** Quantos colaboradores alocados têm WhatsApp (só a contagem chega ao navegador). */
  qtdDestinatariosOrdem: number;
  qtdNumerosFamilia: number;
  /** ISO do último envio da Ordem, quando houver. */
  ordemEnviadaEm: string | null;
};

type Qual = "ordem" | "lembrete";

/** Botões manuais de Ordem de Ação e lembrete de pendências (o cron foi descartado em 05/11). */
export function BotoesEnvioEvento({
  eventoId,
  temPendencias,
  qtdDestinatariosOrdem,
  qtdNumerosFamilia,
  ordemEnviadaEm,
}: Props) {
  const [aberto, setAberto] = useState<Qual | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoEnvioEvento | null>(null);
  const [enviadaEm, setEnviadaEm] = useState(ordemEnviadaEm);

  const concluido = resultado?.tipo === "concluido" ? resultado : null;
  const reenvio = aberto === "ordem" && enviadaEm !== null;

  async function enviar() {
    setEnviando(true);
    try {
      const r =
        aberto === "ordem"
          ? await enviarOrdemAcaoAction(eventoId, reenvio)
          : await enviarLembreteEventoAction(eventoId);
      if (r.tipo === "confirmar-reenvio") setEnviadaEm(r.enviadaEm);
      if (r.tipo === "concluido" && aberto === "ordem") setEnviadaEm(new Date().toISOString());
      setResultado(r.tipo === "confirmar-reenvio" ? null : r);
    } catch {
      setResultado({ tipo: "erro", mensagem: "Não foi possível enviar. Tente de novo." });
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    setAberto(null);
    setResultado(null);
  }

  const semDestino =
    aberto === "ordem" ? qtdDestinatariosOrdem === 0 || temPendencias : qtdNumerosFamilia === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Botao
          variante="secundario"
          disabled={temPendencias}
          title={temPendencias ? "Resolva as pendências antes de enviar a Ordem de Ação" : undefined}
          onClick={() => setAberto("ordem")}
        >
          Enviar Ordem de Ação
        </Botao>
        <Botao variante="secundario" onClick={() => setAberto("lembrete")}>
          Enviar lembrete de pendências
        </Botao>
      </div>

      {aberto && (
        <Modal
          titulo={aberto === "ordem" ? "Enviar Ordem de Ação" : "Enviar lembrete de pendências"}
          onFechar={fechar}
          className="max-w-md"
          cliqueForaFecha={!enviando}
        >
          {!concluido && (
            <>
              <p className="text-sm text-texto-suave">
                {aberto === "ordem" ? (
                  <>
                    Envia pelo WhatsApp o PDF da Ordem de Ação para{" "}
                    <strong className="text-texto">
                      {qtdDestinatariosOrdem}{" "}
                      {qtdDestinatariosOrdem === 1 ? "colaborador alocado" : "colaboradores alocados"}
                    </strong>
                    . Quem está sem WhatsApp cadastrado não recebe.
                  </>
                ) : (
                  <>
                    Envia pelo WhatsApp a lista de pendências deste evento para{" "}
                    <strong className="text-texto">
                      {qtdNumerosFamilia} {qtdNumerosFamilia === 1 ? "número da família" : "números da família"}
                    </strong>
                    .
                  </>
                )}
              </p>
              {reenvio && enviadaEm && (
                <Alerta tipo="aviso">
                  Ordem já enviada em {formatarData(enviadaEm)}, {formatarHora(enviadaEm)}. Reenviar manda tudo de
                  novo à equipe. Só continue se for isso mesmo que você quer.
                </Alerta>
              )}
              {semDestino && (
                <Alerta tipo="perigo">
                  {aberto === "ordem"
                    ? "Nenhum colaborador alocado tem WhatsApp cadastrado. Nada pode ser enviado."
                    : "Os números da família não estão configurados no servidor. Nada pode ser enviado."}
                </Alerta>
              )}
              {resultado?.tipo === "erro" && <Alerta tipo="perigo">{resultado.mensagem}</Alerta>}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Botao variante="secundario" onClick={fechar} disabled={enviando} data-foco-inicial>
                  Cancelar
                </Botao>
                <Botao onClick={enviar} disabled={enviando || semDestino} aria-busy={enviando}>
                  {enviando ? "Enviando…" : reenvio ? "Reenviar mesmo assim" : "Enviar"}
                </Botao>
              </div>
            </>
          )}

          {concluido && (
            <>
              <p className={`text-sm ${concluido.parcial ? "text-perigo" : "text-sucesso"}`} role="status">
                {concluido.mensagem}
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
