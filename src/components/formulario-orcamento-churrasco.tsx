"use client";

import { useEffect, useState } from "react";
import type { Preparo, CategoriaCardapio } from "@/lib/cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { SeletorCardapio, paraValoresIniciaisCardapio, type ValoresIniciaisCardapio } from "@/components/seletor-cardapio";
import { obterItensCardapioModeloAction } from "@/app/actions/cardapio-modelo";
import { calcularPrecificacaoEventoAction } from "@/app/actions/precificacao";
import type { CardapioModeloResumo } from "@/lib/cardapios-modelo";
import {
  calcularTaxaDeslocamento,
  sugerirQuantidadeGarcom,
  VALOR_GARCOM_PADRAO,
} from "@/lib/precificacao-constantes";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

type FormularioOrcamentoChurrascoProps = {
  empresaId: number;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  cardapiosModelo: CardapioModeloResumo[];
  action: (formData: FormData) => void;
};

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return texto.trim() === "" || Number.isNaN(valor) ? 0 : valor;
}

function mensagemDeErro(resposta: { erro: string; mensagem?: string }): string {
  return resposta.mensagem ?? resposta.erro;
}

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

/**
 * Passo 2 da Máquina de Estados — este é o ÚNICO lugar onde o preço por
 * pessoa do Senhor Churrasco é decidido (fixo do Cardápio Modelo, ou
 * dinâmico, sempre editável). O Passo 3 (Aprovar e Confirmar Evento) NÃO
 * recalcula preço — usa exatamente o que for gravado aqui
 * (docs/PENDENCIAS_NOTURNAS.md, correção do bug de preço fixo não
 * respeitado, 2026-09-28).
 */
