"use client";

import {
  alterarStatusAction,
  criarEvidenciaAction,
  naoContatarAction,
  proximaAcaoAction,
  qualificarAction,
  reativarContatoAction,
  registrarInteracaoAction,
  verificacaoEvidenciaAction,
} from "@/app/actions/prospeccao";
import type { Evidencia, Lead, Qualificacao } from "@/lib/prospeccao";
import {
  CAMPOS_EVIDENCIA,
  CONFIANCAS,
  INTERACOES_REGISTRAVEIS,
  NATUREZAS_EVIDENCIA,
  ROTULOS_CAMPO,
  ROTULOS_CONFIANCA,
  ROTULOS_INTERACAO,
  ROTULOS_NATUREZA,
  ROTULOS_STATUS,
  ROTULOS_TIPO_EVIDENCIA,
  ROTULOS_VERIFICACAO,
  STATUS_MANUAIS,
  TIPOS_EVIDENCIA,
  VERIFICACOES,
} from "@/lib/prospeccao-opcoes";
import { DIMENSOES } from "@/lib/prospeccao-pontuacao";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import { FormularioAcao } from "@/components/prospeccao/formulario-acao";

const hoje = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

const opcoes = <T extends string>(lista: readonly T[], rotulos: Record<T, string>) =>
  lista.map((v) => ({ valor: v as string, rotulo: rotulos[v] }));

// ---------- Evidências ----------

export function FormularioEvidencia({ leadId }: { leadId: number }) {
  return (
    <FormularioAcao action={criarEvidenciaAction.bind(null, leadId)} rotulo="Registrar evidência">
      {(estado) => {
        const v = (c: string, padrao = "") => estado.valores?.[c] ?? padrao;
        return (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo rotulo="Fonte">
                {(p) => <input {...p} name="fonte" required placeholder="Site oficial, Instagram, guia…" defaultValue={v("fonte")} />}
              </Campo>
              <Campo rotulo="URL">
                {(p) => <input {...p} name="url" type="url" placeholder="https://…" defaultValue={v("url")} />}
              </Campo>
              <Campo rotulo="Consultada em">
                {(p) => <input {...p} name="consultado_em" type="date" required defaultValue={v("consultado_em", hoje())} />}
              </Campo>
              <Campo rotulo="Tipo de fonte">
                {(p) => <Seletor {...p} name="tipo" defaultValue={v("tipo", "site_oficial")} opcoes={opcoes(TIPOS_EVIDENCIA, ROTULOS_TIPO_EVIDENCIA)} />}
              </Campo>
            </div>
            <Campo rotulo="Fato que a fonte sustenta" ajuda="Escreva só o que a fonte diz. Conclusão sua = inferência.">
              {(p) => <textarea {...p} name="fato" rows={2} required defaultValue={v("fato")} />}
            </Campo>
            <Campo rotulo="Trecho (opcional)">
              {(p) => <textarea {...p} name="trecho" rows={2} defaultValue={v("trecho")} />}
            </Campo>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo rotulo="Natureza">
                {(p) => <Seletor {...p} name="natureza" defaultValue={v("natureza", "fato")} opcoes={opcoes(NATUREZAS_EVIDENCIA, ROTULOS_NATUREZA)} />}
              </Campo>
              <Campo rotulo="Campo do cadastro que sustenta">
                {(p) => (
                  <Seletor
                    {...p}
                    name="campo"
                    defaultValue={v("campo")}
                    opcoes={[{ valor: "", rotulo: "Nenhum (fato livre)" }, ...opcoes(CAMPOS_EVIDENCIA, ROTULOS_CAMPO)]}
                  />
                )}
              </Campo>
              <Campo rotulo="Confiança">
                {(p) => <Seletor {...p} name="confianca" defaultValue={v("confianca", "media")} opcoes={opcoes(CONFIANCAS, ROTULOS_CONFIANCA)} />}
              </Campo>
              <Campo rotulo="Verificação">
                {(p) => <Seletor {...p} name="verificacao" defaultValue={v("verificacao", "a_verificar")} opcoes={opcoes(VERIFICACOES, ROTULOS_VERIFICACAO)} />}
              </Campo>
            </div>
          </>
        );
      }}
    </FormularioAcao>
  );
}

