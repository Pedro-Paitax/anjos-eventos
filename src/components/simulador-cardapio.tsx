"use client";

import { useEffect, useState } from "react";
import type { CategoriaCardapio, Preparo } from "@/lib/cardapio";
import type { PrecificacaoResultado } from "@/lib/precificacao-cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { SeletorCardapio } from "@/components/seletor-cardapio";
import { calcularPrecificacaoAction } from "@/app/actions/precificacao";
import { calcularTaxaDeslocamento, sugerirQuantidadeGarcom, VALOR_GARCOM_PADRAO } from "@/lib/precificacao-constantes";

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
            return;
          }
          setResultado(resposta.resultado);
        })
        .catch(() => setErro("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculando(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [simulacaoAtiva, preparoIdsSelecionados, numConvidadosNumero, regiaoMetropolitana, qtdGarcons, valorGarcom]);

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
      </section>
    </div>
  );
}
