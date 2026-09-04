import type { StatusEvento } from "@/lib/eventos";

const rotulosStatus: Record<StatusEvento, string> = {
  orcado: "Orçado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const coresEmpresa: Record<string, string> = {
  "Buffet Senhor Churrasco": "bg-ember",
  "Anjos Cerimonial": "bg-brass",
  "Em Plena Natureza Chácara de Eventos": "bg-sage",
};

export function rotuloStatus(status: StatusEvento): string {
  return rotulosStatus[status];
}

export function corEmpresa(nomeEmpresa: string): string {
  return coresEmpresa[nomeEmpresa] ?? "bg-paper-dim";
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

export function paraInputDatetimeLocal(dataEvento: string): string {
  const data = new Date(dataEvento);
  const deslocamentoMs = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamentoMs).toISOString().slice(0, 16);
}
