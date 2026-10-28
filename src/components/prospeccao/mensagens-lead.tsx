"use client";

import { useState } from "react";
import {
  aprovarMensagemAction,
  confirmarEnvioAction,
  descartarMensagemAction,
  editarMensagemAction,
  envioIniciadoAction,
  gerarMensagemAction,
} from "@/app/actions/prospeccao";
import type { Evidencia, Lead, Mensagem } from "@/lib/prospeccao";
import { canaisDisponiveis, linkDoCanal } from "@/lib/prospeccao-canais";
import { OBJETIVO_PADRAO, fatosPersonalizaveis } from "@/lib/prospeccao-mensagem";
import { ROTULOS_CANAL, ROTULOS_ESTADO_MENSAGEM, acaoPermitida } from "@/lib/prospeccao-opcoes";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";
import { FormularioAcao } from "@/components/prospeccao/formulario-acao";

const ROTULO_GERADOR: Record<Mensagem["gerador"], string> = {
  modelo_local: "modelo sem IA",
  manual: "escrita à mão",
  anthropic: "IA",
  gemini: "IA (Gemini)",
};

const dataHora = (d: Date | string) =>
  new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

function BotaoAbrirCanal({ lead, mensagem }: { lead: Lead; mensagem: Mensagem }) {
  const [copiado, setCopiado] = useState(false);
  const link = linkDoCanal(mensagem.canal, lead, mensagem.conteudo, mensagem.assunto);
  if (!link) return <Alerta tipo="aviso">Sem contato de {ROTULOS_CANAL[mensagem.canal]} no cadastro.</Alerta>;

  // O link abre no clique (sem esperar o servidor, para o navegador não bloquear a aba);
  // em paralelo registra só "canal aberto". Envio depende da confirmação abaixo.
  return (
    <div className="flex flex-col gap-1">
      <a
        href={link}
        target={mensagem.canal === "email" ? undefined : "_blank"}
        rel="noopener noreferrer"
        className={botaoClasse("secundario")}
        onClick={() => {
          if (mensagem.canal === "instagram" && navigator.clipboard) {
            navigator.clipboard.writeText(mensagem.conteudo).then(() => setCopiado(true), () => setCopiado(false));
          }
          void envioIniciadoAction(lead.id, mensagem.id);
        }}
      >
        Abrir {ROTULOS_CANAL[mensagem.canal]}
      </a>
      {mensagem.canal === "instagram" && (
        <span className="text-[13px] text-texto-suave">
          {copiado ? "Texto copiado: cole na conversa do Instagram." : "O texto é copiado ao abrir; cole na conversa (DM)."}
        </span>
      )}
    </div>
  );
}

