"use client";

import { useActionState } from "react";
import { Alerta } from "@/components/alerta";
import type { EstadoFormularioOrcamento } from "@/app/actions/orcamento";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { ehEmpresaSenhorChurrasco } from "@/lib/empresa-buffet";
import { Campo } from "@/components/campo";
import type { OrcamentoResumo } from "@/lib/orcamentos";
import { sugerirQuantidadeAssador } from "@/lib/precificacao-constantes";
import { BotaoEnviar } from "@/components/botao-enviar";

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
  action: (estadoAnterior: EstadoFormularioOrcamento, formData: FormData) => Promise<EstadoFormularioOrcamento>;
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
  const ehChurrasco = ehEmpresaSenhorChurrasco(orcamento.empresaNome);
  // Em erro, a ação devolve o que foi digitado e o formulário mostra de novo
  // (antes a tela caía e tudo se perdia — auditoria de 23/11, D4).
  const [estado, formAction] = useActionState(action, {});
  const v = (campo: string) => estado.valores?.[campo];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Contato (se diferente do cliente)">
            {(p) => (
              <input {...p} name="contato" defaultValue={v("contato")} type="text" />
            )}
          </Campo>
          <Campo rotulo="Celular">
            {(p) => (
              <input {...p} name="telefone" defaultValue={v("telefone")} type="text" />
            )}
          </Campo>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Endereço do evento">
            {(p) => (
              <input {...p} name="enderecoEvento" defaultValue={v("enderecoEvento")} type="text" />
            )}
          </Campo>
          <Campo rotulo="Tipo de evento">
            {(p) => (
              <input {...p}
                name="tipoEvento" defaultValue={v("tipoEvento")}
                type="text"
                placeholder="Casamento, aniversário, corporativo..."
              />
            )}
          </Campo>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>
        <Campo rotulo="Data e hora">
          {(p) => (
            <input {...p} name="dataEvento" defaultValue={v("dataEvento")} type="datetime-local" required />
          )}
        </Campo>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Campo rotulo="Chegada da equipe">
            {(p) => (
              <input {...p} name="horaChegadaEquipe" defaultValue={v("horaChegadaEquipe")} type="time" />
            )}
          </Campo>
          <Campo rotulo="Aperitivo">
            {(p) => (
              <input {...p} name="horaAperitivo" defaultValue={v("horaAperitivo")} type="time" />
            )}
          </Campo>
          <Campo rotulo="Almoço">
            {(p) => (
              <input {...p} name="horaAlmoco" defaultValue={v("horaAlmoco")} type="time" />
            )}
          </Campo>
          <Campo rotulo="Limpeza/encerramento">
            {(p) => (
              <input {...p} name="horaEncerramento" defaultValue={v("horaEncerramento")} type="time" />
            )}
          </Campo>
        </div>
      </section>

      {ehChurrasco && precificacaoChurrasco && (
        <section className="flex flex-col gap-3">
          <h3 className={secaoTituloClasse}>Valores (definidos no Orçamento — não editáveis aqui)</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-texto sm:grid-cols-4">
            <p className="text-texto-suave">Preço por pessoa</p>
            <p>{formatarMoeda(precificacaoChurrasco.precoPessoa)}</p>
            <p className="text-texto-suave">Preço criança (meia)</p>
            <p>{formatarMoeda(precificacaoChurrasco.precoCrianca)}</p>
            <p className="text-texto-suave">Garçons</p>
            <p>
              {precificacaoChurrasco.qtdGarcons} x {formatarMoeda(precificacaoChurrasco.valorGarcom)}
            </p>
            <p className="text-texto-suave">Taxa de deslocamento</p>
            <p>{formatarMoeda(precificacaoChurrasco.taxaDeslocamento)}</p>
          </div>
          <p className="text-base font-medium text-texto">
            Valor Total: {formatarMoeda(precificacaoChurrasco.valorTotal)}
          </p>
        </section>
      )}

      {!ehChurrasco && (
        <section className="flex flex-col gap-5">
          <h3 className={secaoTituloClasse}>Valor</h3>
          <p className="text-sm text-texto-suave">
            Valor negociado no Orçamento:{" "}
            {formatarMoeda(orcamento.valorNegociado ?? 0)}
          </p>
          <Campo rotulo="Valor total do evento (R$)">
            {(p) => (
              <input {...p}
                name="valor"
                type="number"
                min={0}
                step="0.01"
                defaultValue={v("valor") ?? orcamento.valorNegociado ?? ""}
              />
            )}
          </Campo>
        </section>
      )}

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Campo rotulo="Fornecedores">
            {(p) => (
              <input {...p} name="qtdFornecedores" defaultValue={v("qtdFornecedores")} type="number" min={0} />
            )}
          </Campo>
          {!ehChurrasco && (
            <Campo rotulo="Quantidade de garçons">
              {(p) => (
                <input {...p} name="qtdGarcons" defaultValue={v("qtdGarcons")} type="number" min={0} />
              )}
            </Campo>
          )}
          <Campo rotulo="Quantidade de copeiras">
            {(p) => (
              <input {...p} name="qtdCopeiras" defaultValue={v("qtdCopeiras")} type="number" min={0} />
            )}
          </Campo>
        </div>
        {ehChurrasco && (
          <p className="text-xs text-texto-suave">
            Quantidade de assadores calculada automaticamente:{" "}
            {orcamento.numConvidados > 0 ? sugerirQuantidadeAssador(orcamento.numConvidados) : 0} (uso interno,
            registrado para a futura Margem Real, ainda não calculada).
          </p>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Prazo de pagamento">
            {(p) => (
              <input {...p} name="prazoPagamento" defaultValue={v("prazoPagamento")} type="date" />
            )}
          </Campo>
          <Campo rotulo="Chave PIX">
            {(p) => (
              <input {...p} name="chavePix" defaultValue={v("chavePix")} type="text" />
            )}
          </Campo>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="observacoes" className={rotuloClasse}>
            Observações gerais
          </label>
          <textarea id="observacoes" name="observacoes" defaultValue={v("observacoes")} rows={4} className={campoClasse} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <Campo rotulo="Caminho do contrato (opcional)">
          {(p) => (
            <input {...p} name="caminhoContrato" defaultValue={v("caminhoContrato")} type="text" />
          )}
        </Campo>
      </section>

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo="Aprovar e Confirmar Evento" className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
