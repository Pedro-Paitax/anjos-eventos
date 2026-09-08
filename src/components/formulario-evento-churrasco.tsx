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
import { SeletorCardapio, VALOR_SALVO } from "@/components/seletor-cardapio";
import { calcularPrecificacaoEventoAction } from "@/app/actions/precificacao";
import { obterItensCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import {
  calcularTaxaDeslocamento,
  sugerirQuantidadeGarcom,
  sugerirQuantidadeAssador,
  VALOR_GARCOM_PADRAO,
} from "@/lib/precificacao-constantes";

const DEBOUNCE_MS = 600;

type ValoresIniciaisCardapio = Pick<Evento, (typeof VALOR_SALVO)[CategoriaCardapio]>;

type FormularioEventoChurrascoProps = {
  empresaId: number;
  valoresIniciais?: Evento;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  cardapiosModelo: CardapioModeloResumo[];
  action: (formData: FormData) => void;
  rotuloEnvio: string;
};

/** Monta um valoresIniciais sintético (Nome, ", "-joined por categoria) a
 * partir de uma lista de preparo_id — usado só pra pré-popular o seletor ao
 * escolher um Cardápio Pré-Montado, sem criar nenhum vínculo permanente. */
function paraValoresIniciaisCardapio(
  preparoIds: number[],
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>
): ValoresIniciaisCardapio {
  const idsSelecionados = new Set(preparoIds);
  const resultado: Record<string, string | null> = {};
  for (const categoria of Object.keys(VALOR_SALVO) as CategoriaCardapio[]) {
    const nomes = preparosPorCategoria[categoria]
      .filter((p) => idsSelecionados.has(p.id))
      .map((p) => p.nome);
    resultado[VALOR_SALVO[categoria]] = nomes.length > 0 ? nomes.join(", ") : null;
  }
  return resultado as ValoresIniciaisCardapio;
}

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

export function FormularioEventoChurrasco({
  empresaId,
  valoresIniciais,
  preparosPorCategoria,
  cardapiosModelo,
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
            setErroPrecificacao(resposta.erro);
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cliente" className={rotuloClasse}>
            Cliente
          </label>
          <input
            id="cliente"
            name="cliente"
            type="text"
            required
            defaultValue={valoresIniciais?.cliente}
            className={campoClasse}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contato" className={rotuloClasse}>
              Contato (se diferente do cliente)
            </label>
            <input
              id="contato"
              name="contato"
              type="text"
              defaultValue={valoresIniciais?.contato ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className={rotuloClasse}>
              Celular
            </label>
            <input
              id="telefone"
              name="telefone"
              type="text"
              defaultValue={valoresIniciais?.telefone ?? ""}
              className={campoClasse}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="enderecoEvento" className={rotuloClasse}>
              Endereço do evento
            </label>
            <input
              id="enderecoEvento"
              name="enderecoEvento"
              type="text"
              defaultValue={valoresIniciais?.endereco_evento ?? ""}
              className={campoClasse}
            />
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
              defaultValue={valoresIniciais?.tipo_evento ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Datas e horários */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Datas e horários</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dataEvento" className={rotuloClasse}>
            Data e hora
          </label>
          <input
            id="dataEvento"
            name="dataEvento"
            type="datetime-local"
            required
            defaultValue={
              valoresIniciais
                ? paraInputDatetimeLocal(valoresIniciais.data_evento)
                : undefined
            }
            className={campoClasse}
          />
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaChegadaEquipe" className={rotuloClasse}>
              Chegada da equipe
            </label>
            <input
              id="horaChegadaEquipe"
              name="horaChegadaEquipe"
              type="time"
              defaultValue={
                valoresIniciais?.hora_chegada_equipe
                  ? paraInputTime(valoresIniciais.hora_chegada_equipe)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAperitivo" className={rotuloClasse}>
              Aperitivo
            </label>
            <input
              id="horaAperitivo"
              name="horaAperitivo"
              type="time"
              defaultValue={
                valoresIniciais?.hora_aperitivo
                  ? paraInputTime(valoresIniciais.hora_aperitivo)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaAlmoco" className={rotuloClasse}>
              Almoço
            </label>
            <input
              id="horaAlmoco"
              name="horaAlmoco"
              type="time"
              defaultValue={
                valoresIniciais?.hora_almoco
                  ? paraInputTime(valoresIniciais.hora_almoco)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="horaEncerramento" className={rotuloClasse}>
              Limpeza/encerramento
            </label>
            <input
              id="horaEncerramento"
              name="horaEncerramento"
              type="time"
              defaultValue={
                valoresIniciais?.hora_encerramento
                  ? paraInputTime(valoresIniciais.hora_encerramento)
                  : ""
              }
              className={campoClasse}
            />
          </div>
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
        <p className="text-sm text-paper-dim">
          Puxando da base de fichas técnicas do NocoDB.
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
            {erroTemplate && <p className="text-sm text-ember">{erroTemplate}</p>}
          </div>
        )}

        <SeletorCardapio
          key={chaveSeletorCardapio}
          preparosPorCategoria={preparosPorCategoria}
          valoresIniciais={cardapioBase ?? valoresIniciais}
          onSelecaoIdsChange={setPreparoIdsSelecionados}
        />
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
            : "Preço por pessoa e preço criança meia vêm do custo real do cardápio selecionado (+ 40%) — pré-preenchidos, mas editáveis."}
        </p>
        {precificacaoAtiva && erroPrecificacao && (
          <p className="text-sm text-ember">{erroPrecificacao}</p>
        )}
        {precificacaoAtiva && itensExcluidos.length > 0 && (
          <div className="rounded-[2px] border border-ember/40 bg-ember/10 p-3 text-sm text-ember">
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
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="precoPessoa" className={rotuloClasse}>
              Preço por pessoa (R$) — Valor Sugerido
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
              title="Calculado pelo servidor: adultos pagam o preço cheio por pessoa, crianças pagam meia-entrada, mais garçom e taxa de deslocamento. Apenas referência."
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
              defaultValue={valoresIniciais?.valor ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Serviços</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdGarcons" className={rotuloClasse}>
              Quantidade de garçons
            </label>
            <input
              id="qtdGarcons"
              name="qtdGarcons"
              type="number"
              min={0}
              placeholder={numConvidados > 0 ? String(quantidadeGarcomSugerida) : ""}
              value={qtdGarcons}
              onChange={(e) => setQtdGarcons(e.target.value)}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdChurrasqueiros" className={rotuloClasse}>
              Quantidade de churrasqueiros (Assador)
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
              title="Calculado automaticamente (1 a cada 100 convidados) — uso exclusivo no cálculo de Margem Real, não editável."
              className={`${campoClasse} cursor-not-allowed text-paper-dim`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="qtdCopeiras" className={rotuloClasse}>
              Quantidade de copeiras
            </label>
            <input
              id="qtdCopeiras"
              name="qtdCopeiras"
              type="number"
              min={0}
              defaultValue={valoresIniciais?.qtd_copeiras ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      {/* Financeiro / observações */}
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Financeiro/observações</h3>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="prazoPagamento" className={rotuloClasse}>
              Prazo de pagamento
            </label>
            <input
              id="prazoPagamento"
              name="prazoPagamento"
              type="date"
              defaultValue={
                valoresIniciais?.prazo_pagamento
                  ? paraInputDate(valoresIniciais.prazo_pagamento)
                  : ""
              }
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="chavePix" className={rotuloClasse}>
              Chave PIX
            </label>
            <input
              id="chavePix"
              name="chavePix"
              type="text"
              defaultValue={valoresIniciais?.chave_pix ?? ""}
              className={campoClasse}
            />
          </div>
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className={rotuloClasse}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={valoresIniciais?.status ?? "orcado"}
              className={campoClasse}
            >
              <option value="orcado">Orçado</option>
              <option value="confirmado">Confirmado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contrato */}
      <section className="flex flex-col gap-3">
        <h3 className={secaoTituloClasse}>Contrato</h3>
        <p className="text-sm text-paper-dim">
          Cadastro manual — a extração automática de contrato (upload de PDF)
          vem numa etapa futura.
        </p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caminhoContrato" className={rotuloClasse}>
            Caminho do contrato (opcional)
          </label>
          <input
            id="caminhoContrato"
            name="caminhoContrato"
            type="text"
            placeholder="/uploads/contratos/senhor-churrasco/arquivo.pdf"
            defaultValue={valoresIniciais?.caminho_contrato ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      <button
        type="submit"
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        {rotuloEnvio}
      </button>
    </form>
  );
}
