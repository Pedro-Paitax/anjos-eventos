import "server-only";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { empresas, eventos } from "@/db/schema/nucleo-existente";
import { orcamentos, itensOrcamento, itensEventoConfirmados } from "@/db/schema/orcamentos";
import { preparos } from "@/db/schema/preparos";
import { calcularDimensionamentoOrcamento } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import { calcularPrecificacaoParaEvento } from "@/lib/precificacao-cardapio";
import {
  sugerirQuantidadeCopeira,
  sugerirQuantidadeAssador,
  VALOR_COPEIRA,
  VALOR_ASSADOR,
} from "@/lib/precificacao-constantes";

/**
 * Máquina de Estados Orçamento → Evento Confirmado (docs/PENDENCIAS_NOTURNAS.md,
 * sessão 2026-09-27). O fluxo de "Criar Evento" nunca escreveu aqui — ver
 * diagnóstico da mesma sessão. Este módulo é o ÚNICO lugar (fora do ETL) que
 * escreve em orcamentos/itens_orcamento/itens_evento_confirmados.
 *
 * Correção de 2026-09-28: o Passo 3 (Aprovar e Confirmar Evento) NÃO
 * recalcula mais o preço do cardápio — usa o `precoPessoa` (fixo do
 * Cardápio Modelo, ou dinâmico/editado) já escolhido e congelado no
 * Orçamento (Passo 2), via calcularPrecificacaoParaEvento com
 * precoPorPessoaEscolhido. Ver docs/PENDENCIAS_NOTURNAS.md.
 */

export type ItemOrcamento = { preparoId: number; preparoNome: string };

export type OrcamentoResumo = {
  id: number;
  empresaId: number;
  empresaNome: string;
  clienteNome: string | null;
  numConvidados: number;
  qtdAdultos: number | null;
  qtdCriancasAte5: number | null;
  qtdCriancas5a10: number | null;
  status: string;
  eventoId: number | null;
  /** Ausência de itens (churrasco) e valorNegociado nulo (genérico) não deveria acontecer — mas nunca os dois preenchidos ao mesmo tempo. */
  itens: ItemOrcamento[];
  valorNegociado: number | null;
  /** Campos de precificação — só Senhor Churrasco (null pras demais empresas). */
  precoPessoa: number | null;
  usarPrecoFixoModelo: boolean;
  qtdGarcons: number | null;
  valorGarcom: number | null;
  regiaoMetropolitanaCuritiba: boolean | null;
};

export type DadosOrcamentoChurrasco = {
  empresaId: number;
  clienteNome: string;
  qtdAdultos: number;
  qtdCriancasAte5: number;
  qtdCriancas5a10: number;
  preparoIds: number[];
  /** Preço por pessoa escolhido na tela (fixo do template ou dinâmico/editado) — congelado aqui, nunca recalculado no Passo 3. */
  precoPessoa: number;
  /** True quando o preço veio de um Cardápio Modelo com Preco_Fixo_Por_Pessoa (mesmo que editado depois). */
  usarPrecoFixoModelo: boolean;
  qtdGarcons: number;
  valorGarcom: number;
  regiaoMetropolitanaCuritiba: boolean;
};

export type DadosOrcamentoGenerico = {
  empresaId: number;
  clienteNome: string;
  qtdAdultos: number;
  qtdCriancasAte5: number;
  qtdCriancas5a10: number;
  valorNegociado: number;
};

function numeroOuNulo(v: string | null): number | null {
  return v == null ? null : Number(v);
}

export async function criarOrcamentoChurrasco(dados: DadosOrcamentoChurrasco): Promise<number> {
  const numConvidados = dados.qtdAdultos + dados.qtdCriancasAte5 + dados.qtdCriancas5a10;
  return db.transaction(async (tx) => {
    const [criado] = await tx
      .insert(orcamentos)
      .values({
        empresaId: dados.empresaId,
        clienteNome: dados.clienteNome,
        numConvidados,
        qtdAdultos: dados.qtdAdultos,
        qtdCriancasAte5: dados.qtdCriancasAte5,
        qtdCriancas5a10: dados.qtdCriancas5a10,
        status: "Simulação",
        precoPessoa: String(dados.precoPessoa),
        usarPrecoFixoModelo: dados.usarPrecoFixoModelo,
        qtdGarcons: dados.qtdGarcons,
        valorGarcom: String(dados.valorGarcom),
        regiaoMetropolitanaCuritiba: dados.regiaoMetropolitanaCuritiba,
      })
      .returning({ id: orcamentos.id });

    const preparoIdsUnicos = [...new Set(dados.preparoIds)];
    if (preparoIdsUnicos.length > 0) {
      await tx.insert(itensOrcamento).values(
        preparoIdsUnicos.map((preparoId) => ({ orcamentoId: criado.id, preparoId }))
      );
    }
    return criado.id;
  });
}

