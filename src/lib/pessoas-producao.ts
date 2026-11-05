/**
 * Pessoas para a PRODUÇÃO (decisão do Pedro, 2026-11-04): criança come cerca de metade do adulto,
 * então conta como meia porção no dimensionamento (quantidades, ficha técnica e lista de compras).
 * Não muda o número de convidados, o preço (criança paga meia) nem a equipe.
 */
export function pessoasParaProducao(d: { adultos: number; criancasAte5: number; criancas5a10: number }): number {
  return d.adultos + (d.criancasAte5 + d.criancas5a10) / 2;
}

/**
 * Orçamento: sem a divisão adultos/crianças (orçamento antigo) ou com ela zerada, usa o total de
 * convidados, como antes.
 */
export function pessoasParaProducaoOrcamento(o: {
  numConvidados: number;
  qtdAdultos: number | null;
  qtdCriancasAte5: number | null;
  qtdCriancas5a10: number | null;
}): number {
  if (o.qtdAdultos == null) return o.numConvidados;
  const pessoas = pessoasParaProducao({
    adultos: o.qtdAdultos,
    criancasAte5: o.qtdCriancasAte5 ?? 0,
    criancas5a10: o.qtdCriancas5a10 ?? 0,
  });
  return pessoas > 0 ? pessoas : o.numConvidados;
}
