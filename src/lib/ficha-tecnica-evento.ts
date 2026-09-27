import "server-only";
import { passosPreparoSchema, type PassosPreparo } from "@/lib/passos-preparo";

/**
 * Exportação de Ficha Técnica por Evento — escala cada Preparo do
 * cardápio confirmado (Itens_Evento_Confirmados) pra produção real + 10%
 * de buffer, seguindo a fórmula pedida:
 *
 *   Fator_Multiplicador = (Quantidade_Confirmada_do_Evento × 1,10) / Rendimento_Original
 *
 * aplicada em cada linha de Composição. Não existe equivalente no
 * NocoDB — Itens_Evento_Confirmados só existe no Postgres/Oracle
 * (docs/BANCO.md), então este módulo não faz distinção por DATA_SOURCE.
 */

const BUFFER_PRODUCAO = 1.1;

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

export type InsumoEscalado = {
  insumoId: number;
  nome: string;
  unidade: string;
  quantidadeEscalada: number;
};

export type FichaTecnicaEscalada = {
  preparoId: number;
  nomePreparo: string;
  quantidadeConfirmada: number;
  fatorMultiplicador: number;
  rendimentoAjustado: number;
  unidadeRendimento: string;
  insumos: InsumoEscalado[];
  /** null quando o preparo ainda não tem `passos` estruturado — quem exibe cai pra `modoPreparoBruto`. */
  passos: PassosPreparo | null;
  modoPreparoBruto: string;
};

export type DadosFichaTecnicaBruta = {
  preparoId: number;
  nomePreparo: string;
  rendimentoOriginal: number;
  unidadeRendimento: string;
  quantidadeConfirmada: number;
  composicao: { insumoId: number; nome: string; unidade: string; quantidade: number }[];
  passos: unknown;
  modoPreparoBruto: string;
};

/** Núcleo puro (sem I/O) — escala uma ficha técnica, testável isoladamente. */
export function calcularFichaTecnicaEscalada(dados: DadosFichaTecnicaBruta): FichaTecnicaEscalada {
  const fatorMultiplicador = (dados.quantidadeConfirmada * BUFFER_PRODUCAO) / dados.rendimentoOriginal;
  const passosValidados = passosPreparoSchema.safeParse(dados.passos);

  return {
    preparoId: dados.preparoId,
    nomePreparo: dados.nomePreparo,
    quantidadeConfirmada: dados.quantidadeConfirmada,
    fatorMultiplicador,
    rendimentoAjustado: arredondar(dados.rendimentoOriginal * fatorMultiplicador),
    unidadeRendimento: dados.unidadeRendimento,
    insumos: dados.composicao
      .map((item) => ({
        insumoId: item.insumoId,
        nome: item.nome,
        unidade: item.unidade,
        quantidadeEscalada: arredondar(item.quantidade * fatorMultiplicador),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    passos:
      passosValidados.success && passosValidados.data.length > 0
        ? [...passosValidados.data].sort((a, b) => a.ordem - b.ordem)
        : null,
    modoPreparoBruto: dados.modoPreparoBruto,
  };
}

/**
 * Busca todas as Fichas Técnicas do cardápio confirmado de um Evento e
 * aplica calcularFichaTecnicaEscalada em cada uma. Soma
 * Quantidade_Confirmada por Preparo (defensivo — o schema não impede
 * mais de uma linha de Itens_Evento_Confirmados pro mesmo Preparo no
 * mesmo Evento).
 */
export async function obterFichasTecnicasEvento(eventoId: number): Promise<FichaTecnicaEscalada[]> {
  const { db } = await import("@/db/client");
  const { eq, inArray, sql } = await import("drizzle-orm");
  const { itensEventoConfirmados } = await import("@/db/schema/orcamentos");
  const { preparos } = await import("@/db/schema/preparos");
  const { composicao } = await import("@/db/schema/composicao");
  const { insumos } = await import("@/db/schema/insumos");

  const confirmados = await db
    .select({
      preparoId: itensEventoConfirmados.preparoId,
      quantidadeConfirmada: sql<string>`sum(${itensEventoConfirmados.quantidadeConfirmada})`,
    })
    .from(itensEventoConfirmados)
    .where(eq(itensEventoConfirmados.eventoId, eventoId))
    .groupBy(itensEventoConfirmados.preparoId);

  if (confirmados.length === 0) return [];

  const preparoIds = confirmados.map((c) => c.preparoId);

  const [linhasPreparo, linhasComposicao] = await Promise.all([
    db.select().from(preparos).where(inArray(preparos.id, preparoIds)),
    db
      .select({
        preparoId: composicao.preparoId,
        insumoId: composicao.insumoId,
        quantidade: composicao.quantidade,
        nomeInsumo: insumos.nome,
        unidadeInsumo: insumos.unidade,
      })
      .from(composicao)
      .innerJoin(insumos, eq(composicao.insumoId, insumos.id))
      .where(inArray(composicao.preparoId, preparoIds)),
  ]);

  const preparoPorId = new Map(linhasPreparo.map((p) => [p.id, p]));
  const composicaoPorPreparoId = new Map<number, typeof linhasComposicao>();
  for (const linha of linhasComposicao) {
    const atual = composicaoPorPreparoId.get(linha.preparoId) ?? [];
    atual.push(linha);
    composicaoPorPreparoId.set(linha.preparoId, atual);
  }

  const fichas = confirmados
    .map((confirmado) => {
      const preparo = preparoPorId.get(confirmado.preparoId);
      if (!preparo) return null;

      return calcularFichaTecnicaEscalada({
        preparoId: preparo.id,
        nomePreparo: preparo.nomePreparo,
        rendimentoOriginal: Number(preparo.rendimento),
        unidadeRendimento: preparo.unidadeRendimento,
        quantidadeConfirmada: Number(confirmado.quantidadeConfirmada),
        composicao: (composicaoPorPreparoId.get(confirmado.preparoId) ?? []).map((c) => ({
          insumoId: c.insumoId,
          nome: c.nomeInsumo,
          unidade: c.unidadeInsumo,
          quantidade: Number(c.quantidade),
        })),
        passos: preparo.passos,
        modoPreparoBruto: preparo.modoPreparo,
      });
    })
    .filter((f): f is FichaTecnicaEscalada => f !== null);

  return fichas.sort((a, b) => a.nomePreparo.localeCompare(b.nomePreparo, "pt-BR"));
}

/** Controla a visibilidade do botão "Exportar Fichas Técnicas" na tela do Evento. */
export async function eventoTemCardapioConfirmado(eventoId: number): Promise<boolean> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { itensEventoConfirmados } = await import("@/db/schema/orcamentos");

  const [linha] = await db
    .select({ id: itensEventoConfirmados.id })
    .from(itensEventoConfirmados)
    .where(eq(itensEventoConfirmados.eventoId, eventoId))
    .limit(1);

  return linha != null;
}