export function FormularioOrcamentoChurrasco({
  empresaId,
  preparosPorCategoria,
  cardapiosModelo,
  action,
}: FormularioOrcamentoChurrascoProps) {
  const [qtdAdultos, setQtdAdultos] = useState("0");
  const [qtdCriancasAte5, setQtdCriancasAte5] = useState("0");
  const [qtdCriancas5a10, setQtdCriancas5a10] = useState("0");
  const [preparoIdsSelecionados, setPreparoIdsSelecionados] = useState<number[]>([]);

  const [cardapioBase, setCardapioBase] = useState<ValoresIniciaisCardapio | undefined>(undefined);
  const [chaveSeletorCardapio, setChaveSeletorCardapio] = useState(0);
  const [aplicandoTemplate, setAplicandoTemplate] = useState(false);
  const [erroTemplate, setErroTemplate] = useState<string | null>(null);

  // Mesma lógica da Tarefa 1 (formulario-evento-churrasco.tsx): preço fixo
  // do Cardápio Modelo pré-preenche "Preço por pessoa" e trava o
  // recálculo dinâmico automático — continua editável.
  const [precoFixoSelecionado, setPrecoFixoSelecionado] = useState<number | null>(null);
  const [precoPessoa, setPrecoPessoa] = useState("");
  const [valorGarcom, setValorGarcom] = useState(String(VALOR_GARCOM_PADRAO));
  const [qtdGarcons, setQtdGarcons] = useState("");
  const [regiaoMetropolitana, setRegiaoMetropolitana] = useState(false);

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

  const numConvidados = paraNumero(qtdAdultos) + paraNumero(qtdCriancasAte5) + paraNumero(qtdCriancas5a10);
  const quantidadeGarcomSugerida = numConvidados > 0 ? sugerirQuantidadeGarcom(numConvidados) : 0;
  const taxaDeslocamento = calcularTaxaDeslocamento(regiaoMetropolitana);

  // Baseline DINÂMICO (custo real do cardápio x 1,40) — só pré-preenche
  // "Preço por pessoa" quando não há preço fixo escolhido. NÃO depende de
  // precoPessoa (evita loop: digitar um preço manual não pode disparar
  // este efeito, senão o valor digitado seria sobrescrito de volta).
  const [calculandoPrecificacao, setCalculandoPrecificacao] = useState(false);
  const [erroPrecificacao, setErroPrecificacao] = useState<string | null>(null);
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
          if (precoFixoSelecionado == null) {
            setPrecoPessoa(String(resposta.resultado.valor_sugerido_por_pessoa));
          }
          setItensExcluidos(resposta.itensExcluidos);
        })
        .catch(() => setErroPrecificacao("Falha ao calcular o valor sugerido."))
        .finally(() => setCalculandoPrecificacao(false));
    }, 600);

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

  // Preview do Valor Total — puramente derivado do estado atual (sem
  // round-trip ao servidor): preço x adultos + meia x crianças + garçom +
  // deslocamento, a MESMA fórmula de calcularPrecificacaoParaEvento
  // (src/lib/precificacao-cardapio.ts), só que calculada aqui pra feedback
  // instantâneo. O valor que de fato fica gravado no Evento é recalculado
  // pela função real, em src/lib/orcamentos.ts, a partir do preço
  // congelado no Orçamento — nunca deste preview.
  const precoPessoaNum = paraNumero(precoPessoa);
  const precoCriancaNum = arredondar(precoPessoaNum / 2);
  const qtdGarconsEfetiva = paraNumero(qtdGarcons) || quantidadeGarcomSugerida;
  const valorGarcomNum = paraNumero(valorGarcom) || VALOR_GARCOM_PADRAO;
  const valorTotalPreview = arredondar(
    paraNumero(qtdAdultos) * precoPessoaNum +
      (paraNumero(qtdCriancasAte5) + paraNumero(qtdCriancas5a10)) * precoCriancaNum +
      qtdGarconsEfetiva * valorGarcomNum +
      taxaDeslocamento
  );
  const valorTotalPreviewFormatado = valorTotalPreview.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />
      <input type="hidden" name="usarPrecoFixoModelo" value={String(precoFixoSelecionado != null)} />
      <input type="hidden" name="regiaoMetropolitanaCuritiba" value={String(regiaoMetropolitana)} />

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>
        <Campo rotulo="Cliente">
          {(p) => (
            <input {...p} name="clienteNome" type="text" required />
          )}
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Campo rotulo="Adultos">
            {(p) => (
              <input {...p}
                name="qtdAdultos"
                type="number"
                min={0}
                value={qtdAdultos}
                onChange={(e) => setQtdAdultos(e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Crianças até 5 anos">
            {(p) => (
              <input {...p}
                name="qtdCriancasAte5"
                type="number"
                min={0}
                value={qtdCriancasAte5}
                onChange={(e) => setQtdCriancasAte5(e.target.value)}
              />
            )}
          </Campo>
          <Campo rotulo="Crianças de 5 a 10 anos">
            {(p) => (
              <input {...p}
                name="qtdCriancas5a10"
                type="number"
                min={0}
                value={qtdCriancas5a10}
                onChange={(e) => setQtdCriancas5a10(e.target.value)}
              />
            )}
          </Campo>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Cardápio</h3>

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
          Taxa de deslocamento:{" "}
          {taxaDeslocamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valores</h3>
        <p aria-live="polite" className="text-sm text-paper-dim">
          {calculandoPrecificacao
            ? "Calculando valor sugerido a partir do cardápio…"
            : precoFixoSelecionado != null
              ? "Preço por pessoa pré-preenchido com o preço fixo do Cardápio Pré-Montado selecionado — editável."
              : "Preço por pessoa vem do custo real do cardápio selecionado (+ 40%) — pré-preenchido, mas editável."}
        </p>
        <p className="text-xs text-paper-dim">
          Este é o valor que fica congelado no Orçamento — o Passo 3
          (Aprovar e Confirmar Evento) não recalcula preço, só confirma
          logística.
        </p>
        {precificacaoAtiva && erroPrecificacao && <Alerta tipo="perigo">{erroPrecificacao}</Alerta>}
        {precificacaoAtiva && itensExcluidos.length > 0 && (
          <Alerta tipo="aviso">
            <p className="font-medium">
              Atenção: {itensExcluidos.length}{" "}
              {itensExcluidos.length === 1 ? "item selecionado não entrou" : "itens selecionados não entraram"}{" "}
              no cálculo do valor dinâmico:
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
          <Campo rotulo="Preço por pessoa (R$)">
            {(p) => (
              <input {...p}
                name="precoPessoa"
                type="number"
                min={0}
                step="0.01"
                required
                value={precoPessoa}
                onChange={(e) => setPrecoPessoa(e.target.value)}
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
            <label htmlFor="valorTotalPreview" className={rotuloClasse}>
              Valor Total (R$) — preço x adultos + meia x crianças + garçom + deslocamento
            </label>
            <input
              id="valorTotalPreview"
              type="text"
              readOnly
              disabled
              value={valorTotalPreviewFormatado}
              className={`${campoClasse} cursor-not-allowed text-paper-dim`}
            />
          </div>
        </div>
      </section>

      <BotaoEnviar rotulo="Gerar Orçamento" className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
