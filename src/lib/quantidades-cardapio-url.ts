/**
 * Endereço do PDF "Quantidades do cardápio" do Simulador. Montado na tela (link que abre o PDF numa aba,
 * o que no celular já traz o botão de compartilhar) e lido pela rota. Sem dependências: entra no bundle
 * do cliente.
 */

export const CAMINHO_QUANTIDADES_PDF = "/simulador-cardapio/quantidades-pdf";

export type ParametrosQuantidades = {
  preparoIds: number[];
  adultos: number;
  criancasAte5: number;
  criancas5a10: number;
};

const MAX_PREPAROS = 200;
const MAX_PESSOAS = 100_000;

export function montarUrlQuantidadesPdf(p: ParametrosQuantidades): string {
  const busca = new URLSearchParams({
    preparos: p.preparoIds.join(","),
    adultos: String(p.adultos),
    criancasAte5: String(p.criancasAte5),
    criancas5a10: String(p.criancas5a10),
  });
  return `${CAMINHO_QUANTIDADES_PDF}?${busca.toString()}`;
}

function inteiro(texto: string | null, minimo: number, maximo: number): number | null {
  if (texto === null || texto.trim() === "") return minimo === 0 ? 0 : null;
  if (!/^\d+$/.test(texto.trim())) return null;
  const valor = Number(texto);
  return Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo ? valor : null;
}

export function lerParametrosQuantidades(busca: URLSearchParams): ParametrosQuantidades | { erro: string } {
  const brutos = (busca.get("preparos") ?? "").split(",").filter((t) => t.trim() !== "");
  if (brutos.length === 0) return { erro: "Selecione ao menos um item do cardápio." };
  if (brutos.length > MAX_PREPAROS) return { erro: "Itens demais na seleção." };
  const ids = brutos.map((t) => inteiro(t, 1, Number.MAX_SAFE_INTEGER));
  if (ids.some((id) => id === null)) return { erro: "Item de cardápio inválido." };

  const adultos = inteiro(busca.get("adultos"), 0, MAX_PESSOAS);
  const criancasAte5 = inteiro(busca.get("criancasAte5"), 0, MAX_PESSOAS);
  const criancas5a10 = inteiro(busca.get("criancas5a10"), 0, MAX_PESSOAS);
  if (adultos === null || criancasAte5 === null || criancas5a10 === null) {
    return { erro: "Quantidade de convidados inválida." };
  }
  if (adultos + criancasAte5 + criancas5a10 <= 0) return { erro: "Informe a quantidade de convidados." };

  return { preparoIds: [...new Set(ids as number[])], adultos, criancasAte5, criancas5a10 };
}
