/**
 * Indicadores do funil de prospecção. Funções puras sobre contagens que a
 * consulta (src/lib/prospeccao.ts) já trouxe.
 *
 * Critérios (também exibidos na tela):
 * - "contatados" = leads com ao menos um envio CONFIRMADO pelo usuário.
 *   Mensagem gerada, aprovada ou canal aberto não conta.
 * - taxa de resposta = leads que responderam ÷ leads contatados.
 * - sem denominador → taxa null ("—"); amostra < AMOSTRA_MINIMA → marcada como pequena.
 */

export const AMOSTRA_MINIMA = 20;

export type Taxa = { valor: number | null; amostraPequena: boolean; numerador: number; denominador: number };

export function taxa(numerador: number, denominador: number): Taxa {
  return {
    valor: denominador > 0 ? numerador / denominador : null,
    amostraPequena: denominador > 0 && denominador < AMOSTRA_MINIMA,
    numerador,
    denominador,
  };
}

export function formatarTaxa(t: Taxa): string {
  if (t.valor === null) return "—";
  const pct = `${Math.round(t.valor * 100)}%`;
  return `${pct} (${t.numerador}/${t.denominador})`;
}

export type FunilLead = {
  contatado: boolean;
  respondeu: boolean;
  reuniao: boolean;
  proposta: boolean;
  convertido: boolean;
};

export type LinhaSegmento = {
  segmento: string;
  leads: number;
  contatados: number;
  responderam: number;
  reunioes: number;
  propostas: number;
  conversoes: number;
  taxaResposta: Taxa;
};

/** Agrupa leads por uma chave (categoria, município, prioridade, origem). */
export function resultadosPorSegmento<T extends FunilLead>(
  leads: T[],
  chave: (l: T) => string,
): LinhaSegmento[] {
  const grupos = new Map<string, T[]>();
  for (const l of leads) {
    const k = chave(l);
    grupos.set(k, [...(grupos.get(k) ?? []), l]);
  }
  return [...grupos.entries()]
    .map(([segmento, ls]) => {
      const contatados = ls.filter((l) => l.contatado).length;
      // Resposta sem envio confirmado (ex.: o lead procurou a gente) não entra na taxa.
      const responderam = ls.filter((l) => l.contatado && l.respondeu).length;
      return {
        segmento,
        leads: ls.length,
        contatados,
        responderam,
        reunioes: ls.filter((l) => l.reuniao).length,
        propostas: ls.filter((l) => l.proposta).length,
        conversoes: ls.filter((l) => l.convertido).length,
        taxaResposta: taxa(responderam, contatados),
      };
    })
    .sort((a, b) => b.leads - a.leads || a.segmento.localeCompare(b.segmento));
}
