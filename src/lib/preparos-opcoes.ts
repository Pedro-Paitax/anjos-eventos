// Opções reais dos campos select de Preparos/Insumos (confirmadas no
// NocoDB). Arquivo sem "server-only" porque os formulários (client
// components) também precisam dessas listas pra montar os <select>.

export const CATEGORIAS_PREPARO = [
  "Carnes",
  "Entrada",
  "Guarnições",
  "Massas",
  "Molhos",
  "Saladas",
  "Sobremesa",
  "Bebidas",
] as const;
export type CategoriaPreparo = (typeof CATEGORIAS_PREPARO)[number];

// Nome real do campo no NocoDB é "UOM Rendimento".
export const UNIDADES_RENDIMENTO_PREPARO = ["G", "ML", "Unidade", "KG", "Pessoas"] as const;
export type UnidadeRendimentoPreparo = (typeof UNIDADES_RENDIMENTO_PREPARO)[number];

// Nome real do campo no NocoDB é "Restrições" (mapeado aqui do "Tags" do
// pedido original, que não existe como campo próprio).
export const RESTRICOES_PREPARO = ["Sem Gluten", "Sem Lactose", "Vegano", "Vegetariano"] as const;

export const SUBCATEGORIAS_PROTEINA = ["Carne Vermelha", "Ovino", "Suíno", "Peixe", "Aves"] as const;
export type SubcategoriaProteina = (typeof SUBCATEGORIAS_PROTEINA)[number];

export const UNIDADES_INSUMO = ["KG", "Litro", "Maço", "Unidade"] as const;
export type UnidadeInsumo = (typeof UNIDADES_INSUMO)[number];
