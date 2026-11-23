import "server-only";
import type { FichaTecnicaEscalada } from "@/lib/ficha-tecnica-evento";
import { converterParaEmbalagens, type CompraEmEmbalagens, type EmbalagemCompra } from "@/lib/embalagem-compra";

/**
 * Lista de compras do evento. Parte da MESMA escala da Ficha Técnica
 * ((convidados x 1,10) / rendimento do preparo, já com o buffer de 10%) e só
 * divide pelo Fator de Correção do insumo. NÃO reaplica o buffer.
 */

export type DadosInsumoCompra = {
  /** null/vazio = sem preço cadastrado (ex.: água). */
  preco: number | null;
  /** null/vazio/<= 0 = usa 1 e marca "sem fator". */
  fatorCorrecao: number | null;
  /** Embalagem de compra (migração 0015). Ausente/null = sem embalagem, a lista mostra só a unidade do insumo. */
  embalagem?: EmbalagemCompra | null;
};

export type ItemListaCompras = {
  insumoId: number;
  nome: string;
  unidade: string;
  /** Já arredondada para cima conforme a unidade. */
  quantidadeCompra: number;
  semPreco: boolean;
  semFator: boolean;
  /** Presente só quando o insumo tem embalagem de compra. `quantidadeCompra` segue na unidade do insumo. */
  embalagem?: CompraEmEmbalagens;
};

const UNIDADES_INTEIRAS = new Set(["unidade", "maço", "maco"]);
const UNIDADES_DECIMAIS = new Set(["kg", "litro"]);

/** Sobe para o múltiplo de `passo`, ignorando ruído de ponto flutuante. */
function subirPara(valor: number, passo: number): number {
  const passos = Math.ceil(Number((valor / passo).toFixed(6)));
  return Number((passos * passo).toFixed(6));
}

/**
 * Unidade e Maço: inteiro. KG e Litro: abaixo de 1, passos de 0,01 (tempero de gramas não vira 0,1 kg);
 * a partir de 1, passos de 0,1. Outra: 0,01 (não inventa regra).
 */
export function arredondarCompra(quantidade: number, unidade: string): number {
  const u = unidade.trim().toLowerCase();
  if (UNIDADES_INTEIRAS.has(u)) return subirPara(quantidade, 1);
  if (UNIDADES_DECIMAIS.has(u)) return subirPara(quantidade, quantidade < 1 ? 0.01 : 0.1);
  return subirPara(quantidade, 0.01);
}

/**
 * Núcleo puro. `dadosInsumo` traz preço e fator por insumoId; insumo ausente
 * do mapa conta como sem preço e sem fator.
 */
export function calcularListaCompras(
  fichas: FichaTecnicaEscalada[],
  dadosInsumo: Map<number, DadosInsumoCompra>,
): ItemListaCompras[] {
  const bruto = new Map<number, { nome: string; unidade: string; soma: number; semFator: boolean }>();

  for (const ficha of fichas) {
    for (const insumo of ficha.insumos) {
      const fator = dadosInsumo.get(insumo.insumoId)?.fatorCorrecao;
      const semFator = fator == null || !Number.isFinite(fator) || fator <= 0;
      const necessario = insumo.quantidadeExata / (semFator ? 1 : fator);
      const atual = bruto.get(insumo.insumoId);
      if (atual) atual.soma += necessario;
      else
        bruto.set(insumo.insumoId, {
          nome: insumo.nome,
          unidade: insumo.unidade,
          soma: necessario,
          semFator,
        });
    }
  }

  return [...bruto.entries()]
    .map(([insumoId, v]) => {
      const preco = dadosInsumo.get(insumoId)?.preco;
      const quantidadeCompra = arredondarCompra(v.soma, v.unidade);
      const embalagem = converterParaEmbalagens(quantidadeCompra, dadosInsumo.get(insumoId)?.embalagem);
      return {
        insumoId,
        nome: v.nome,
        unidade: v.unidade,
        quantidadeCompra,
        semPreco: preco == null || !Number.isFinite(preco),
        semFator: v.semFator,
        ...(embalagem ? { embalagem } : {}),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export type ListaComprasEvento = {
  /** Vazio quando o evento não tem itens confirmados. */
  itens: ItemListaCompras[];
  temCardapioConfirmado: boolean;
};

function numeroOuNull(valor: string | null): number | null {
  if (valor == null || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

export async function obterListaComprasEvento(eventoId: number): Promise<ListaComprasEvento> {
  const { obterFichasTecnicasEvento } = await import("@/lib/ficha-tecnica-evento");
  const fichas = await obterFichasTecnicasEvento(eventoId);
  if (fichas.length === 0) return { itens: [], temCardapioConfirmado: false };

  const { db } = await import("@/db/client");
  const { inArray } = await import("drizzle-orm");
  const { insumos } = await import("@/db/schema/insumos");

  const ids = [...new Set(fichas.flatMap((f) => f.insumos.map((i) => i.insumoId)))];
  const linhas = ids.length
    ? await db
        .select({ id: insumos.id, preco: insumos.preco, fatorCorrecao: insumos.fatorCorrecao })
        .from(insumos)
        .where(inArray(insumos.id, ids))
    : [];
  // Embalagem em consulta própria, com try/catch: sem a migração 0015 a lista sai como antes.
  const { obterEmbalagensCompra } = await import("@/lib/embalagem-insumo");
  const embalagens = await obterEmbalagensCompra(ids);
  const dados = new Map(
    linhas.map((l) => [
      l.id,
      {
        preco: numeroOuNull(l.preco),
        fatorCorrecao: numeroOuNull(l.fatorCorrecao),
        embalagem: embalagens.get(l.id) ?? null,
      },
    ]),
  );
  return { itens: calcularListaCompras(fichas, dados), temCardapioConfirmado: true };
}
