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
  headerExibicao: "Acompanhamentos Rústicos", // real
  peso: 1, // fictício
  origemPeso: "Peso_Atratividade (fictício - teste)",
  porcaoMaximaIndividual: null,
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150, // real (Macro_Categorias)
  unidade: "g",
  unidadeRendimentoPreparo: "ML", // real — Vinagrete rende em ML, mesmo conceito de "g/ml" da macro, sem conversão
  pesoMedioUnidadeG: null,
  rendimentoPreparo: 1500, // real
};

const arrozComHardCap: ItemResolvido = {
  preparoId: 13, // real
  preparoNome: "Arroz Branco com Alho Crispy",
  headerExibicao: "Arroz e Risotos", // real
  peso: 3, // fictício
  origemPeso: "Peso_Atratividade (fictício - teste)",
  porcaoMaximaIndividual: 80, // fictício — força o Hard Cap (calculado seria 112.5g)
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150, // real
  unidade: "g",
  unidadeRendimentoPreparo: "G", // real
  pesoMedioUnidadeG: null,
  rendimentoPreparo: 1000, // real
};

const alcatra: ItemResolvido = {
  preparoId: 12, // real
  preparoNome: "Alcatra Grelhada",
  headerExibicao: "Carnes Vermelhas", // real
  peso: 2.0, // real (Hierarquia_Proteina, Carne Vermelha)
  origemPeso: "Hierarquia_Proteina (Carne Vermelha)",
  porcaoMaximaIndividual: null,
  macroCategoriaChave: "Proteínas Principais",
  macroCategoriaNome: "Proteínas Principais",
  capacidadeTeto: 400, // real
  unidade: "g",
  unidadeRendimentoPreparo: "G", // real
  pesoMedioUnidadeG: null,
  rendimentoPreparo: 1000, // real
};

// docs/DECISOES.md, "Correção do Bug de Mistura de Unidades": Pão de Alho
// (real, id=6) rende em Unidade dentro da macro "Entradas e Petiscos"
// (g). Peso_Medio_Unidade_G é FICTÍCIO — o campo existe no schema
// (criado nesta sessão) mas ainda não foi preenchido com o valor real de
// nenhum preparo (vetada qualquer derivação automática).
const paoDeAlhoComPesoMedio: ItemResolvido = {
  preparoId: 6,
  preparoNome: "Pão de Alho",
  headerExibicao: "Entradas Quentes",
  peso: 1,
  origemPeso: "Peso_Atratividade (fictício - teste)",
  porcaoMaximaIndividual: null,
  macroCategoriaChave: "Entradas e Petiscos",
  macroCategoriaNome: "Entradas e Petiscos",
  capacidadeTeto: 120, // real
  unidade: "g",
  unidadeRendimentoPreparo: "Unidade",
  pesoMedioUnidadeG: 50, // fictício - teste
  rendimentoPreparo: 10, // fictício - teste
};

const paoDeAlhoSemPesoMedio: ItemResolvido = {
  ...paoDeAlhoComPesoMedio,
  pesoMedioUnidadeG: null,
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
    expect(arroz?.porcao_limitada_por_cap).toBe(true);

    // limitação conhecida e aceita (REGRAS_NEGOCIO.md seção 8): o excedente
    // do Hard Cap NÃO é realocado — Vinagrete continua com a mesma porção
    // que teria se o Arroz não tivesse Hard Cap nenhum.
    expect(vinagreteResultado?.porcao_final).toBe(37.5);
    expect(vinagreteResultado?.porcao_limitada_por_cap).toBe(false);
  });

  it("um item sozinho na macro-categoria consome 100% do teto, independentemente do peso", () => {
    const resultado = distribuirPorcoes([alcatra], NUM_CONVIDADOS);

    const grupo = resultado.find((g) => g.macro_categoria === "Proteínas Principais");
    const item = grupo?.itens[0];

    expect(item?.porcao_calculada).toBe(400);
    expect(item?.porcao_final).toBe(400);
    expect(item?.volume_necessario_total).toBe(400 * NUM_CONVIDADOS);
    expect(item?.header_exibicao).toBe("Carnes Vermelhas");
  });

  it("agrupa itens de macro-categorias diferentes de forma independente", () => {
    const resultado = distribuirPorcoes([vinagrete, arrozComHardCap, alcatra], NUM_CONVIDADOS);

    expect(resultado).toHaveLength(2);
    expect(resultado.map((g) => g.macro_categoria).sort()).toEqual(
      ["Carboidratos Densos", "Proteínas Principais"].sort()
    );
  });

  it("preparo medido em g/ml não sofre conversão — quantidade_para_custo == volume_necessario_total", () => {
    const resultado = distribuirPorcoes([vinagrete], NUM_CONVIDADOS);
    const item = resultado[0].itens[0];
    expect(item.quantidade_para_custo).toBe(item.volume_necessario_total);
  });
});

// docs/DECISOES.md, "Correção do Bug de Mistura de Unidades".
describe("distribuirPorcoes — conversão de Unidade dentro de macro g/ml", () => {
  it("com Peso_Medio_Unidade_G preenchido, converte a porção por pessoa (não o volume total) pra contagem de unidades (TETO)", () => {
    const resultado = distribuirPorcoes([paoDeAlhoComPesoMedio], NUM_CONVIDADOS);
    const item = resultado[0].itens[0];

    // Sozinho na macro: porcao_final = 120g/pessoa -> volume = 120*61 = 7320g
    expect(item.porcao_final).toBe(120);
    expect(item.volume_necessario_total).toBe(120 * NUM_CONVIDADOS);
    // TETO(120g por pessoa / 50g por unidade) = 3 unidades/pessoa (não dá
    // pra servir 2,4 unidades) * 61 convidados = 183 — não "7320 unidades"
    // (o bug antigo, que tratava o volume TOTAL como contagem direta)
    expect(item.quantidade_para_custo).toBe(3 * NUM_CONVIDADOS);
    expect(item.quantidade_para_custo).toBeLessThan(item.volume_necessario_total);
  });

  it("sem Peso_Medio_Unidade_G, o núcleo puro cai de volta pro volume bruto (proteção real fica em resolverItensPorPreparoIds, não aqui)", () => {
    const resultado = distribuirPorcoes([paoDeAlhoSemPesoMedio], NUM_CONVIDADOS);
    const item = resultado[0].itens[0];

    // distribuirPorcoes é núcleo puro e não bloqueia sozinho — a exclusão
    // fail-fast documentada em docs/DECISOES.md acontece antes, na camada
    // de resolução (I/O), que nunca deveria entregar aqui um item nessa
    // combinação sem o campo preenchido.
    expect(item.quantidade_para_custo).toBe(item.volume_necessario_total);
  });
});