export async function criarOrcamentoGenerico(dados: DadosOrcamentoGenerico): Promise<number> {
  const numConvidados = dados.qtdAdultos + dados.qtdCriancasAte5 + dados.qtdCriancas5a10;
  const [criado] = await db
    .insert(orcamentos)
    .values({
      empresaId: dados.empresaId,
      clienteNome: dados.clienteNome,
      numConvidados,
      qtdAdultos: dados.qtdAdultos,
      qtdCriancasAte5: dados.qtdCriancasAte5,
      qtdCriancas5a10: dados.qtdCriancas5a10,
      status: "Simulação",
      valorNegociado: String(dados.valorNegociado),
    })
    .returning({ id: orcamentos.id });
  return criado.id;
}

export async function obterOrcamento(id: number): Promise<OrcamentoResumo | null> {
  const [linha] = await db
    .select({
      id: orcamentos.id,
      empresaId: orcamentos.empresaId,
      empresaNome: empresas.nome,
      clienteNome: orcamentos.clienteNome,
      numConvidados: orcamentos.numConvidados,
      qtdAdultos: orcamentos.qtdAdultos,
      qtdCriancasAte5: orcamentos.qtdCriancasAte5,
      qtdCriancas5a10: orcamentos.qtdCriancas5a10,
      status: orcamentos.status,
      eventoId: orcamentos.eventoId,
      valorNegociado: orcamentos.valorNegociado,
      precoPessoa: orcamentos.precoPessoa,
      usarPrecoFixoModelo: orcamentos.usarPrecoFixoModelo,
      qtdGarcons: orcamentos.qtdGarcons,
      valorGarcom: orcamentos.valorGarcom,
      regiaoMetropolitanaCuritiba: orcamentos.regiaoMetropolitanaCuritiba,
    })
    .from(orcamentos)
    .innerJoin(empresas, eq(orcamentos.empresaId, empresas.id))
    .where(eq(orcamentos.id, id));
  if (!linha) return null;

  const itens = await db
    .select({ preparoId: itensOrcamento.preparoId, preparoNome: preparos.nomePreparo })
    .from(itensOrcamento)
    .innerJoin(preparos, eq(itensOrcamento.preparoId, preparos.id))
    .where(eq(itensOrcamento.orcamentoId, id));

  return {
    ...linha,
    valorNegociado: numeroOuNulo(linha.valorNegociado),
    precoPessoa: numeroOuNulo(linha.precoPessoa),
    valorGarcom: numeroOuNulo(linha.valorGarcom),
    itens,
  };
}

export type DadosOperacionaisEvento = {
  contato: string | null;
  telefone: string | null;
  enderecoEvento: string | null;
  dataEvento: string;
  tipoEvento: string | null;
  horaChegadaEquipe: string | null;
  horaAperitivo: string | null;
  horaAlmoco: string | null;
  horaEncerramento: string | null;
  qtdFornecedores: number | null;
  /** Genérico apenas — pro Senhor Churrasco, quantidade de garçons vem do Orçamento (ver DadosOrcamentoChurrasco.qtdGarcons). */
  qtdGarcons: number | null;
  qtdCopeiras: number | null;
  /** Valor total do evento — só usado pra empresas sem cardápio de preparos (parte de valorNegociado, editável aqui). Pro Senhor Churrasco, o valor vem sempre do Orçamento. */
  valor: number | null;
  prazoPagamento: string | null;
  chavePix: string | null;
  caminhoContrato: string | null;
  observacoes: string | null;
};

export type ConfirmarEventoErro = { erro: string };

function paraNumeric(v: number | null): string | null {
  return v == null ? null : String(v);
}

/**
 * Núcleo puro (sem I/O) da Ação de Conversão: monta os valores a inserir em
 * `eventos` a partir do Orçamento + dos dados operacionais coletados no
 * Passo 3. Separado de aprovarEConfirmarEvento pra poder ser testado sem
 * mockar banco — mesmo padrão de distribuirPorcoes/calcularCustoTotalComposicao.
 *
 * Pro Senhor Churrasco, todo o financeiro (preço por pessoa, criança, valor
 * total, garçom, deslocamento) vem do Orçamento — calcularPrecificacaoParaEvento
 * é chamado com itens=[] e precoPorPessoaEscolhido=orcamento.precoPessoa,
 * então nenhum custo de cardápio é recalculado, só a combinação aritmética
 * (preço x adultos + meia x crianças + garçom + deslocamento).
 */
