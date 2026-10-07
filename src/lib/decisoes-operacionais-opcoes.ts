/**
 * Opções fixas dos campos de logística das Decisões Operacionais. As colunas
 * são `text` (sem enum no banco): a lista vive só aqui e é usada pelo
 * formulário, pela Server Action e pelas pendências.
 */

export const OPCOES_VEICULO = ["Master", "Kombi Nova", "Kombi Velha", "Outro/Terceiro"] as const;
export const OPCOES_MODELO_PRATO = ["Redondo pequeno", "Redondo grande", "Quadrado"] as const;
export const OPCOES_COPO_TACA = ["Copo", "Taça"] as const;
export const OPCOES_TALHER = ["Grande", "Pequeno"] as const;

export type Veiculo = (typeof OPCOES_VEICULO)[number];
export type ModeloPrato = (typeof OPCOES_MODELO_PRATO)[number];
export type CopoTaca = (typeof OPCOES_COPO_TACA)[number];
export type Talher = (typeof OPCOES_TALHER)[number];

export type CampoOpcao = "veiculo" | "modeloPrato" | "tipoBebidaRecipiente" | "tipoTalher";

export const OPCOES_POR_CAMPO: Record<CampoOpcao, readonly string[]> = {
  veiculo: OPCOES_VEICULO,
  modeloPrato: OPCOES_MODELO_PRATO,
  tipoBebidaRecipiente: OPCOES_COPO_TACA,
  tipoTalher: OPCOES_TALHER,
};

export const ROTULOS_CAMPO: Record<CampoOpcao, string> = {
  veiculo: "Veículo",
  modeloPrato: "Modelo do prato",
  tipoBebidaRecipiente: "Copo / taça (bebida)",
  tipoTalher: "Talher",
};

export function valorValido(campo: CampoOpcao, valor: string): boolean {
  return OPCOES_POR_CAMPO[campo].includes(valor);
}

/** Valor já gravado (texto livre) que não está na lista atual. */
export function ehValorLegado(campo: CampoOpcao, valor: string | null | undefined): boolean {
  return !!valor && valor.trim() !== "" && !valorValido(campo, valor);
}

const INTEIRO_MAXIMO = 2147483647; // limite da coluna integer

/**
 * Quantidade de taças (furta-cor ou champanhe): nula sem a caixa marcada; com a caixa,
 * inteiro >= 1. Registros antigos (caixa marcada, sem quantidade) continuam como estão
 * no banco; só um novo salvamento exige a quantidade.
 */
export function validarQuantidadeTacas(
  marcada: boolean,
  texto: string,
  rotulo: string
): { valor: number | null; erro?: string } {
  if (!marcada) return { valor: null };
  const t = texto.trim();
  if (!t) return { valor: null, erro: `Informe a quantidade de ${rotulo}.` };
  const numero = Number(t);
  if (!/^\d+$/.test(t) || numero < 1 || numero > INTEIRO_MAXIMO) {
    return {
      valor: null,
      erro: `Quantidade de ${rotulo} inválida: use um número inteiro a partir de 1.`,
    };
  }
  return { valor: numero };
}
