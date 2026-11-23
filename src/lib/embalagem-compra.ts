/**
 * Embalagem de COMPRA do insumo (migração 0015). Só a lista de compras usa:
 * custo, ficha técnica e dimensionamento continuam na unidade do insumo.
 * Funções puras (sem banco), para teste.
 */

export type EmbalagemCompra = {
  /** Ex.: "bandeja". */
  nome: string;
  /** Quantidade por embalagem, na unidade do insumo (ex.: 6 Unidade, 0,5 KG). Sempre > 0. */
  quantidade: number;
};

export type CompraEmEmbalagens = {
  nome: string;
  tamanho: number;
  /** Embalagens inteiras a comprar (arredondado para cima). */
  embalagens: number;
};

/** Sobe para inteiro, ignorando ruído de ponto flutuante (0,6 / 0,2 não vira 4). */
function subirInteiro(valor: number): number {
  return Math.ceil(Number(valor.toFixed(6)));
}

/** Insumo sem embalagem (null) continua como hoje. `quantidadeCompra` já vem arredondada pela unidade. */
export function converterParaEmbalagens(
  quantidadeCompra: number,
  embalagem: EmbalagemCompra | null | undefined,
): CompraEmEmbalagens | null {
  if (!embalagem || !(embalagem.quantidade > 0) || !embalagem.nome.trim()) return null;
  return {
    nome: embalagem.nome.trim(),
    tamanho: embalagem.quantidade,
    embalagens: subirInteiro(quantidadeCompra / embalagem.quantidade),
  };
}

/** "bandeja" -> "bandejas"; "pacote" -> "pacotes"; termina em r/z -> "es"; outro final fica igual. */
export function nomeEmbalagem(nome: string, quantidade: number): string {
  if (quantidade === 1) return nome;
  if (/[aeiouáéíóúâêôãõ]$/i.test(nome)) return `${nome}s`;
  if (/[rz]$/i.test(nome)) return `${nome}es`;
  return nome;
}

function numeroBr(valor: number): string {
  return String(Number(valor.toFixed(3))).replace(".", ",");
}

/** "69 unidades", "14,2 kg", "2,5 L", "3 maços". */
export function textoQuantidadeUnidade(quantidade: number, unidade: string): string {
  const u = unidade.trim().toLowerCase();
  const n = numeroBr(quantidade);
  if (u === "kg") return `${n} kg`;
  if (u === "litro") return `${n} L`;
  if (u === "unidade") return `${n} ${quantidade === 1 ? "unidade" : "unidades"}`;
  if (u === "maço" || u === "maco") return `${n} ${quantidade === 1 ? "maço" : "maços"}`;
  return `${n} ${unidade}`;
}

/** Ex.: "bandejas (69 unidades)"; para o resto do texto da lista, só a unidade. */
export function textoUnidadeComEmbalagem(
  embalagens: CompraEmEmbalagens,
  quantidadeCompra: number,
  unidade: string,
): string {
  return `${nomeEmbalagem(embalagens.nome, embalagens.embalagens)} (${textoQuantidadeUnidade(quantidadeCompra, unidade)})`;
}

export const EMBALAGEM_NOME_MAX = 40;

/** Campos opcionais do formulário: os dois vazios = sem embalagem; um só preenchido = erro. */
export function validarEmbalagem(
  nomeBruto: string,
  quantidadeBruta: string,
): { embalagem: EmbalagemCompra | null } | { erro: string } {
  const nome = nomeBruto.trim();
  const qtdTexto = quantidadeBruta.trim().replace(",", ".");
  if (!nome && !qtdTexto) return { embalagem: null };
  if (!nome || !qtdTexto) {
    return { erro: "Embalagem de compra: preencha o nome e a quantidade, ou deixe os dois vazios." };
  }
  if (nome.length > EMBALAGEM_NOME_MAX) {
    return { erro: `Nome da embalagem com no máximo ${EMBALAGEM_NOME_MAX} caracteres.` };
  }
  const quantidade = Number(qtdTexto);
  if (!Number.isFinite(quantidade) || !(quantidade > 0) || quantidade >= 10_000_000) {
    return { erro: "Quantidade por embalagem deve ser maior que zero." };
  }
  return { embalagem: { nome, quantidade } };
}
