export { campoClasse, rotuloClasse } from "@/components/campo";
export const secaoTituloClasse =
  "font-titulo text-xl font-semibold leading-[1.2] tracking-[-0.01em]";

/** Status do evento, na ordem do select do formulário (valores gravados em `eventos.status`). */
export const OPCOES_STATUS_EVENTO = [
  { valor: "orcado", rotulo: "Orçado" },
  { valor: "confirmado", rotulo: "Confirmado" },
  { valor: "realizado", rotulo: "Realizado" },
  { valor: "cancelado", rotulo: "Cancelado" },
];
