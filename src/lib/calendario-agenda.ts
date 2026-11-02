/**
 * Regras puras do calendário mensal da Agenda (sem banco, sem React).
 * Datas pelos getters locais, o mesmo critério de `chaveDiaEvento` (formatacao.ts).
 */

export type CelulaMes = { dia: number } | null;

/** Ano e mês (índice 0–11) de "AAAA-MM"; texto inválido cai no mês de `hoje`. */
export function interpretarMes(param: string | undefined, hoje: Date): { ano: number; mesIndice: number } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(param ?? "");
  return m ? { ano: Number(m[1]), mesIndice: Number(m[2]) - 1 } : { ano: hoje.getFullYear(), mesIndice: hoje.getMonth() };
}

/** Células da grade (semanas de domingo a sábado): vazios antes do dia 1 e depois do último dia. */
export function celulasDoMes(ano: number, mesIndice: number): CelulaMes[] {
  const primeiroDiaSemana = new Date(ano, mesIndice, 1).getDay();
  const diasNoMes = new Date(ano, mesIndice + 1, 0).getDate();
  const celulas: CelulaMes[] = [
    ...Array.from({ length: primeiroDiaSemana }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => ({ dia: i + 1 })),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);
  return celulas;
}

/** Eventos do mês agrupados pelo dia (1–31), ordenados por horário dentro do dia. */
export function agruparPorDia<T extends { data_evento: string }>(
  eventos: T[],
  ano: number,
  mesIndice: number,
): Map<number, T[]> {
  const porDia = new Map<number, T[]>();
  for (const evento of eventos) {
    const data = new Date(evento.data_evento);
    if (data.getFullYear() !== ano || data.getMonth() !== mesIndice) continue;
    const dia = data.getDate();
    porDia.set(dia, [...(porDia.get(dia) ?? []), evento]);
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime());
  }
  return porDia;
}

/** Dia escolhido na URL (`dia=29`), só se existir naquele mês; senão null (mês inteiro). */
export function diaSelecionado(param: string | undefined, ano: number, mesIndice: number): number | null {
  if (!/^\d{1,2}$/.test(param ?? "")) return null;
  const dia = Number(param);
  const diasNoMes = new Date(ano, mesIndice + 1, 0).getDate();
  return dia >= 1 && dia <= diasNoMes ? dia : null;
}

/** "AAAA-MM" do mês anterior (−1) ou seguinte (+1). */
export function mesAdjacente(ano: number, mesIndice: number, delta: number): string {
  const d = new Date(ano, mesIndice + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
