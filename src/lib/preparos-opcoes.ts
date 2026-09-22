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

// Nome real do campo no NocoDB é "UOM Rendimento". O NocoDB permite também
// KG/Pessoas, mas nenhum Preparo real usa (0 registros — conferido ao vivo)
// e o enum do Postgres novo (`unidade_rendimento_enum`,
// src/db/schema/preparos.ts) só aceita G/ML/Unidade. Decisão do Pedro
// (2026-09-22): restringir o formulário a essas 3, não ampliar o enum.
export const UNIDADES_RENDIMENTO_PREPARO = ["G", "ML", "Unidade"] as const;
export type UnidadeRendimentoPreparo = (typeof UNIDADES_RENDIMENTO_PREPARO)[number];

// Nome real do campo no NocoDB é "Restrições" (mapeado aqui do "Tags" do
// pedido original, que não existe como campo próprio).
export const RESTRICOES_PREPARO = ["Sem Gluten", "Sem Lactose", "Vegano", "Vegetariano"] as const;

export const SUBCATEGORIAS_PROTEINA = ["Carne Vermelha", "Ovino", "Suíno", "Peixe", "Aves"] as const;
export type SubcategoriaProteina = (typeof SUBCATEGORIAS_PROTEINA)[number];

export const UNIDADES_INSUMO = ["KG", "Litro", "Maço", "Unidade"] as const;
export type UnidadeInsumo = (typeof UNIDADES_INSUMO)[number];
