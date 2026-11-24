/** Números e valores em reais por extenso, para o contrato ("R$ 1.675,00 (mil seiscentos e setenta e cinco reais)"). */

const UNIDADES = [
  "zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "catorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function unidade(n: number, feminino: boolean): string {
  if (feminino && n === 1) return "uma";
  if (feminino && n === 2) return "duas";
  return UNIDADES[n];
}

function ate999(n: number, feminino: boolean): string {
  if (n === 100) return "cem";
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (centena) partes.push(feminino ? CENTENAS[centena].replace(/os$/, "as") : CENTENAS[centena]);
  if (resto >= 20) {
    const u = resto % 10;
    partes.push(u ? `${DEZENAS[Math.floor(resto / 10)]} e ${unidade(u, feminino)}` : DEZENAS[Math.floor(resto / 10)]);
  } else if (resto) {
    partes.push(unidade(resto, feminino));
  }
  return partes.join(" e ");
}

/** Inteiro de 0 a 999.999.999.999 por extenso. `feminino` para "uma copeira", "duas pessoas". */
export function inteiroPorExtenso(n: number, feminino = false): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new RangeError("Número fora do intervalo: " + n);
  if (n === 0) return "zero";
  const bilhoes = Math.floor(n / 1e9);
  const milhoes = Math.floor((n % 1e9) / 1e6);
  const milhares = Math.floor((n % 1e6) / 1e3);
  const resto = n % 1e3;
  const grupos: Array<[valor: number, texto: string]> = [];
  if (bilhoes) grupos.push([bilhoes, `${ate999(bilhoes, false)} ${bilhoes === 1 ? "bilhão" : "bilhões"}`]);
  if (milhoes) grupos.push([milhoes, `${ate999(milhoes, false)} ${milhoes === 1 ? "milhão" : "milhões"}`]);
  if (milhares) grupos.push([milhares, milhares === 1 ? "mil" : `${ate999(milhares, feminino)} mil`]);
  if (resto) grupos.push([resto, ate999(resto, feminino)]);
  // "seis mil e setecentos", "cinco mil e vinte e cinco", mas "mil seiscentos e setenta e cinco".
  return grupos
    .map(([valor, texto], i) => {
      if (i === 0) return texto;
      const ultimo = i === grupos.length - 1;
      return (ultimo && (valor < 100 || valor % 100 === 0) ? " e " : " ") + texto;
    })
    .join("");
}

/** Valor em reais por extenso: 47.5 → "quarenta e sete reais e cinquenta centavos". */
export function valorPorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor < 0) throw new RangeError("Valor inválido: " + valor);
  const centavosTotais = Math.round(valor * 100);
  const inteiro = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  let reais = "";
  if (inteiro > 0) {
    const redondoMilhao = inteiro >= 1e6 && inteiro % 1e6 === 0;
    reais = `${inteiroPorExtenso(inteiro)} ${redondoMilhao ? "de reais" : inteiro === 1 ? "real" : "reais"}`;
  }
  const textoCentavos = centavos ? `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  if (reais && textoCentavos) return `${reais} e ${textoCentavos}`;
  return reais || textoCentavos || "zero reais";
}
