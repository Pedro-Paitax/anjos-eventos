/**
 * "É o Buffet Senhor Churrasco?" decidido pelo NOME da empresa. Função pura,
 * sem acesso a banco, para poder ser usada também em componentes de cliente.
 *
 * Antes a confirmação do Orçamento decidia isso por "tem itens de cardápio",
 * e um orçamento de churrasco sem cardápio virava evento sem preço nem valor
 * (auditoria de 23/11, defeito D5).
 */
export const NOME_EMPRESA_SENHOR_CHURRASCO = "Buffet Senhor Churrasco";

export function ehEmpresaSenhorChurrasco(empresaNome: string | null | undefined): boolean {
  return empresaNome === NOME_EMPRESA_SENHOR_CHURRASCO;
}
