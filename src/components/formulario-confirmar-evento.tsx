"use client";

import { useEffect, useState } from "react";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { calcularPrecificacaoEventoAction } from "@/app/actions/precificacao";
import type { OrcamentoResumo } from "@/lib/orcamentos";
import {
  calcularTaxaDeslocamento,
  sugerirQuantidadeGarcom,
  sugerirQuantidadeAssador,
  VALOR_GARCOM_PADRAO,
} from "@/lib/precificacao-constantes";

function mensagemDeErro(resposta: { erro: string; mensagem?: string }): string {
  return resposta.mensagem ?? resposta.erro;
}

type FormularioConfirmarEventoProps = {
  orcamento: OrcamentoResumo;
  action: (formData: FormData) => void;
};

/**
 * Passo 3 da Máquina de Estados — coleta os dados operacionais/logísticos
 * (não coletados no Orçamento) e, pra Senhor Churrasco, recalcula o Valor
 * Sugerido em tempo real a partir do cardápio JÁ FIXADO no Orçamento
 * (itens não são mais editáveis aqui — trocar item exige um novo Orçamento).
 */
export function FormularioConfirmarEvento({ orcamento, action }: FormularioConfirmarEventoProps) {
  const ehChurrasco = orcamento.itens.length > 0;
  const preparoIds = orcamento.itens.map((i) => i.preparoId);

  const [qtdGarcons, setQtdGarcons] = useState("");
  const [precoPessoa, setPrecoPessoa] = useState("");
  const [precoCriancaMeia, setPrecoCriancaMeia] = useState("");
  const [valorSugeridoTotal, setValorSugeridoTotal] = useState(0);
  const [valorGarcom, setValorGarcom] = useState(String(VALOR_GARCOM_PADRAO));
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(false);
  const [calculandoPrecificacao, setCalculandoPrecificacao] = useState(ehChurrasco);
  const [erroPrecificacao, setErroPrecificacao] = useState<string | null>(null);
  const [itensExcluidos, setItensExcluidos] = useState<{ preparo: string; motivo: string }[]>([]);

  function paraNumero(texto: string): number {
    const valor = Number(texto);
    return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
  }

  const quantidadeGarcomSugerida =
    orcamento.numConvidados > 0 ? sugerirQuantidadeGarcom(orcamento.numConvidados) : 0;
  const taxaDeslocamento = calcularTaxaDeslocamento(regiaoMetropolitana);

  useEffect(() => {
    if (!ehChurrasco) return;

    const timer = setTimeout(() => {
      setCalculandoPrecificacao(true);
      setErroPrecificacao(null);
      calcularPrecificacaoEventoAction({
        preparoIds,
        numConvidados: orcamento.numConvidados,
        regiaoMetropolitanaCuritiba: regiaoMetropolitana,
        quantidadeGarcom: paraNumero(qtdGarcons) || undefined,
        valorGarcom: paraNumero(valorGarcom) || undefined,
        distribuicaoConvidados: {
          adultos: orcamento.qtdAdultos ?? 0,
          criancasAte5: orcamento.qtdCriancasAte5 ?? 0,
          criancas5a10: orcamento.qtdCriancas5a10 ?? 0,
        },
      })
        .then((resposta) => {
          if ("erro" in resposta) {
            setErroPrecificacao(mensagemDeErro(resposta));
            setItensExcluidos([]);
            return;
          }
          setPrecoPessoa(String(resposta.resultado.valor_sugerido_por_pessoa));
          setPrecoCriancaMeia(String(resposta.resultado.valor_sugerido_crianca));
          setValorSugeridoTotal(resposta.resultado.valor_sugerido_total_evento);
          setItensExcluidos(resposta.itensExcluidos);
        })
        .catch(() => setErroPrecificacao("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculandoPrecificacao(false));
    }, 600);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehChurrasco, regiaoMetropolitana, qtdGarcons, valorGarcom]);

  const valorSugeridoTotalFormatado = valorSugeridoTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contato" className={rotuloClasse}>
              Contato (se diferente do cliente)
            </label>
            <input id="contato" name="contato" type="text" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className={rotuloClasse}>
              Celular
            </label>
            <input id="telefone" name="telefone" type="text" className={campoClasse} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="enderecoEvento" className={rotuloClasse}>
              Endereço do evento
            </label>
            <input id="enderecoEvento" name="enderecoEvento" type="text" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipoEvento" className={rotuloClasse}>
              Tipo de evento
            </label>
            <input
              id="tipoEvento"
              name="tipoEvento"
              type="text"
              placeholder="Casamento, aniversário, corporativo..."
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dataEvento" className={rotuloClasse}>
            Data e hora
          </label>
          <input id="dataEvento" name="dataEvento" type="datetime-local" required className={campoClasse} />
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaChegadaEquipe" className={rotuloClasse}>
              Chegada da equipe
            </label>
            <input id="horaChegadaEquipe" name="horaChegadaEquipe" type="time" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAperitivo" className={rotuloClasse}>
              Aperitivo
            </label>
            <input id="horaAperitivo" name="horaAperitivo" type="time" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAlmoco" className={rotuloClasse}>
              Almoço
            </label>
            <input id="horaAlmoco" name="horaAlmoco" type="time" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaEncerramento" className={rotuloClasse}>
              Limpeza/encerramento
            </label>
            <input id="horaEncerramento" name="horaEncerramento" type="time" className={campoClasse} />
          </div>
        </div>
      </section>

      {ehChurrasco && (
        <>
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

          <section className="flex flex-col gap-5">
            <h3 className={secaoTituloClasse}>Valores</h3>
            <p className="text-sm text-paper-dim">
              {calculandoPrecificacao
                ? "Calculando valor sugerido a partir do cardápio do Orçamento…"
                : "Preço por pessoa e preço criança meia vêm do custo real do cardápio (+ 40%) — pré-preenchidos, mas editáveis."}
            </p>
            {erroPrecificacao && <p className="text-sm text-ember">{erroPrecificacao}</p>}
            {itensExcluidos.length > 0 && (
              <div className="rounded-[2px] border border-ember/40 bg-ember/10 p-3 text-sm text-ember">
                <p className="font-medium">
                  Atenção: {itensExcluidos.length}{" "}
                  {itensExcluidos.length === 1 ? "item do orçamento não entrou" : "itens do orçamento não entraram"}{" "}
                  no cálculo do Valor Sugerido:
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="precoPessoa" className={rotuloClasse}>
                  Preço por pessoa (R$)
                </label>
                <input
                  id="precoPessoa"
                  name="precoPessoa"
                  type="number"
                  min={0}
                  step="0.01"
                  value={precoPessoa}
                  onChange={(e) => setPrecoPessoa(e.target.value)}
                  className={campoClasse}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="precoCriancaMeia" className={rotuloClasse}>
                  Preço criança meia (R$)
                </label>
                <input
                  id="precoCriancaMeia"
                  name="precoCriancaMeia"
                  type="number"
                  min={0}
                  step="0.01"
                  value={precoCriancaMeia}
                  onChange={(e) => setPrecoCriancaMeia(e.target.value)}
                  className={campoClasse}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="valorGarcom" className={rotuloClasse}>
                  Valor por garçom (R$)
                </label>
                <input
                  id="valorGarcom"
                  name="valorGarcom"
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorGarcom}
                  onChange={(e) => setValorGarcom(e.target.value)}
                  className={campoClasse}
                />
              </div>
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
                  className={`${campoClasse} cursor-not-allowed text-paper-dim`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="valor" className={rotuloClasse}>
                  Valor total do evento (R$)
                </label>
                <input
                  id="valor"
                  name="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={valorSugeridoTotal || ""}
                  className={campoClasse}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {!ehChurrasco && (
        <section className="flex flex-col gap-5">
          <h3 className={secaoTituloClasse}>Valor</h3>
          <p className="text-sm text-paper-dim">
            Valor negociado no Orçamento:{" "}
            {(orcamento.valorNegociado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valor" className={rotuloClasse}>
              Valor total do evento (R$)
            </label>
            <input
              id="valor"
              name="valor"
              type="number"
              min={0}
              step="0.01"
              defaultValue={orcamento.valorNegociado ?? ""}
              className={campoClasse}
            />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdFornecedores" className={rotuloClasse}>
              Fornecedores
            </label>
            <input id="qtdFornecedores" name="qtdFornecedores" type="number" min={0} className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdGarcons" className={rotuloClasse}>
              Quantidade de garçons
            </label>
            <input
              id="qtdGarcons"
              name="qtdGarcons"
              type="number"
              min={0}
              placeholder={orcamento.numConvidados > 0 ? String(quantidadeGarcomSugerida) : ""}
              value={qtdGarcons}
              onChange={(e) => setQtdGarcons(e.target.value)}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdCopeiras" className={rotuloClasse}>
              Quantidade de copeiras
            </label>
            <input id="qtdCopeiras" name="qtdCopeiras" type="number" min={0} className={campoClasse} />
          </div>
        </div>
        {ehChurrasco && (
          <p className="text-xs text-paper-dim">
            Quantidade de assadores calculada automaticamente:{" "}
            {orcamento.numConvidados > 0 ? sugerirQuantidadeAssador(orcamento.numConvidados) : 0} (uso interno,
            Margem Real).
          </p>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prazoPagamento" className={rotuloClasse}>
              Prazo de pagamento
            </label>
            <input id="prazoPagamento" name="prazoPagamento" type="date" className={campoClasse} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chavePix" className={rotuloClasse}>
              Chave PIX
            </label>
            <input id="chavePix" name="chavePix" type="text" className={campoClasse} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="observacoes" className={rotuloClasse}>
            Observações gerais
          </label>
          <textarea id="observacoes" name="observacoes" rows={4} className={campoClasse} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caminhoContrato" className={rotuloClasse}>
            Caminho do contrato (opcional)
          </label>
          <input id="caminhoContrato" name="caminhoContrato" type="text" className={campoClasse} />
        </div>
      </section>

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        Aprovar e Confirmar Evento
      </button>
    </form>
  );
}