export function montarValoresEvento(
  orcamento: Pick<
    OrcamentoResumo,
    | "empresaId"
    | "clienteNome"
    | "numConvidados"
    | "qtdAdultos"
    | "qtdCriancasAte5"
    | "qtdCriancas5a10"
    | "precoPessoa"
    | "qtdGarcons"
    | "valorGarcom"
    | "regiaoMetropolitanaCuritiba"
  >,
  operacionais: DadosOperacionaisEvento,
  ehChurrasco: boolean
) {
  const quantidadeCopeiraSugerida = sugerirQuantidadeCopeira(orcamento.numConvidados);
  const quantidadeAssadorSugerida = sugerirQuantidadeAssador(orcamento.numConvidados);

  let precoPessoa: string | null = null;
  let precoCriancaMeia: string | null = null;
  let valorGarcom: string | null = null;
  let taxaDeslocamento: string | null = null;
  let qtdGarcons: number | null = operacionais.qtdGarcons;
  let regiaoMetropolitanaCuritiba = false;
  let valor: string | null = paraNumeric(operacionais.valor);

  if (ehChurrasco) {
    const precificacao = calcularPrecificacaoParaEvento(
      [],
      {
        numConvidados: orcamento.numConvidados,
        regiaoMetropolitanaCuritiba: orcamento.regiaoMetropolitanaCuritiba ?? false,
        quantidadeGarcom: orcamento.qtdGarcons ?? undefined,
        valorGarcom: orcamento.valorGarcom ?? undefined,
        precoPorPessoaEscolhido: orcamento.precoPessoa ?? undefined,
      },
      {
        adultos: orcamento.qtdAdultos ?? 0,
        criancasAte5: orcamento.qtdCriancasAte5 ?? 0,
        criancas5a10: orcamento.qtdCriancas5a10 ?? 0,
      }
    );

    precoPessoa = paraNumeric(precificacao.valor_sugerido_por_pessoa);
    precoCriancaMeia = paraNumeric(precificacao.valor_sugerido_crianca);
    valorGarcom = paraNumeric(precificacao.valor_garcom);
    taxaDeslocamento = paraNumeric(precificacao.taxa_deslocamento);
    qtdGarcons = precificacao.quantidade_garcom_usada;
    regiaoMetropolitanaCuritiba = orcamento.regiaoMetropolitanaCuritiba ?? false;
    valor = paraNumeric(precificacao.valor_sugerido_total_evento);
  }

  return {
    empresaId: orcamento.empresaId,
    cliente: orcamento.clienteNome ?? "",
    contato: operacionais.contato,
    telefone: operacionais.telefone,
    enderecoEvento: operacionais.enderecoEvento,
    dataEvento: new Date(operacionais.dataEvento),
    tipoEvento: operacionais.tipoEvento,
    horaChegadaEquipe: operacionais.horaChegadaEquipe,
    horaAperitivo: operacionais.horaAperitivo,
    horaAlmoco: operacionais.horaAlmoco,
    horaEncerramento: operacionais.horaEncerramento,
    qtdAdultos: orcamento.qtdAdultos,
    qtdCriancasAte5: orcamento.qtdCriancasAte5,
    qtdCriancas5a10: orcamento.qtdCriancas5a10,
    qtdFornecedores: operacionais.qtdFornecedores,
    // Campos de texto livre de cardápio: NÃO gravados no fluxo novo — quem
    // renderiza a Agenda cai pro JOIN estruturado em itens_evento_confirmados
    // quando existir (docs/PENDENCIAS_NOTURNAS.md, item 5 da Máquina de Estados).
    cardapioEntrada: null,
    cardapioCarnes: null,
    cardapioAcompanhamentos: null,
    cardapioSaladas: null,
    cardapioBebidas: null,
    cardapioSobremesa: null,
    precoPessoa,
    precoCriancaMeia,
    valorGarcom,
    taxaDeslocamento,
    qtdGarcons,
    qtdChurrasqueiros: ehChurrasco ? quantidadeAssadorSugerida : null,
    qtdCopeiras: operacionais.qtdCopeiras,
    regiaoMetropolitanaCuritiba,
    quantidadeCopeiraSugerida,
    custoCopeiraTotal: paraNumeric(quantidadeCopeiraSugerida * VALOR_COPEIRA),
    custoAssadorTotal: paraNumeric(ehChurrasco ? quantidadeAssadorSugerida * VALOR_ASSADOR : 0),
    prazoPagamento: operacionais.prazoPagamento,
    chavePix: operacionais.chavePix,
    caminhoContrato: operacionais.caminhoContrato,
    status: "confirmado" as const,
    valor,
    observacoes: operacionais.observacoes,
  };
}

