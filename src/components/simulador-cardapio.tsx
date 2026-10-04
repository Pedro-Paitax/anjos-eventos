"use client";

import { useEffect, useState } from "react";
import type { CategoriaCardapio, Preparo } from "@/lib/cardapio";
import type { PrecificacaoResultado } from "@/lib/precificacao-cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import {
  SeletorCardapio,
  paraValoresIniciaisCardapio,
  type ValoresIniciaisCardapio,
} from "@/components/seletor-cardapio";
import { calcularDebugCardapioAction, calcularPrecificacaoAction } from "@/app/actions/precificacao";
import { obterItensCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import { calcularTaxaDeslocamento, sugerirQuantidadeGarcom, VALOR_GARCOM_PADRAO } from "@/lib/precificacao-constantes";
import { Alerta } from "@/components/alerta";

type ResultadoDebug = Awaited<ReturnType<typeof calcularDebugCardapioAction>>;

const DEBOUNCE_MS = 600;

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Payload de fail-hard (docs/DECISOES.md, "Política de Falha do Motor de
 * Cálculo") tem `mensagem` amigável separada de `erro` (que ali é o código
 * "falha_calculo", não texto pra exibir) — os demais erros usam `erro` como
 * a própria mensagem, igual sempre foi.
 */
function mensagemDeErro(resposta: { erro: string; mensagem?: string }): string {
  return resposta.mensagem ?? resposta.erro;
}

export function SimuladorCardapio({
  preparosPorCategoria,
  cardapiosModelo,
}: {
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  cardapiosModelo: CardapioModeloResumo[];
}) {
  const [numConvidados, setNumConvidados] = useState("");
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(false);
  const [qtdGarcons, setQtdGarcons] = useState("");
  const [valorGarcom, setValorGarcom] = useState(String(VALOR_GARCOM_PADRAO));
  const [preparoIdsSelecionados, setPreparoIdsSelecionados] = useState<number[]>([]);

  // "Começar de um Cardápio Pré-Montado": mesmo padrão do Criar Evento — só
  // pré-popula o seletor (via remount, trocando a key), sem vínculo
  // permanente. Ver formulario-evento-churrasco.tsx pro mesmo mecanismo.
  const [cardapioBase, setCardapioBase] = useState<ValoresIniciaisCardapio | undefined>(
    undefined
  );
  const [chaveSeletorCardapio, setChaveSeletorCardapio] = useState(0);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);
  const [erroTemplate, setErroTemplate] = useState<string | null>(null);

  // Preço por pessoa editável — pré-preenchido pelo cálculo dinâmico do
  // servidor, ou pelo Preco_Fixo_Por_Pessoa do Cardápio Modelo selecionado,
  // quando houver (docs/REGRAS_NEGOCIO.md, seção 4). Intencionalmente
  // simples: sem lógica de tolerância/quebra de pacote ao editar itens
  // depois — fora de escopo desta etapa.
  const [precoPessoa, setPrecoPessoa] = useState("");
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

  const [resultado, setResultado] = useState<PrecificacaoResultado | null>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Itens que o motor descartou do cálculo — precisa ficar visível, nunca
  // só silenciosamente sumir do preço (docs/PENDENCIAS_NOTURNAS.md,
  // achado de 2026-09-09).
  const [itensExcluidos, setItensExcluidos] = useState<{ preparo: string; motivo: string }[]>([]);

  // "Ver cálculos" — diagnóstico do que está selecionado agora na tela
  // (docs/PENDENCIAS_NOTURNAS.md, bug de mistura de unidades). Recalculado
  // no clique, não fica preso ao resultado do debounce anterior.
  const [mostrarCalculos, setMostrarCalculos] = useState(false);
  const [debugResultado, setDebugResultado] = useState<ResultadoDebug | null>(null);
  const [calculandoDebug, setCalculandoDebug] = useState(false);

  const numConvidadosNumero = paraNumero(numConvidados);
  const quantidadeGarcomSugerida =
    numConvidadosNumero > 0 ? sugerirQuantidadeGarcom(numConvidadosNumero) : 0;
  const taxaDeslocamento = calcularTaxaDeslocamento(regiaoMetropolitana);

  const simulacaoAtiva = preparoIdsSelecionados.length > 0 && numConvidadosNumero > 0;

  useEffect(() => {
    if (!simulacaoAtiva) return;

    const timer = setTimeout(() => {
      setCalculando(true);
      setErro(null);
      calcularPrecificacaoAction({
        preparoIds: preparoIdsSelecionados,
        numConvidados: numConvidadosNumero,
        regiaoMetropolitanaCuritiba: regiaoMetropolitana,
        quantidadeGarcom: paraNumero(qtdGarcons) || undefined,
        valorGarcom: paraNumero(valorGarcom) || undefined,
      })
        .then((resposta) => {
          if ("erro" in resposta) {
            setErro(mensagemDeErro(resposta));
            setResultado(null);
            setItensExcluidos([]);
            return;
          }
          setResultado(resposta.resultado);
          setItensExcluidos(resposta.itensExcluidos);
          // Preço fixo do Cardápio Modelo prevalece sobre o valor dinâmico —
          // pré-preenchido uma vez em aplicarTemplate, não sobrescrito aqui.
          if (precoFixoSelecionado == null) {
            setPrecoPessoa(String(resposta.resultado.valor_sugerido_por_pessoa));
          }
        })
        .catch(() => setErro("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculando(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    simulacaoAtiva,
    preparoIdsSelecionados,
    numConvidadosNumero,
    regiaoMetropolitana,
    qtdGarcons,
    valorGarcom,
    precoFixoSelecionado,
  ]);

  async function alternarCalculos() {
    if (mostrarCalculos) {
      setMostrarCalculos(false);
      return;
    }

    setMostrarCalculos(true);
    setCalculandoDebug(true);
    try {
      const resposta = await calcularDebugCardapioAction({
        preparoIds: preparoIdsSelecionados,
        numConvidados: numConvidadosNumero,
        regiaoMetropolitanaCuritiba: regiaoMetropolitana,
        quantidadeGarcom: paraNumero(qtdGarcons) || undefined,
        valorGarcom: paraNumero(valorGarcom) || undefined,
      });
      setDebugResultado(resposta);
    } finally {
      setCalculandoDebug(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Convidados */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label htmlFor="numConvidados" className={rotuloClasse}>
            Número de convidados
          </label>
          <input
            id="numConvidados"
            type="number"
            min={0}
            value={numConvidados}
            onChange={(e) => setNumConvidados(e.target.value)}
            className={campoClasse}
          />
        </div>
      </section>

      {/* Cardápio */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Cardápio</h3>
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
          valoresIniciais={cardapioBase}
          onSelecaoIdsChange={setPreparoIdsSelecionados}
        />
      </section>

      {/* Deslocamento */}
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
        <p className="text-sm text-paper-dim">
          Taxa de deslocamento: {formatarMoeda(taxaDeslocamento)}
        </p>
      </section>

      {/* Serviços */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdGarcons" className={rotuloClasse}>
              Quantidade de garçons
            </label>
            <input
              id="qtdGarcons"
              type="number"
              min={0}
              placeholder={numConvidadosNumero > 0 ? String(quantidadeGarcomSugerida) : ""}
              value={qtdGarcons}
              onChange={(e) => setQtdGarcons(e.target.value)}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valorGarcom" className={rotuloClasse}>
              Valor por garçom (R$)
            </label>
            <input
              id="valorGarcom"
              type="number"
              min={0}
              step="0.01"
              value={valorGarcom}
              onChange={(e) => setValorGarcom(e.target.value)}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Resultado */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valor Sugerido</h3>

        {!simulacaoAtiva && (
          <p className="text-sm text-paper-dim">
            Informe o número de convidados e selecione ao menos um item do
            cardápio pra calcular.
          </p>
        )}
        {simulacaoAtiva && calculando && (
          <p role="status" aria-live="polite" className="text-sm text-paper-dim">Calculando…</p>
        )}
        {erro && <Alerta tipo="perigo">{erro}</Alerta>}
        {simulacaoAtiva && itensExcluidos.length > 0 && (
          <Alerta tipo="aviso">
            <p className="font-medium">
              Atenção: {itensExcluidos.length}{" "}
              {itensExcluidos.length === 1 ? "item selecionado não entrou" : "itens selecionados não entraram"}{" "}
              no cálculo — o valor acima NÃO reflete o cardápio inteiro:
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

        {simulacaoAtiva && resultado && (
          <p className="text-sm text-paper-dim">
            {precoFixoSelecionado != null
              ? "Preço por pessoa pré-preenchido com o preço fixo do Cardápio Pré-Montado selecionado — editável."
              : "Preço por pessoa vem do custo real do cardápio selecionado (+ 40%) — pré-preenchido, mas editável."}
          </p>
        )}

        {simulacaoAtiva && resultado && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <p className={rotuloClasse}>Custo por Pessoa</p>
              <p className="font-display text-2xl italic text-paper-dim">
                {formatarMoeda(resultado.custo_cardapio_por_pessoa)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="precoPessoa" className={rotuloClasse}>
                Preço por pessoa (R$)
              </label>
              <input
                id="precoPessoa"
                type="number"
                min={0}
                step="0.01"
                value={precoPessoa}
                onChange={(e) => setPrecoPessoa(e.target.value)}
                className={campoClasse}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className={rotuloClasse}>Criança (meia)</p>
              <p className="font-display text-2xl italic text-paper">
                {formatarMoeda(resultado.valor_sugerido_crianca)}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className={rotuloClasse}>Total do evento</p>
              <p className="font-display text-2xl italic text-paper">
                {formatarMoeda(resultado.valor_sugerido_total_evento)}
              </p>
            </div>
          </div>
        )}

        {simulacaoAtiva && resultado && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={alternarCalculos}
              className="self-start rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm text-paper-dim transition hover:border-paper-dim hover:text-paper"
            >
              {mostrarCalculos ? "Ocultar cálculos" : "Ver cálculos"}
            </button>

            {mostrarCalculos && (
              <PainelCalculos resultado={debugResultado} carregando={calculandoDebug} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function PainelCalculos({
  resultado,
  carregando,
}: {
  resultado: ResultadoDebug | null;
  carregando: boolean;
}) {
  if (carregando) {
    return <p role="status" aria-live="polite" className="text-sm text-paper-dim">Calculando o passo a passo…</p>;
  }
  if (!resultado) return null;
  if ("erro" in resultado) {
    return (
      <p className="rounded-[2px] border border-red-500/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
        Erro ({resultado.status}): {resultado.erro}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-paper-dim">
        Passo a passo do que <code className="text-paper">distribuirPorcoes</code> e{" "}
        <code className="text-paper">calcularPrecificacaoCardapio</code> calculam pra cada item
        selecionado acima — nenhuma fórmula diferente da usada no valor sugerido.
      </p>

      <div className="overflow-x-auto rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-paper-ink/15 text-left text-texto-suave-papel">
              <th className="px-3 py-2 font-normal">Preparo</th>
              <th className="px-3 py-2 font-normal">Macro (unidade)</th>
              <th className="px-3 py-2 font-normal">Unid. rendimento preparo</th>
              <th className="px-3 py-2 font-normal">Peso (origem)</th>
              <th className="px-3 py-2 font-normal">Soma pesos grupo</th>
              <th className="px-3 py-2 font-normal">Porção calc. → final</th>
              <th className="px-3 py-2 font-normal">Volume total</th>
              <th className="px-3 py-2 font-normal">Rendimento</th>
              <th className="px-3 py-2 font-normal">Custo/unid. rend.</th>
              <th className="px-3 py-2 font-normal">Custo total item</th>
            </tr>
          </thead>
          <tbody>
            {resultado.linhas.map((linha) => (
              <tr
                key={linha.preparoId}
                className={
                  linha.unidadeDivergente
                    ? "border-b border-paper-ink/10 bg-red-600/15 text-red-900"
                    : "border-b border-paper-ink/10"
                }
              >
                <td className="px-3 py-2 font-medium">{linha.preparoNome}</td>
                <td className="px-3 py-2">
                  {linha.macroCategoriaNome} ({linha.unidadeMacro})
                </td>
                <td className="px-3 py-2">
                  {linha.unidadeRendimentoPreparo}
                  {linha.unidadeDivergente && (
                    <span className="ml-1 font-semibold text-red-700">≠ unidade da macro</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {linha.peso} <span className="text-texto-suave-papel">({linha.origemPeso})</span>
                </td>
                <td className="px-3 py-2">{linha.somaPesosGrupo}</td>
                <td className="px-3 py-2">
                  {linha.porcaoCalculada} → {linha.porcaoFinal}
                  {linha.limitadaPorHardCap && (
                    <span className="ml-1 text-texto-suave-papel">
                      (Hard Cap {linha.porcaoMaximaIndividual})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {linha.volumeNecessarioTotal} {linha.unidadeMacro}
                  {linha.quantidadeParaCusto !== linha.volumeNecessarioTotal && (
                    <span className="text-texto-suave-papel">
                      {" "}
                      → {linha.quantidadeParaCusto} un (convertido)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{linha.rendimento}</td>
                <td className="px-3 py-2">R$ {linha.custoPorUnidadeRendimento.toFixed(2)}</td>
                <td className="px-3 py-2 font-medium">R$ {linha.custoTotalItem.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado.itensExcluidos.length > 0 && (
        <div className="rounded-[2px] border border-paper-dim/20 bg-ink-soft/60 p-4">
          <p className="mb-2 text-sm text-paper-dim">Itens excluídos do cálculo</p>
          <ul className="flex flex-col gap-1 text-sm text-paper">
            {resultado.itensExcluidos.map((item) => (
              <li key={item.preparo}>
                <span className="font-medium">{item.preparo}</span> — {item.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
