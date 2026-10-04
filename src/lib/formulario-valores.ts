/**
 * React 19 zera os campos não controlados de um <form action> depois que a
 * Server Action termina, inclusive quando ela devolve erro de validação.
 * Para o usuário não perder o que digitou, a action devolve os valores
 * enviados no estado e o formulário os usa como defaultValue.
 */
export type ValoresFormulario = Record<string, string>;

export function valoresEnviados(formData: FormData): ValoresFormulario {
  const valores: ValoresFormulario = {};
  for (const [campo, valor] of formData.entries()) {
    // Arquivos não se aplicam; campos repetidos (checkboxes) ficam com o 1º.
    if (typeof valor === "string" && !(campo in valores) && !campo.startsWith("$ACTION")) {
      valores[campo] = valor;
    }
  }
  return valores;
}