export function VerificacaoEvidencia({ leadId, evidencia }: { leadId: number; evidencia: Evidencia }) {
  return (
    <FormularioAcao
      action={verificacaoEvidenciaAction.bind(null, leadId, evidencia.id)}
      rotulo="Atualizar"
      variante="secundario"
      className="flex flex-wrap items-end gap-2"
    >
      <Seletor
        name="verificacao"
        aria-label="Situação da verificação"
        defaultValue={evidencia.verificacao}
        opcoes={opcoes(VERIFICACOES, ROTULOS_VERIFICACAO)}
      />
    </FormularioAcao>
  );
}

// ---------- Qualificação ----------

export function FormularioQualificacao({
  leadId,
  evidencias,
  vigente,
}: {
  leadId: number;
  evidencias: Evidencia[];
  vigente: Qualificacao | null;
}) {
  const utilizaveis = evidencias.filter((e) => e.verificacao !== "divergente");
  return (
    <FormularioAcao action={qualificarAction.bind(null, leadId)} rotulo="Registrar avaliação">
      {(estado) => (
        <>
          <p className="text-sm text-texto-suave">
            Deixe a nota em branco quando não houver dado suficiente: a dimensão fica como desconhecida (não vale
            zero) e a pontuação fica provisória. Nota acima de zero sem evidência só com confiança baixa.
          </p>
          {DIMENSOES.map((d) => {
            const anterior = vigente?.dimensoes.find((x) => x.chave === d.chave);
            const v = (campo: string, inicial: string) => estado.valores?.[`${campo}_${d.chave}`] ?? inicial;
            return (
              <fieldset key={d.chave} className="flex flex-col gap-3 rounded-controle border border-borda p-4">
                <legend className="px-1 font-semibold">
                  {d.rotulo} <span className="font-normal text-texto-suave">(até {d.maximo})</span>
                </legend>
                <p className="text-[13px] text-texto-suave">{d.ajuda}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[8rem_1fr]">
                  <Campo rotulo="Nota">
                    {(p) => (
                      <input
                        {...p}
                        name={`pontos_${d.chave}`}
                        type="number"
                        min={0}
                        max={d.maximo}
                        step={1}
                        placeholder="?"
                        defaultValue={v("pontos", anterior?.pontos === null || anterior === undefined ? "" : String(anterior.pontos))}
                      />
                    )}
                  </Campo>
                  <Campo rotulo="Confiança">
                    {(p) => (
                      <Seletor
                        {...p}
                        name={`confianca_${d.chave}`}
                        defaultValue={v("confianca", anterior?.confianca ?? "media")}
                        opcoes={opcoes(CONFIANCAS, ROTULOS_CONFIANCA)}
                      />
                    )}
                  </Campo>
                </div>
                <Campo rotulo="Justificativa">
                  {(p) => (
                    <textarea {...p} name={`justificativa_${d.chave}`} rows={2} defaultValue={v("justificativa", anterior?.justificativa ?? "")} />
                  )}
                </Campo>
                {utilizaveis.length > 0 && (
                  <div className="flex flex-col gap-1 text-sm">
                    <span className="text-texto-suave">Evidências usadas</span>
                    {utilizaveis.map((e) => (
                      <label key={e.id} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          name={`evidencias_${d.chave}`}
                          value={e.id}
                          defaultChecked={anterior?.evidenciaIds.includes(e.id)}
                          className="mt-1"
                        />
                        <span>
                          #{e.id} {e.fato}{" "}
                          <span className="text-texto-suave">
                            ({e.natureza === "inferencia" ? "inferência" : ROTULOS_VERIFICACAO[e.verificacao].toLowerCase()})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            );
          })}
          <Campo rotulo="Observações da avaliação">
            {(p) => <textarea {...p} name="observacoes" rows={2} defaultValue={estado.valores?.observacoes ?? ""} />}
          </Campo>
        </>
      )}
    </FormularioAcao>
  );
}

// ---------- Status e bloqueio ----------

export function AcoesStatus({ lead }: { lead: Lead }) {
  if (lead.naoContatar) {
    return (
      <FormularioAcao action={reativarContatoAction.bind(null, lead.id)} rotulo="Remover bloqueio" variante="secundario">
        <Campo rotulo="Por que o bloqueio pode ser removido?" ajuda="Ex.: marcado por engano. Fica registrado no histórico.">
          {(p) => <textarea {...p} name="justificativa" rows={2} required />}
        </Campo>
      </FormularioAcao>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <FormularioAcao
        action={alterarStatusAction.bind(null, lead.id)}
        rotulo="Mudar status"
        variante="secundario"
        className="flex flex-wrap items-end gap-3"
      >
        <Seletor
          name="status"
          aria-label="Status do lead"
          defaultValue={STATUS_MANUAIS.includes(lead.status) ? lead.status : ""}
          placeholder={ROTULOS_STATUS[lead.status]}
          opcoes={STATUS_MANUAIS.map((s) => ({ valor: s, rotulo: ROTULOS_STATUS[s] }))}
        />
      </FormularioAcao>

      <FormularioAcao action={proximaAcaoAction.bind(null, lead.id)} rotulo="Salvar próxima ação" variante="secundario">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
          <Campo rotulo="Próxima ação">
            {(p) => <input {...p} name="proxima_acao" defaultValue={lead.proximaAcao ?? ""} />}
          </Campo>
          <Campo rotulo="Quando">
            {(p) => <input {...p} name="proxima_acao_em" type="date" defaultValue={lead.proximaAcaoEm ?? ""} />}
          </Campo>
        </div>
      </FormularioAcao>

      <details className="rounded-controle border border-borda p-4">
        <summary className="cursor-pointer font-semibold text-perigo">Não contatar mais</summary>
        <div className="mt-4">
          <FormularioAcao action={naoContatarAction.bind(null, lead.id)} rotulo="Bloquear contato" variante="perigo">
            <Campo rotulo="Motivo" ajuda="Bloqueia novas mensagens e descarta as pendentes.">
              {(p) => <textarea {...p} name="motivo" rows={2} required />}
            </Campo>
          </FormularioAcao>
        </div>
      </details>
    </div>
  );
}

// ---------- Resultado do contato ----------

export function FormularioInteracao({ lead }: { lead: Lead }) {
  return (
    <FormularioAcao action={registrarInteracaoAction.bind(null, lead.id)} rotulo="Registrar">
      {(estado) => (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo rotulo="O que aconteceu">
              {(p) => (
                <Seletor
                  {...p}
                  name="tipo"
                  defaultValue={estado.valores?.tipo ?? "resposta"}
                  opcoes={INTERACOES_REGISTRAVEIS.map((t) => ({ valor: t, rotulo: ROTULOS_INTERACAO[t] }))}
                />
              )}
            </Campo>
            <Campo rotulo="Data">
              {(p) => <input {...p} name="ocorrida_em" type="date" defaultValue={estado.valores?.ocorrida_em ?? hoje()} />}
            </Campo>
          </div>
          <Campo rotulo="Resumo">
            {(p) => <textarea {...p} name="resumo" rows={2} defaultValue={estado.valores?.resumo ?? ""} />}
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_11rem]">
            <Campo rotulo="Próxima ação">
              {(p) => <input {...p} name="proxima_acao" defaultValue={estado.valores?.proxima_acao ?? lead.proximaAcao ?? ""} />}
            </Campo>
            <Campo rotulo="Quando">
              {(p) => (
                <input {...p} name="proxima_acao_em" type="date" defaultValue={estado.valores?.proxima_acao_em ?? lead.proximaAcaoEm ?? ""} />
              )}
            </Campo>
          </div>
        </>
      )}
    </FormularioAcao>
  );
}