/**
 * Ação de Conversão (Passo 3 — "Aprovar e Confirmar Evento"). Transação
 * atômica: cria o Evento confirmado, resolve o custo ATUAL de cada Preparo
 * (nunca cacheado) e grava o snapshot em itens_evento_confirmados, depois
 * marca o Orçamento como Aceito. Para empresas sem cardápio de Preparos
 * (sem itens_orcamento), nenhuma linha de itens_evento_confirmados é criada
 * — não há ficha técnica a exportar para esses eventos.
 */
export async function aprovarEConfirmarEvento(
  orcamentoId: number,
  operacionais: DadosOperacionaisEvento
): Promise<number | ConfirmarEventoErro> {
  const orcamento = await obterOrcamento(orcamentoId);
  if (!orcamento) return { erro: "Orçamento não encontrado." };
  if (orcamento.status !== "Simulação") {
    return { erro: `Orçamento já está em status "${orcamento.status}" — não pode ser confirmado novamente.` };
  }

  const ehChurrasco = orcamento.itens.length > 0;
  if (ehChurrasco && orcamento.precoPessoa == null) {
    return { erro: "Orçamento de Senhor Churrasco sem preço por pessoa definido — não é possível confirmar." };
  }

  // Custo/quantidade ATUAIS resolvidos FORA da transação de escrita (só
  // leitura, motores já existentes) — nunca custo cacheado/antigo, conforme
  // instruído. Se algum preparo não resolver dimensionamento (peso/macro
  // ausente), fica de fora do snapshot, mesma política de exclusão
  // silenciosa+aviso já usada em margem-orcamento.ts/precificacao-evento.ts.
  // Isso é o custo de PRODUÇÃO (ficha técnica), não afeta o preço de venda
  // (que vem do Orçamento, ver montarValoresEvento).
  const snapshots: {
    preparoId: number;
    quantidadeConfirmada: number;
    custoUnitarioSnapshot: number;
  }[] = [];
  const avisos: string[] = [];

  if (ehChurrasco) {
    const dimensionamento = await calcularDimensionamentoOrcamento(orcamentoId);
    if ("erro" in dimensionamento) return { erro: dimensionamento.erro };

    for (const item of dimensionamento.itens_excluidos) {
      avisos.push(`${item.preparo}: excluído do snapshot da Ficha Técnica (${item.motivo})`);
    }

    for (const macro of dimensionamento.macro_categorias) {
      for (const item of macro.itens) {
        const custo = await calcularCustoPreparo(item.preparo_id);
        if ("erro" in custo) {
          avisos.push(`${item.preparo}: falha ao calcular custo atual (${custo.erro})`);
          continue;
        }
        snapshots.push({
          preparoId: item.preparo_id,
          quantidadeConfirmada: item.quantidade_para_custo,
          // numeric(10,4) na coluna — sem arredondarCentavos aqui (2 casas):
          // custo por unidade de um preparo (ex.: por grama) pode ser bem
          // menor que 1 centavo, arredondar pra centavos zeraria o valor.
          custoUnitarioSnapshot: custo.custo_total_preparo / custo.rendimento,
        });
      }
    }
  }

  const valoresEvento = montarValoresEvento(orcamento, operacionais, ehChurrasco);

  const eventoId = await db.transaction(async (tx) => {
    const [linhaOrcamento] = await tx
      .select({ status: orcamentos.status })
      .from(orcamentos)
      .where(eq(orcamentos.id, orcamentoId));
    if (!linhaOrcamento || linhaOrcamento.status !== "Simulação") {
      throw new Error("Orçamento mudou de status entre a leitura e a confirmação — nada foi gravado.");
    }

    // Inserido via tx.insert (não uma função de outra camada, que abriria
    // conexão própria via pool) — precisa estar na MESMA transação Drizzle
    // do snapshot da Ficha Técnica e da atualização do Orçamento, senão a
    // atomicidade exigida pela Ação de Conversão não é real.
    const [eventoCriado] = await tx.insert(eventos).values(valoresEvento).returning({ id: eventos.id });
    const id = eventoCriado.id;

    if (snapshots.length > 0) {
      await tx.insert(itensEventoConfirmados).values(
        snapshots.map((s) => ({
          eventoId: id,
          preparoId: s.preparoId,
          orcamentoOrigemId: orcamentoId,
          quantidadeConfirmada: String(s.quantidadeConfirmada),
          custoUnitarioSnapshot: String(s.custoUnitarioSnapshot),
        }))
      );
    }

    await tx
      .update(orcamentos)
      .set({ status: "Aceito", eventoId: id, atualizadoEm: new Date() })
      .where(eq(orcamentos.id, orcamentoId));

    return id;
  });

  if (avisos.length > 0) {
    console.warn(
      `[orcamentos] Evento ${eventoId} confirmado a partir do orçamento ${orcamentoId} com avisos:`,
      avisos
    );
  }

  return eventoId;
}
