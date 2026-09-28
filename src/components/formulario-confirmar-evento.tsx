"use client";

import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import type { OrcamentoResumo } from "@/lib/orcamentos";
import { sugerirQuantidadeAssador } from "@/lib/precificacao-constantes";

type PrecificacaoChurrasco = {
  precoPessoa: number;
  precoCrianca: number;
  taxaDeslocamento: number;
  qtdGarcons: number;
  valorGarcom: number;
  valorTotal: number;
};

type FormularioConfirmarEventoProps = {
  orcamento: OrcamentoResumo;
  action: (formData: FormData) => void;
  /**
   * Calculada no servidor (mesma calcularPrecificacaoParaEvento usada na
   * confirmação de verdade, src/lib/orcamentos.ts) a partir do preço já
   * congelado no Orçamento — só presente quando o Orçamento tem cardápio
   * de Preparos (Senhor Churrasco).
   */
  precificacaoChurrasco?: PrecificacaoChurrasco;
};

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Passo 3 da Máquina de Estados — coleta só os dados operacionais/logísticos
 * que o Orçamento não decide (contato, endereço, horários, prazo de
 * pagamento etc.). NÃO recalcula preço: pro Senhor Churrasco, o preço por
 * pessoa/valor total já vêm PRONTOS do Orçamento (Passo 2), exibidos aqui
 * só como conferência (docs/PENDENCIAS_NOTURNAS.md, correção do bug de
 * preço fixo não respeitado, 2026-09-28).
 */
export function FormularioConfirmarEvento({ orcamento, action, precificacaoChurrasco }: FormularioConfirmarEventoProps) {
  const ehChurrasco = orcamento.itens.length > 0;

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

      {ehChurrasco && precificacaoChurrasco && (
        <section className="flex flex-col gap-3">
          <h3 className={secaoTituloClasse}>Valores (definidos no Orçamento — não editáveis aqui)</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-paper sm:grid-cols-4">
            <p className="text-paper-dim">Preço por pessoa</p>
            <p>{formatarMoeda(precificacaoChurrasco.precoPessoa)}</p>
            <p className="text-paper-dim">Preço criança (meia)</p>
            <p>{formatarMoeda(precificacaoChurrasco.precoCrianca)}</p>
            <p className="text-paper-dim">Garçons</p>
            <p>
              {precificacaoChurrasco.qtdGarcons} x {formatarMoeda(precificacaoChurrasco.valorGarcom)}
            </p>
            <p className="text-paper-dim">Taxa de deslocamento</p>
            <p>{formatarMoeda(precificacaoChurrasco.taxaDeslocamento)}</p>
          </div>
          <p className="text-base font-medium text-paper">
            Valor Total: {formatarMoeda(precificacaoChurrasco.valorTotal)}
          </p>
        </section>
      )}

      {!ehChurrasco && (
        <section className="flex flex-col gap-5">
          <h3 className={secaoTituloClasse}>Valor</h3>
          <p className="text-sm text-paper-dim">
            Valor negociado no Orçamento:{" "}
            {formatarMoeda(orcamento.valorNegociado ?? 0)}
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
          {!ehChurrasco && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="qtdGarcons" className={rotuloClasse}>
                Quantidade de garçons
              </label>
              <input id="qtdGarcons" name="qtdGarcons" type="number" min={0} className={campoClasse} />
            </div>
          )}
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
