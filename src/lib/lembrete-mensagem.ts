export type EventoComPendencia = {
  cliente: string;
  /** Já formatado curto (ex.: "03/10"). */
  data: string;
  pendencias: string[];
};

/**
 * Uma mensagem consolidada por destinatário (menos mensagens = menos rajada).
 * Nomes de cliente e o que falta decidir; nunca telefones.
 */
export function montarMensagemLembrete(eventos: EventoComPendencia[]): string {
  const itens = eventos.map((e) => `• ${e.cliente} (${e.data}): ${e.pendencias.join("; ")}`);
  return [
    "Lembrete Anjos Eventos — eventos dos próximos 7 dias com decisões pendentes:",
    "",
    ...itens,
  ].join("\n");
}
