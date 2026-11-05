/**
 * Ajuste do teto de carne por acompanhamentos (decisão do Pedro, 2026-11-04; docs/REGRAS_NEGOCIO.md
 * seção 8). Núcleo puro: tipos, validação dos parâmetros e contagem. O teto ajustado em si é
 * calculado em dimensionamento-cardapio.ts (calcularTetoAjustado), junto de distribuirPorcoes.
 *
 *   A          = Σ peso_acompanhamento da macro de cada preparo selecionado (preparos distintos)
 *   excedente  = MAX(0, A − referencia)
 *   fator      = 1 − reducaoPorItem × excedente
 *   teto_ajust = MIN(teto_base, MAX(piso, teto_base × fator))
 */

export type ParametrosAjusteAcompanhamentos = {
  /** Quantos acompanhamentos (ponderados) o cardápio pode ter sem reduzir a carne. */
  referencia: number;
  /** Redução por acompanhamento acima da referência (0,05 = 5 %). */
  reducaoPorItem: number;
  /** Piso do teto ajustado, na unidade da macro. Acima do teto base, vale o teto base. */
  pisoG: number;
};

/** Como vem de configuracoes_globais: qualquer um nulo = ajuste desligado. */
export type ParametrosAjusteBrutos = {
  referencia: number | null;
  reducaoPorItem: number | null;
  pisoG: number | null;
};

export type AjusteAcompanhamentosAplicado = {
  contagem: number;
  referencia: number;
  reducao_por_item: number;
  piso_g: number;
  /** teto ajustado ÷ teto base, já com piso e limite (1 = sem redução). */
  fator_aplicado: number;
};

/** Resumo para a tela interna: "Proteínas Principais: 315 → 299 g por pessoa (6 acompanhamentos; referência 5)". */
export type AjusteTetoResumo = AjusteAcompanhamentosAplicado & {
  macro: string;
  unidade: string;
  teto_base: number;
  teto_ajustado: number;
};

/**
 * Todos nulos = recurso ainda não configurado: desligado, sem aviso.
 * Só alguns nulos, ou valor fora da faixa: desligado, com aviso (nunca lança exceção).
 */
export function validarParametrosAjuste(brutos: ParametrosAjusteBrutos): {
  parametros: ParametrosAjusteAcompanhamentos | null;
  aviso: string | null;
} {
  const { referencia, reducaoPorItem, pisoG } = brutos;
  const valores = [referencia, reducaoPorItem, pisoG];
  if (valores.every((v) => v == null)) return { parametros: null, aviso: null };
  if (referencia == null || reducaoPorItem == null || pisoG == null) {
    return {
      parametros: null,
      aviso: "Ajuste da carne por acompanhamentos desligado: falta configurar referência, redução ou piso.",
    };
  }
  const validos =
    valores.every((v) => Number.isFinite(v)) &&
    reducaoPorItem >= 0 &&
    reducaoPorItem < 1 &&
    referencia >= 0 &&
    pisoG > 0;
  if (!validos) {
    return {
      parametros: null,
      aviso: "Ajuste da carne por acompanhamentos desligado: parâmetros fora da faixa (redução entre 0 e 1, referência ≥ 0, piso > 0).",
    };
  }
  return { parametros: { referencia, reducaoPorItem, pisoG }, aviso: null };
}

/** Σ peso de acompanhamento, contando cada preparo uma vez só. Peso ausente ou ≤ 0 não conta. */
export function contarAcompanhamentos(
  itens: { preparoId: number; pesoAcompanhamentoMacro?: number }[]
): number {
  const porPreparo = new Map<number, number>();
  for (const item of itens) porPreparo.set(item.preparoId, item.pesoAcompanhamentoMacro ?? 0);
  let soma = 0;
  for (const peso of porPreparo.values()) if (peso > 0) soma += peso;
  return Number(soma.toFixed(4));
}

/** "Proteínas Principais: 315 → 299 g por pessoa (6 acompanhamentos; referência 5)". */
export function textoAjusteTeto(a: AjusteTetoResumo): string {
  const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const acompanhamentos = a.contagem === 1 ? "acompanhamento" : "acompanhamentos";
  return `${a.macro}: ${num(a.teto_base)} → ${num(a.teto_ajustado)} ${a.unidade} por pessoa (${num(a.contagem)} ${acompanhamentos}; referência ${num(a.referencia)})`;
}
