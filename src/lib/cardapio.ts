export type Preparo = { id: number; nome: string };

// Categorias do cardápio, na ordem em que aparecem no formulário.
// "Molhos" fica de fora (não vira seção do cardápio) e "Guarnições" no
// NocoDB é tratada como "Acompanhamentos" aqui.
export const CATEGORIAS_CARDAPIO = [
  "Entrada",
  "Acompanhamentos",
  "Carnes",
  "Saladas",
  "Bebidas",
  "Sobremesa",
] as const;

export type CategoriaCardapio = (typeof CATEGORIAS_CARDAPIO)[number];
