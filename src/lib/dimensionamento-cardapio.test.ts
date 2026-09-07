import { describe, expect, it } from "vitest";
import { distribuirPorcoes, type ItemResolvido } from "@/lib/dimensionamento-cardapio";

// Cenário validado manualmente com os 3 preparos reais (Vinagrete, Alcatra
// Grelhada, Arroz Branco com Alho Crispy). As macro-categorias e tetos são
// REAIS (confirmados no NocoDB); os pesos e Num_Convidados são FICTÍCIOS,
// já que nenhum preparo tem Peso_Atratividade/Subcategoria_Proteina
// cadastrado ainda — ver docs/DECISOES.md.
const NUM_CONVIDADOS = 50;

const vinagrete: ItemResolvido = {
  preparoId: 2, // real
  preparoNome: "Vinagrete",
  peso: 1, // fictício
  origemPeso: "Peso_Atratividade (fictício - teste)",
  porcaoMaximaIndividual: null,
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150, // real (Macro_Categorias)
  unidade: "g",
};

const arrozComHardCap: ItemResolvido = {
  preparoId: 13, // real
  preparoNome: "Arroz Branco com Alho Crispy",
  peso: 3, // fictício
  origemPeso: "Peso_Atratividade (fictício - teste)",
  porcaoMaximaIndividual: 80, // fictício — força o Hard Cap (calculado seria 112.5g)
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150, // real
  unidade: "g",
};

const alcatra: ItemResolvido = {
  preparoId: 12, // real
  preparoNome: "Alcatra Grelhada",
  peso: 2.0, // real (Hierarquia_Proteina, Carne Vermelha)
  origemPeso: "Hierarquia_Proteina (Carne Vermelha)",
  porcaoMaximaIndividual: null,
  macroCategoriaChave: "Proteínas Principais",
  macroCategoriaNome: "Proteínas Principais",
  capacidadeTeto: 400, // real
  unidade: "g",
};

describe("distribuirPorcoes", () => {
  it("distribui o teto da macro-categoria proporcionalmente ao peso de cada item", () => {
    const resultado = distribuirPorcoes([vinagrete, { ...arrozComHardCap, porcaoMaximaIndividual: null }], NUM_CONVIDADOS);

    const grupo = resultado.find((g) => g.macro_categoria === "Carboidratos Densos");
    const item = grupo?.itens.find((i) => i.preparo === "Vinagrete");

    // soma de pesos = 1 + 3 = 4 -> Vinagrete = 150 * (1/4)
    expect(item?.porcao_calculada).toBe(37.5);
    expect(item?.porcao_final).toBe(37.5);
    expect(item?.volume_necessario_total).toBe(37.5 * NUM_CONVIDADOS);
  });

  it("aplica o Hard Cap (Porcao_Maxima_Individual) sem redistribuir o excedente pros outros itens do grupo", () => {
    const resultado = distribuirPorcoes([vinagrete, arrozComHardCap], NUM_CONVIDADOS);

    const grupo = resultado.find((g) => g.macro_categoria === "Carboidratos Densos");
    const arroz = grupo?.itens.find((i) => i.preparo === "Arroz Branco com Alho Crispy");
    const vinagreteResultado = grupo?.itens.find((i) => i.preparo === "Vinagrete");

    // calculado seria 150 * (3/4) = 112.5, mas o Hard Cap trava em 80
    expect(arroz?.porcao_calculada).toBe(112.5);
    expect(arroz?.porcao_final).toBe(80);
    expect(arroz?.volume_necessario_total).toBe(80 * NUM_CONVIDADOS);

    // limitação conhecida e aceita (REGRAS_NEGOCIO.md seção 8): o excedente
    // do Hard Cap NÃO é realocado — Vinagrete continua com a mesma porção
    // que teria se o Arroz não tivesse Hard Cap nenhum.
    expect(vinagreteResultado?.porcao_final).toBe(37.5);
  });

  it("um item sozinho na macro-categoria consome 100% do teto, independentemente do peso", () => {
    const resultado = distribuirPorcoes([alcatra], NUM_CONVIDADOS);

    const grupo = resultado.find((g) => g.macro_categoria === "Proteínas Principais");
    const item = grupo?.itens[0];

    expect(item?.porcao_calculada).toBe(400);
    expect(item?.porcao_final).toBe(400);
    expect(item?.volume_necessario_total).toBe(400 * NUM_CONVIDADOS);
  });

  it("agrupa itens de macro-categorias diferentes de forma independente", () => {
    const resultado = distribuirPorcoes([vinagrete, arrozComHardCap, alcatra], NUM_CONVIDADOS);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((g) => g.macro_categoria).sort()).toEqual(
      ["Carboidratos Densos", "Proteínas Principais"].sort()
    );
  });
});
