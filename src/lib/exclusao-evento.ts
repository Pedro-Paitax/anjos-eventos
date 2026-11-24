/**
 * Regra de exclusão de evento (decisão de 23/11, redesenho da criação de
 * eventos): excluir é para cadastro feito por engano. Depois que a lista de
 * compras foi enviada ou a Ordem de Ação saiu, o evento já gerou efeito fora
 * do sistema; nesse caso a exclusão é recusada e a tela sugere cancelar.
 * Função pura, testada em exclusao-evento.test.ts.
 */
export type MarcasEnvioEvento = {
  listaComprasEnviadaEm: Date | null;
  ordensDisparadasEm: Date | null;
};

function dataCurta(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

export function motivoBloqueioExclusao(marcas: MarcasEnvioEvento | null): string | null {
  if (!marcas) return null;
  const sugestao = "Para tirar o evento da agenda, mude o status para Cancelado em Editar.";
  if (marcas.listaComprasEnviadaEm) {
    return `A lista de compras deste evento já foi enviada (${dataCurta(marcas.listaComprasEnviadaEm)}), então ele não pode ser excluído. ${sugestao}`;
  }
  if (marcas.ordensDisparadasEm) {
    return `A Ordem de Ação deste evento já foi enviada (${dataCurta(marcas.ordensDisparadasEm)}), então ele não pode ser excluído. ${sugestao}`;
  }
  return null;
}