function CartaoMensagem({ lead, mensagem, fatos }: { lead: Lead; mensagem: Mensagem; fatos: Evidencia[] }) {
  const editavel = acaoPermitida("editar", mensagem.estado);
  const bloqueado = lead.naoContatar;

  return (
    <li className="flex flex-col gap-4 rounded-controle border border-borda p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          v{mensagem.versao} · {ROTULOS_CANAL[mensagem.canal]} · {ROTULOS_ESTADO_MENSAGEM[mensagem.estado]}
        </p>
        <p className="text-[13px] text-texto-suave">
          {ROTULO_GERADOR[mensagem.gerador]}
          {mensagem.modelo ? ` (${mensagem.modelo})` : ""} · {mensagem.criadaPorNome ?? "—"} · {dataHora(mensagem.createdAt)}
        </p>
      </div>
      <p className="text-sm text-texto-suave">Objetivo: {mensagem.objetivo}</p>

      {editavel ? (
        <FormularioAcao
          action={editarMensagemAction.bind(null, lead.id, mensagem.id)}
          rotulo="Salvar edição"
          variante="secundario"
        >
          {mensagem.canal === "email" && (
            <Campo rotulo="Assunto">{(p) => <input {...p} name="assunto" defaultValue={mensagem.assunto ?? ""} />}</Campo>
          )}
          <Campo rotulo="Mensagem">
            {(p) => <textarea {...p} name="conteudo" rows={8} defaultValue={mensagem.conteudo} />}
          </Campo>
          {fatos.length > 0 && (
            <fieldset className="flex flex-col gap-1 text-sm">
              <legend className="mb-1 text-texto-suave">Fatos verificados usados na personalização</legend>
              {fatos.map((f) => (
                <label key={f.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="fatos"
                    value={f.id}
                    defaultChecked={mensagem.evidenciaIds.includes(f.id)}
                    className="mt-1"
                  />
                  <span>{f.fato}</span>
                </label>
              ))}
            </fieldset>
          )}
        </FormularioAcao>
      ) : (
        <div className="flex flex-col gap-2">
          {mensagem.assunto && <p className="text-sm">Assunto: {mensagem.assunto}</p>}
          <p className="whitespace-pre-wrap rounded-controle bg-white/5 p-3 text-sm">{mensagem.conteudo}</p>
        </div>
      )}

      {mensagem.fatosUsados.length > 0 && (
        <div className="text-sm">
          <p className="text-texto-suave">Personalizada com:</p>
          <ul className="list-disc pl-5">
            {mensagem.fatosUsados.map((f) => (
              <li key={f.evidenciaId}>
                {f.fato}{" "}
                {f.url && (
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-link underline">
                    fonte
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3 text-[13px] text-texto-suave">
        {mensagem.editadaEm && <span>Editada por {mensagem.editadaPorNome} em {dataHora(mensagem.editadaEm)}.</span>}
        {mensagem.aprovadaEm && <span>Aprovada por {mensagem.aprovadaPorNome} em {dataHora(mensagem.aprovadaEm)}.</span>}
        {mensagem.envioIniciadoEm && <span>Canal aberto em {dataHora(mensagem.envioIniciadoEm)}.</span>}
        {mensagem.enviadaEm && <span>Envio confirmado por {mensagem.enviadaPorNome} em {dataHora(mensagem.enviadaEm)}.</span>}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {acaoPermitida("aprovar", mensagem.estado) && !bloqueado && (
          <FormularioAcao action={aprovarMensagemAction.bind(null, lead.id, mensagem.id)} rotulo="Aprovar texto" className="flex flex-col gap-2" />
        )}
        {acaoPermitida("abrir_canal", mensagem.estado) && !bloqueado && <BotaoAbrirCanal lead={lead} mensagem={mensagem} />}
        {acaoPermitida("descartar", mensagem.estado) && (
          <FormularioAcao
            action={descartarMensagemAction.bind(null, lead.id, mensagem.id)}
            rotulo="Descartar"
            variante="link"
            className="flex flex-col gap-2"
          />
        )}
      </div>

      {acaoPermitida("confirmar_envio", mensagem.estado) && !bloqueado && (
        <FormularioAcao
          action={confirmarEnvioAction.bind(null, lead.id, mensagem.id)}
          rotulo="Registrar envio"
          className="flex flex-col gap-3 rounded-controle border border-borda-forte p-3"
        >
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirmo" required className="mt-1" />
            Confirmo que enviei esta mensagem manualmente pelo {ROTULOS_CANAL[mensagem.canal]}.
          </label>
        </FormularioAcao>
      )}
    </li>
  );
}

export function MensagensLead({
  lead,
  mensagens,
  evidencias,
  modeloIa,
}: {
  lead: Lead;
  mensagens: Mensagem[];
  evidencias: Evidencia[];
  /** Modelo do Gemini se a IA estiver configurada no servidor; null = só modelo sem IA. */
  modeloIa: string | null;
}) {
  const canais = canaisDisponiveis(lead);
  const fatos = fatosPersonalizaveis(evidencias) as Evidencia[];

  return (
    <div className="flex flex-col gap-6">
      {lead.naoContatar ? (
        <Alerta tipo="perigo">Lead marcado como não contatar: nenhuma mensagem pode ser gerada, aprovada ou enviada.</Alerta>
      ) : canais.length === 0 ? (
        <Alerta tipo="aviso">
          Nenhum canal comercial cadastrado. Pesquise telefone, e-mail ou Instagram do estabelecimento antes de abordar.
        </Alerta>
      ) : (
        <FormularioAcao action={gerarMensagemAction.bind(null, lead.id)} rotulo="Gerar nova versão">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[12rem_1fr]">
            <Campo rotulo="Canal">
              {(p) => (
                <Seletor {...p} name="canal" defaultValue={canais[0]} opcoes={canais.map((c) => ({ valor: c, rotulo: ROTULOS_CANAL[c] }))} />
              )}
            </Campo>
            <Campo rotulo="Objetivo da abordagem">
              {(p) => <input {...p} name="objetivo" required defaultValue={OBJETIVO_PADRAO[lead.categoria]} />}
            </Campo>
          </div>
          {modeloIa && (
            <Campo rotulo="Gerar com">
              {(p) => (
                <Seletor
                  {...p}
                  name="gerador"
                  defaultValue="gemini"
                  opcoes={[
                    { valor: "gemini", rotulo: `IA (Gemini — ${modeloIa})` },
                    { valor: "modelo_local", rotulo: "Modelo sem IA" },
                  ]}
                />
              )}
            </Campo>
          )}
          <p className="text-[13px] text-texto-suave">
            {modeloIa
              ? "A IA recebe só o nome, a categoria, o segmento, o município e os fatos verificados do lead (nada de contatos ou notas internas) e pode errar: confira o texto contra as fontes antes de aprovar."
              : "IA não configurada: o texto sai de um modelo honesto e genérico. Personalize à mão usando os fatos verificados e marque quais usou."}{" "}
            Gerar não aprova; aprovar não envia.
          </p>
        </FormularioAcao>
      )}

      {fatos.length > 0 ? (
        <div className="text-sm">
          <p className="font-semibold">Fatos verificados disponíveis para personalizar</p>
          <ul className="list-disc pl-5">
            {fatos.map((f) => (
              <li key={f.id}>
                {f.fato}{" "}
                {f.url && (
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-link underline">
                    fonte
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-texto-suave">
          Nenhum fato verificado: mantenha a mensagem genérica. Não invente elogios, eventos ou estrutura.
        </p>
      )}

      {mensagens.length > 0 && (
        <ul className="flex flex-col gap-4">
          {mensagens.map((m) => (
            <CartaoMensagem key={m.id} lead={lead} mensagem={m} fatos={fatos} />
          ))}
        </ul>
      )}
    </div>
  );
}
