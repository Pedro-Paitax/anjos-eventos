"use client";

import { useEffect, useState } from "react";
import type { CategoriaCardapio, Preparo } from "@/lib/cardapio";
import type { PrecificacaoResultado } from "@/lib/precificacao-cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { SeletorCardapio } from "@/components/seletor-cardapio";
import { calcularDebugCardapioAction, calcularPrecificacaoAction } from "@/app/actions/precificacao";
import { calcularTaxaDeslocamento, sugerirQuantidadeGarcom, VALOR_GARCOM_PADRAO } from "@/lib/precificacao-constantes";

type ResultadoDebug = Awaited<ReturnType<typeof calcularDebugCardapioAction>>;

const DEBOUNCE_MS = 600;

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SimuladorCardapio({
  preparosPorCategoria,
}: {
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
}) {
  const [numConvidados, setNumConvidados] = useState("");
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(false);
  const [qtdGarcons, setQtdGarcons] = useState("");
  const [valorGarcom, setValorGarcom] = useState(String(VALOR_GARCOM_PADRAO));
  const [preparoIdsSelecionados, setPreparoIdsSelecionados] = useState<number[]>([]);

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
            setErro(resposta.erro);
            setResultado(null);
            setItensExcluidos([]);
            return;
          }
          setResultado(resposta.resultado);
          setItensExcluidos(resposta.itensExcluidos);
        })
        .catch(() => setErro("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculando(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [simulacaoAtiva, preparoIdsSelecionados, numConvidadosNumero, regiaoMetropolitana, qtdGarcons, valorGarcom]);

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
          Puxando da base de fichas técnicas do NocoDB.
        </p>
        <SeletorCardapio
          preparosPorCategoria={preparosPorCategoria}
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
          <p className="text-sm text-paper-dim">Calculando…</p>
        )}
        {erro && <p className="text-sm text-ember">{erro}</p>}
        {simulacaoAtiva && itensExcluidos.length > 0 && (
          <div className="rounded-[2px] border border-ember/40 bg-ember/10 p-3 text-sm text-ember">
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
          </div>
        )}

        {simulacaoAtiva && resultado && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <p className={rotuloClasse}>Por pessoa</p>
              <p className="font-display text-2xl italic text-paper">
                {formatarMoeda(resultado.valor_sugerido_por_pessoa)}
              </p>
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
    return <p className="text-sm text-paper-dim">Calculando o passo a passo…</p>;
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
            <tr className="border-b border-paper-ink/15 text-left text-paper-ink/60">
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
                  {linha.peso} <span className="text-paper-ink/60">({linha.origemPeso})</span>
                </td>
                <td className="px-3 py-2">{linha.somaPesosGrupo}</td>
                <td className="px-3 py-2">
                  {linha.porcaoCalculada} → {linha.porcaoFinal}
                  {linha.limitadaPorHardCap && (
                    <span className="ml-1 text-paper-ink/60">
                      (Hard Cap {linha.porcaoMaximaIndividual})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {linha.volumeNecessarioTotal} {linha.unidadeMacro}
                  {linha.quantidadeParaCusto !== linha.volumeNecessarioTotal && (
                    <span className="text-paper-ink/60">
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
