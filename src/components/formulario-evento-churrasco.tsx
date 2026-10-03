"use client";

import { useEffect, useState } from "react";
import type { Evento } from "@/lib/eventos";
import type { Preparo, CategoriaCardapio } from "@/lib/cardapio";
import {
  paraInputDatetimeLocal,
  paraInputDate,
  paraInputTime,
} from "@/lib/formatacao";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import {
  SeletorCardapio,
  paraValoresIniciaisCardapio,
  type ValoresIniciaisCardapio,
} from "@/components/seletor-cardapio";
import { calcularPrecificacaoEventoAction } from "@/app/actions/precificacao";
import { obterItensCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import {
  calcularTaxaDeslocamento,
  sugerirQuantidadeGarcom,
  sugerirQuantidadeAssador,
  VALOR_GARCOM_PADRAO,
} from "@/lib/precificacao-constantes";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

const DEBOUNCE_MS = 600;

/**
 * Payload de fail-hard (docs/DECISOES.md, "Política de Falha do Motor de
 * Cálculo") tem `mensagem` amigável separada de `erro` (que ali é o código
 * "falha_calculo", não texto pra exibir) — os demais erros usam `erro` como
 * a própria mensagem, igual sempre foi.
 */
function mensagemDeErro(resposta: { erro: string; mensagem?: string }): string {
  return resposta.mensagem ?? resposta.erro;
}

type FormularioEventoChurrascoProps = {
  empresaId: number;
  valoresIniciais?: Evento;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  cardapiosModelo: CardapioModeloResumo[];
  /**
   * Cardápio confirmado via Orçamento (docs/PENDENCIAS_NOTURNAS.md, "Máquina
   * de Estados Orçamento → Evento Confirmado") — quando presente, o cardápio
   * vira somente-leitura aqui (trocar item exige um novo Orçamento). Null =
   * evento sem snapshot (ex.: legado), cai no seletor editável de sempre.
   */
  cardapioConfirmado?: { preparoId: number; preparoNome: string }[] | null;
  action: (formData: FormData) => void;
  rotuloEnvio: string;
};

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

export function FormularioEventoChurrasco({
  empresaId,
  valoresIniciais,
  preparosPorCategoria,
  cardapiosModelo,
  cardapioConfirmado,
  action,
  rotuloEnvio,
}: FormularioEventoChurrascoProps) {
  const [qtdAdultos, setQtdAdultos] = useState(
    valoresIniciais?.qtd_adultos?.toString() ?? ""
  );
  const [qtdCriancasAte5, setQtdCriancasAte5] = useState(
    valoresIniciais?.qtd_criancas_ate_5?.toString() ?? ""
  );
  const [qtdCriancas5a10, setQtdCriancas5a10] = useState(
    valoresIniciais?.qtd_criancas_5_a_10?.toString() ?? ""
  );
  const [qtdGarcons, setQtdGarcons] = useState(
    valoresIniciais?.qtd_garcons?.toString() ?? ""
  );
  const [precoPessoa, setPrecoPessoa] = useState(
    valoresIniciais?.preco_pessoa?.toString() ?? ""
  );
  const [precoCriancaMeia, setPrecoCriancaMeia] = useState(
    valoresIniciais?.preco_crianca_meia?.toString() ?? ""
  );
  // Valor Sugerido Total vem sempre do servidor (calcularPrecificacaoEventoAction,
  // com meia-entrada de criança já aplicada) — nunca recalculado no client,
  // pra não duplicar a lógica em dois lugares (docs/DECISOES.md, decisão do
  // Pedro de 2026-09-08).
  const [valorSugeridoTotal, setValorSugeridoTotal] = useState(0);
  const [valorGarcom, setValorGarcom] = useState(
    valoresIniciais?.valor_garcom?.toString() ?? String(VALOR_GARCOM_PADRAO)
  );
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(
    valoresIniciais?.regiao_metropolitana_curitiba ?? false
  );
  const [preparoIdsSelecionados, setPreparoIdsSelecionados] = useState<number[]>([]);

  // "Começar de um Cardápio Pré-Montado": só pré-popula o seletor (via
  // remount, trocando a key) — não cria vínculo permanente com o cardápio
  // modelo. O usuário pode livremente adicionar/remover itens depois.
  const [cardapioBase, setCardapioBase] = useState<ValoresIniciaisCardapio | undefined>(
    undefined
  );
  const [chaveSeletorCardapio, setChaveSeletorCardapio] = useState(0);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);
  const [erroTemplate, setErroTemplate] = useState<string | null>(null);

  // Preço fixo do Cardápio Modelo selecionado (Preco_Fixo_Por_Pessoa), quando
  // houver — pré-preenche "Preço por pessoa" no lugar do valor dinâmico, uma
  // única vez ao aplicar o template. Continua editável; o recálculo dinâmico
  // do servidor (abaixo) para de sobrescrever o campo enquanto este estiver
  // preenchido. Intencionalmente simples: nenhuma lógica de tolerância/quebra
  // de pacote ao editar itens depois (docs/REGRAS_NEGOCIO.md, seção 4 — fora
  // de escopo desta etapa).
  const [precoFixoSelecionado, setPrecoFixoSelecionado] = useState<number | null>(null);

  async function aplicarTemplate(idTexto: string) {
    const id = Number(idTexto);
    if (!id) return;

    setAplicandoTemplate(true);
    setErroTemplate(null);
    try {
      const resposta = await obterItensCardapioModeloAction(id);
      if ("erro" in resposta) {
        setErroTemplate(resposta.erro);
        return;
      }
      setCardapioBase(paraValoresIniciaisCardapio(resposta.preparoIds, preparosPorCategoria));
      setChaveSeletorCardapio((k) => k + 1);

      const cardapioSelecionado = cardapiosModelo.find((c) => c.id === id);
      if (cardapioSelecionado?.precoFixoPorPessoa != null) {
        setPrecoPessoa(String(cardapioSelecionado.precoFixoPorPessoa));
        setPrecoFixoSelecionado(cardapioSelecionado.precoFixoPorPessoa);
      } else {
        setPrecoFixoSelecionado(null);
      }
    } catch {
      setErroTemplate("Falha ao carregar o cardápio pré-montado.");
    } finally {
      setAplicandoTemplate(false);
    }
  }

  const numConvidados =
    paraNumero(qtdAdultos) + paraNumero(qtdCriancasAte5) + paraNumero(qtdCriancas5a10);
  const quantidadeGarcomSugerida = numConvidados > 0 ? sugerirQuantidadeGarcom(numConvidados) : 0;
  const taxaDeslocamento = calcularTaxaDeslocamento(regiaoMetropolitana);

  // Valor Sugerido por Pessoa/Criança vêm do cálculo do servidor (motor de
  // dimensionamento + motor de custo, com debounce — docs/DECISOES.md,
  // "Precificação por Cardápio..."). Custo_Cardapio, Copeira e Assador NUNCA
  // aparecem aqui, são internos ao Motor de Margem.
  const [calculandoPrecificacao, setCalculandoPrecificacao] = useState(false);
  const [erroPrecificacao, setErroPrecificacao] = useState<string | null>(null);
  // Itens que o motor descartou do cálculo (peso/macro-categoria/custo não
  // configurados) — precisa ficar visível, nunca só silenciosamente sumir
  // do preço. Achado em 2026-09-09 (docs/PENDENCIAS_NOTURNAS.md): um
  // cardápio de teste teve mais da metade dos itens excluídos sem nenhum
  // aviso, o que mascarou um valor sugerido completamente errado.
  const [itensExcluidos, setItensExcluidos] = useState<{ preparo: string; motivo: string }[]>([]);

  const precificacaoAtiva = preparoIdsSelecionados.length > 0 && numConvidados > 0;

  useEffect(() => {
    if (!precificacaoAtiva) return;

    const timer = setTimeout(() => {
      setCalculandoPrecificacao(true);
      setErroPrecificacao(null);
      calcularPrecificacaoEventoAction({
        preparoIds: preparoIdsSelecionados,
        numConvidados,
        regiaoMetropolitanaCuritiba: regiaoMetropolitana,
        quantidadeGarcom: paraNumero(qtdGarcons) || undefined,
        valorGarcom: paraNumero(valorGarcom) || undefined,
        distribuicaoConvidados: {
          adultos: paraNumero(qtdAdultos),
          criancasAte5: paraNumero(qtdCriancasAte5),
          criancas5a10: paraNumero(qtdCriancas5a10),
        },
      })
        .then((resposta) => {
          if ("erro" in resposta) {
            setErroPrecificacao(mensagemDeErro(resposta));
            setItensExcluidos([]);
            return;
          }
          // Preço fixo do Cardápio Modelo prevalece sobre o valor dinâmico —
          // pré-preenchido uma vez em aplicarTemplate, não sobrescrito aqui.
          if (precoFixoSelecionado == null) {
            setPrecoPessoa(String(resposta.resultado.valor_sugerido_por_pessoa));
          }
          setPrecoCriancaMeia(String(resposta.resultado.valor_sugerido_crianca));
          setValorSugeridoTotal(resposta.resultado.valor_sugerido_total_evento);
          setItensExcluidos(resposta.itensExcluidos);
        })
        .catch(() => setErroPrecificacao("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculandoPrecificacao(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    precificacaoAtiva,
    preparoIdsSelecionados,
    numConvidados,
    regiaoMetropolitana,
    qtdGarcons,
    valorGarcom,
    qtdAdultos,
    qtdCriancasAte5,
    qtdCriancas5a10,
    precoFixoSelecionado,
  ]);

  const valorSugeridoTotalFormatado = valorSugeridoTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

      {/* Dados do cliente */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>

        <Campo rotulo="Cliente">
          {(p) => (
            <input {...p}
              name="cliente"
              type="text"
              required
              defaultValue={valoresIniciais?.cliente}
            />
          )}
        </Campo>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Contato (se diferente do cliente)">
            {(p) => (
              <input {...p}
                name="contato"
                type="text"
                defaultValue={valoresIniciais?.contato ?? ""}
              />
            )}
          </Campo>
          <Campo rotulo="Celular">
            {(p) => (
              <input {...p}
                name="telefone"
                type="text"
                defaultValue={valoresIniciais?.telefone ?? ""}
              />
            )}
          </Campo>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Endereço do evento">
            {(p) => (
              <input {...p}
                name="enderecoEvento"
                type="text"
                defaultValue={valoresIniciais?.endereco_evento ?? ""}
              />
            )}
          </Campo>
          <Campo rotulo="Tipo de evento">
            {(p) => (
              <input {...p}
                name="tipoEvento"
                type="text"
                placeholder="Casamento, aniversário, corporativo..."
                defaultValue={valoresIniciais?.tipo_evento ?? ""}
              />
            )}
          </Campo>
        </div>
      </section>

      {/* Datas e horários */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>

        <Campo rotulo="Data e hora">
          {(p) => (
            <input {...p}
              name="dataEvento"
              type="datetime-local"
              required
              defaultValue={
                valoresIniciais
                  ? paraInputDatetimeLocal(valoresIniciais.data_evento)
                  : undefined
              }
            />
          )}
        </Campo>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Campo rotulo="Chegada da equipe">
            {(p) => (
              <input {...p}
                name="horaChegadaEquipe"
                type="time"
                defaultValue={
                  valoresIniciais?.hora_chegada_equipe
                    ? paraInputTime(valoresIniciais.hora_chegada_equipe)
                    : ""
                }
              />
            )}
          </Campo>
          <Campo rotulo="Aperitivo">
            {(p) => (
              <input {...p}
                name="horaAperitivo"
                type="time"
                defaultValue={
                  valoresIniciais?.hora_aperitivo
                    ? paraInputTime(valoresIniciais.hora_aperitivo)
                    : ""
                }
              />
            )}
          </Campo>
          <Campo rotulo="Almoço">
            {(p) => (
              <input {...p}
                name="horaAlmoco"
                type="time"
                defaultValue={
                  valoresIniciais?.hora_almoco
                    ? paraInputTime(valoresIniciais.hora_almoco)
                    : ""
                }
              />
            )}
          </Campo>
          <Campo rotulo="Limpeza/encerramento">
            {(p) => (
              <input {...p}
                name="horaEncerramento"
                type="time"
                defaultValue={
                  valoresIniciais?.hora_encerramento
                    ? paraInputTime(valoresIniciais.hora_encerramento)
                    : ""
                }
              />
            )}
          </Campo>
        </div>
      </section>

      {/* Convidados */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdAdultos" className={rotuloClasse}>
              Adultos
            </label>
            <input
              id="qtdAdultos"
              name="qtdAdultos"
              type="number"
              min={0}
              value={qtdAdultos}
              onChange={(e) => setQtdAdultos(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdCriancasAte5" className={rotuloClasse}>
              Crianças até 5 anos
            </label>
            <input
              id="qtdCriancasAte5"
              name="qtdCriancasAte5"
              type="number"
              min={0}
              value={qtdCriancasAte5}
              onChange={(e) => setQtdCriancasAte5(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdCriancas5a10" className={rotuloClasse}>
              Crianças de 5 a 10 anos
            </label>
            <input
              id="qtdCriancas5a10"
              name="qtdCriancas5a10"
              type="number"
              min={0}
              value={qtdCriancas5a10}
              onChange={(e) => setQtdCriancas5a10(e.target.value)}
              className={campoClasse}
            />
          </div>

          <div className="flex flex-col justify-end gap-1.5">
            <label htmlFor="qtdFornecedores" className={rotuloClasse}>
              Fornecedores
            </label>
            <input
              id="qtdFornecedores"
              name="qtdFornecedores"
              type="number"
              min={0}
              defaultValue={valoresIniciais?.qtd_fornecedores ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Cardápio */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Cardápio</h3>

        {cardapioConfirmado && cardapioConfirmado.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-[2px] border border-paper-dim/20 bg-ink-soft p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-paper-dim/70">
              Cardápio confirmado via Orçamento — somente leitura
            </p>
            <p className="text-xs text-paper-dim">
              Trocar item exige um novo Orçamento (Máquina de Estados
              Orçamento → Evento Confirmado).
            </p>
            <ul className="list-disc pl-5 text-sm text-paper">
              {cardapioConfirmado.map((item) => (
                <li key={item.preparoId}>{item.preparoNome}</li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="text-sm text-paper-dim">
              Puxando da base de fichas técnicas.
            </p>

            {cardapiosModelo.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cardapioModeloBase" className={rotuloClasse}>
                  Começar de um Cardápio Pré-Montado (opcional)
                </label>
                <select
                  id="cardapioModeloBase"
                  defaultValue=""
                  disabled={aplicandoTemplate}
                  onChange={(e) => aplicarTemplate(e.target.value)}
                  className={campoClasse}
                >
                  <option value="">— Selecionar —</option>
                  {cardapiosModelo.map((cardapio) => (
                    <option key={cardapio.id} value={cardapio.id}>
                      {cardapio.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-paper-dim">
                  Só pré-preenche os itens abaixo — você ainda pode adicionar ou
                  remover livremente.
                </p>
                {erroTemplate && <Alerta tipo="perigo">{erroTemplate}</Alerta>}
              </div>
            )}

            <SeletorCardapio
              key={chaveSeletorCardapio}
              preparosPorCategoria={preparosPorCategoria}
              valoresIniciais={cardapioBase ?? valoresIniciais}
              onSelecaoIdsChange={setPreparoIdsSelecionados}
            />
          </>
        )}
      </section>

      {/* Região / deslocamento */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Deslocamento</h3>

        <label className="flex items-center gap-2 text-sm text-paper">
          <input
            type="checkbox"
            checked={regiaoMetropolitana}
            onChange={(e) => setRegiaoMetropolitana(e.target.checked)}
          />
          Região Metropolitana de Curitiba?
        </label>
        <input type="hidden" name="regiaoMetropolitanaCuritiba" value={String(regiaoMetropolitana)} />
        <p className="text-sm text-paper-dim">
          Taxa de deslocamento:{" "}
          {taxaDeslocamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </section>

      {/* Valores */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valores</h3>
        <p className="text-sm text-paper-dim">
          {calculandoPrecificacao
            ? "Calculando valor sugerido a partir do cardápio…"
            : precoFixoSelecionado != null
              ? "Preço por pessoa pré-preenchido com o preço fixo do Cardápio Pré-Montado selecionado — editável."
              : "Preço por pessoa e preço criança meia vêm do custo real do cardápio selecionado (+ 40%) — pré-preenchidos, mas editáveis."}
        </p>
        {precificacaoAtiva && erroPrecificacao && (
          <Alerta tipo="perigo">{erroPrecificacao}</Alerta>
        )}
        {precificacaoAtiva && itensExcluidos.length > 0 && (
          <Alerta tipo="aviso">
            <p className="font-medium">
              Atenção: {itensExcluidos.length}{" "}
              {itensExcluidos.length === 1 ? "item selecionado não entrou" : "itens selecionados não entraram"}{" "}
              no cálculo do Valor Sugerido — o preço acima NÃO reflete o cardápio inteiro:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {itensExcluidos.map((item) => (
                <li key={item.preparo}>
                  {item.preparo} — {item.motivo}
                </li>
              ))}
            </ul>
          </Alerta>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Preço por pessoa (R$) — Valor Sugerido">
            {(p) => (
              <input {...p}
                name="precoPessoa"
                type="number"
                min={0}
                step="0.01"
                value={precoPessoa}
                onChange={(e) => setPrecoPessoa(e.target.value)}
              />
            )}
          </Campo>

          <Campo rotulo="Preço criança meia (R$)">
            {(p) => (
              <input {...p}
                name="precoCriancaMeia"
                type="number"
                min={0}
                step="0.01"
                value={precoCriancaMeia}
                onChange={(e) => setPrecoCriancaMeia(e.target.value)}
              />
            )}
          </Campo>

          <Campo rotulo="Valor por garçom (R$)">
            {(p) => (
              <input {...p}
                name="valorGarcom"
                type="number"
                min={0}
                step="0.01"
                value={valorGarcom}
                onChange={(e) => setValorGarcom(e.target.value)}
              />
            )}
          </Campo>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorSugerido" className={rotuloClasse}>
              Valor Sugerido Total (R$)
            </label>
            <input
              id="valorSugerido"
              type="text"
              readOnly
              disabled
              value={valorSugeridoTotalFormatado}
              title="Calculado pelo servidor: adultos pagam o preço cheio por pessoa, crianças pagam meia-entrada, mais garçom e taxa de deslocamento. Apenas referência."
              className={`${campoClasse} cursor-not-allowed text-paper-dim`}
            />
          </div>

          <Campo rotulo="Valor total do evento (R$)">
            {(p) => (
              <input {...p}
                name="valor"
                type="number"
                min={0}
                step="0.01"
                defaultValue={valoresIniciais?.valor ?? ""}
              />
            )}
          </Campo>
        </div>
      </section>

      {/* Serviços */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Campo rotulo="Quantidade de garçons">
            {(p) => (
              <input {...p}
                name="qtdGarcons"
                type="number"
                min={0}
                placeholder={numConvidados > 0 ? String(quantidadeGarcomSugerida) : ""}
                value={qtdGarcons}
                onChange={(e) => setQtdGarcons(e.target.value)}
              />
            )}
          </Campo>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdChurrasqueiros" className={rotuloClasse}>
              Quantidade de assadores
            </label>
            <input
              id="qtdChurrasqueiros"
              type="text"
              readOnly
              disabled
              value={
                numConvidados > 0
                  ? `${sugerirQuantidadeAssador(numConvidados)} (calculado — uso interno)`
                  : "—"
              }
              title="Calculado automaticamente (1 a cada 100 convidados) — registrado para a futura Margem Real (ainda não calculada), não editável."
              className={`${campoClasse} cursor-not-allowed text-paper-dim`}
            />
          </div>
          <Campo rotulo="Quantidade de copeiras">
            {(p) => (
              <input {...p}
                name="qtdCopeiras"
                type="number"
                min={0}
                defaultValue={valoresIniciais?.qtd_copeiras ?? ""}
              />
            )}
          </Campo>
        </div>
      </section>

      {/* Financeiro / observações */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Prazo de pagamento">
            {(p) => (
              <input {...p}
                name="prazoPagamento"
                type="date"
                defaultValue={
                  valoresIniciais?.prazo_pagamento
                    ? paraInputDate(valoresIniciais.prazo_pagamento)
                    : ""
                }
              />
            )}
          </Campo>
          <Campo rotulo="Chave PIX">
            {(p) => (
              <input {...p}
                name="chavePix"
                type="text"
                defaultValue={valoresIniciais?.chave_pix ?? ""}
              />
            )}
          </Campo>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="observacoes" className={rotuloClasse}>
            Observações gerais
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={valoresIniciais?.observacoes ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      {/* Status */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Status</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Status">
            {(p) => (
              <select {...p}
                name="status"
                defaultValue={valoresIniciais?.status ?? "orcado"}
              >
                <option value="orcado">Orçado</option>
                <option value="confirmado">Confirmado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            )}
          </Campo>
        </div>
      </section>

      {/* Contrato */}
      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <p className="text-sm text-paper-dim">
          Cadastro manual — a extração automática de contrato (upload de PDF)
          vem numa etapa futura.
        </p>
        <Campo rotulo="Caminho do contrato (opcional)">
          {(p) => (
            <input {...p}
              name="caminhoContrato"
              type="text"
              placeholder="/uploads/contratos/senhor-churrasco/arquivo.pdf"
              defaultValue={valoresIniciais?.caminho_contrato ?? ""}
            />
          )}
        </Campo>
      </section>

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
