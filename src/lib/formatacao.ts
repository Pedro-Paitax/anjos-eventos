import type { StatusEvento } from "@/lib/eventos";

const rotulosStatus: Record<StatusEvento, string> = {
  orcado: "Orçado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export function rotuloStatus(status: StatusEvento): string {
  return rotulosStatus[status];
}

export function formatarData(dataEvento: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dataEvento));
}

export function formatarHora(dataEvento: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dataEvento));
}

export function formatarValor(valor: string | null): string | null {
  if (valor === null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor));
}

/** "AAAA-MM-DD" da data do evento (getters locais, como o calendário agrupa por dia); âncora da visão "Em sequência". */
export function chaveDiaEvento(dataEvento: string | Date): string {
  const d = new Date(dataEvento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function chaveAnoMes(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function nomeMes(ano: number, mesIndice: number): string {
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    new Date(ano, mesIndice, 1)
  );
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function paraInputDatetimeLocal(dataEvento: string): string {
  const data = new Date(dataEvento);
  const deslocamentoMs = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamentoMs).toISOString().slice(0, 16);
}

export function paraInputDate(data: string): string {
  const dataObj = new Date(data);
  const deslocamentoMs = dataObj.getTimezoneOffset() * 60_000;
  return new Date(dataObj.getTime() - deslocamentoMs).toISOString().slice(0, 10);
}

export function paraInputTime(hora: string): string {
  return hora.slice(0, 5);
}

/** Fuso em que a equipe trabalha; "hoje" para o cartão "em N dias" é a data de calendário nele. */
const FUSO_EQUIPE = "America/Sao_Paulo";

function diaDeCalendarioNoFuso(agora: Date): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_EQUIPE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return Date.UTC(valor("year"), valor("month") - 1, valor("day")) / 86_400_000;
}

/**
 * Dias de calendário entre hoje (America/Sao_Paulo) e a data do evento: 0 = hoje,
 * 1 = amanhã. Diferença de datas, não de horas. `timestamp` sem fuso chega do pg
 * como Date no fuso do processo, então os getters locais devolvem a data gravada.
 */
export function diasAteEvento(dataEvento: string | Date, agora: Date = new Date()): number {
  const d = new Date(dataEvento);
  const diaEvento = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  return diaEvento - diaDeCalendarioNoFuso(agora);
}

/** "hoje", "amanhã" ou "em N dias"; null para data passada (a lista da Home nunca traz). */
export function rotuloEmDias(dias: number): string | null {
  if (dias < 0) return null;
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

/** Partes da data para o tile: "sex.", "09", "out." (mesmo fuso de formatarData). */
export function partesDataEvento(dataEvento: string | Date) {
  const d = new Date(dataEvento);
  return {
    semana: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d),
    dia: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(d),
    mes: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(d),
  };
}

const varsEmpresa: Record<string, string> = {
  "Buffet Senhor Churrasco": "var(--color-emp-churrasco)",
  "Anjos Cerimonial": "var(--color-emp-cerimonial)",
  "Em Plena Natureza Chácara de Eventos": "var(--color-emp-chacara)",
};

/** Cor da empresa (tokens emp-* do Brasa) para ponto e tinta; neutra se a empresa não for conhecida. */
export function varCorEmpresa(nomeEmpresa: string): string {
  return varsEmpresa[nomeEmpresa] ?? "var(--color-texto-suave)";
}
