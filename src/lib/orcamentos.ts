import "server-only";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { empresas, eventos } from "@/db/schema/nucleo-existente";
import { orcamentos, itensOrcamento, itensEventoConfirmados } from "@/db/schema/orcamentos";
import { preparos } from "@/db/schema/preparos";
import { calcularDimensionamentoOrcamento } from "@/lib/dimensionamento-cardapio";
import { calcularCustoPreparo } from "@/lib/custo-preparo";
import {
  calcularTaxaDeslocamento,
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
};

export type DadosOrcamentoChurrasco = {
  empresaId: number;
  clienteNome: string;
  qtdAdultos: number;
  qtdCriancasAte5: number;
  qtdCriancas5a10: number;
  preparoIds: number[];
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

  return { ...linha, valorNegociado: numeroOuNulo(linha.valorNegociado), itens };
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
  qtdGarcons: number | null;
  qtdCopeiras: number | null;
  regiaoMetropolitanaCuritiba: boolean;
  /** Churrasco apenas — ignorado (persistido como null) pra empresas sem cardápio de preparos. */
  precoPessoa: number | null;
  precoCriancaMeia: number | null;
  valorGarcom: number | null;
  /** Valor total do evento — pra empresas sem cardápio de preparos, é o valor final acordado (parte de valorNegociado, editável aqui). */
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
 */
export function montarValoresEvento(
  orcamento: Pick<OrcamentoResumo, "empresaId" | "clienteNome" | "numConvidados" | "qtdAdultos" | "qtdCriancasAte5" | "qtdCriancas5a10">,
  operacionais: DadosOperacionaisEvento,
  ehChurrasco: boolean
) {
  const quantidadeCopeiraSugerida = sugerirQuantidadeCopeira(orcamento.numConvidados);
  const quantidadeAssadorSugerida = sugerirQuantidadeAssador(orcamento.numConvidados);

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
    precoPessoa: paraNumeric(ehChurrasco ? operacionais.precoPessoa : null),
    precoCriancaMeia: paraNumeric(ehChurrasco ? operacionais.precoCriancaMeia : null),
    valorGarcom: paraNumeric(ehChurrasco ? operacionais.valorGarcom : null),
    taxaDeslocamento: paraNumeric(
      ehChurrasco ? calcularTaxaDeslocamento(operacionais.regiaoMetropolitanaCuritiba) : null
    ),
    qtdGarcons: operacionais.qtdGarcons,
    qtdChurrasqueiros: ehChurrasco ? quantidadeAssadorSugerida : null,
    qtdCopeiras: operacionais.qtdCopeiras,
    regiaoMetropolitanaCuritiba: operacionais.regiaoMetropolitanaCuritiba,
    quantidadeCopeiraSugerida,
    custoCopeiraTotal: paraNumeric(quantidadeCopeiraSugerida * VALOR_COPEIRA),
    custoAssadorTotal: paraNumeric(ehChurrasco ? quantidadeAssadorSugerida * VALOR_ASSADOR : 0),
    prazoPagamento: operacionais.prazoPagamento,
    chavePix: operacionais.chavePix,
    caminhoContrato: operacionais.caminhoContrato,
    status: "confirmado" as const,
    valor: paraNumeric(operacionais.valor),
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

  // Custo/quantidade ATUAIS resolvidos FORA da transação de escrita (só
  // leitura, motores já existentes) — nunca custo cacheado/antigo, conforme
  // instruído. Se algum preparo não resolver dimensionamento (peso/macro
  // ausente), fica de fora do snapshot, mesma política de exclusão
  // silenciosa+aviso já usada em margem-orcamento.ts/precificacao-evento.ts.
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
