/**
 * Aviso de insumo com nome parecido, antes de cadastrar um novo. Funções puras (sem banco).
 * Só avisa: quem decide é o usuário. Nome IGUAL (ignorando maiúsculas, acento e espaços) é
 * duplicata e bloqueia — o banco já tem `nome` único.
 */

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "com", "e", "em", "para", "a", "o"]);

export type InsumoNome = { id: number; nome: string };

/** Minúsculas, sem acento, só letras/números, espaços únicos. */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function palavras(normalizado: string): string[] {
  return normalizado.split(" ").filter((p) => p && !PALAVRAS_VAZIAS.has(p));
}

/** Singular tosco ("tomates" -> "tomate"): só para comparar, nunca para exibir. */
function raiz(palavra: string): string {
  return palavra.length > 3 ? palavra.replace(/(es|s)$/, "") : palavra;
}

function distancia(a: string, b: string): number {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return linha[b.length];
}

export type Semelhanca = "igual" | "parecido";

export function semelhanca(novo: string, existente: string): Semelhanca | null {
  const a = normalizarNome(novo);
  const b = normalizarNome(existente);
  if (!a || !b) return null;
  if (a === b) return "igual";

  const pa = palavras(a).map(raiz);
  const pb = palavras(b).map(raiz);
  if (pa.length === 0 || pb.length === 0) return null;
  const sa = new Set(pa);
  const sb = new Set(pb);
  const comuns = [...sa].filter((p) => sb.has(p)).length;
  // Mesmas palavras, em outra ordem ou no plural.
  if (comuns === sa.size && comuns === sb.size) return "parecido";
  // Um nome contém o outro como palavras inteiras ("Tomate" x "Tomate Italiano").
  if (comuns === Math.min(sa.size, sb.size)) return "parecido";
  // Erro de digitação (até 2 letras em nomes de 5+ letras).
  if (Math.min(a.length, b.length) >= 5 && distancia(a, b) <= 2) return "parecido";
  return null;
}

export type ResultadoParecidos = { iguais: InsumoNome[]; parecidos: InsumoNome[] };

export function acharInsumosParecidos(novo: string, existentes: InsumoNome[]): ResultadoParecidos {
  const iguais: InsumoNome[] = [];
  const parecidos: InsumoNome[] = [];
  for (const e of existentes) {
    const s = semelhanca(novo, e.nome);
    if (s === "igual") iguais.push(e);
    else if (s === "parecido") parecidos.push(e);
  }
  return { iguais, parecidos: parecidos.slice(0, 8) };
}
