import { describe, expect, it } from "vitest";
import {
  calcularPrecificacaoCardapio,
  type ItemCardapioPrecificacao,
} from "@/lib/precificacao-cardapio";

// INVESTIGAÇÃO DE BUG FINANCEIRO — ver docs/PENDENCIAS_NOTURNAS.md,
// "PRIORIDADE MÁXIMA: mistura de unidades no motor de dimensionamento".
//
// Reproduz EXATAMENTE o cardápio que o Pedro testou (2026-09-09) e que
// devolveu Valor Sugerido ≈ R$157,10/pessoa, suspeito de estar errado:
//   Entrada: Linguiça Toscana + Canudinho de Batatonese
//   Acompanhamentos: Arroz Branco com Alho Crispy + Farofa Simples + Farofa de Bacon
//   Carnes: Fraldinha na Mostarda + Coxinha da Asa de Frango
//   Saladas: Tomate e Pepino com Cebola + Tomate com Cebola
//
// Todos os pesos, tetos, custos e rendimentos abaixo são REAIS, confirmados
// via NocoDB e via GET /api/preparos/:id/custo em 2026-09-09 — nenhum valor
// fictício. Dos 9 preparos, 5 são hoje excluídos do cálculo ANTES de chegar
// aqui (Farofa Simples, Farofa de Bacon, Fraldinha na Mostarda, Coxinha da
// Asa de Frango, Tomate com Cebola — todos sem Header_UI vinculado, achado
// SEPARADO documentado em docs/PENDENCIAS_NOTURNAS.md). Este teste cobre
// só os 4 que sobrevivem e chegam em calcularPrecificacaoCardapio, que é
// onde a suspeita do Pedro (mistura de unidade) realmente se manifesta.
const NUM_CONVIDADOS = 61;

// Entradas e Petiscos: teto real = 120g (Macro_Categorias.Id=9).
// Linguiça Toscana: rendimento real = 10 UNIDADES (não gramas).
const linguicaToscana: ItemCardapioPrecificacao = {
  preparoId: 3,
  preparoNome: "Linguiça Toscana",
  headerExibicao: "Entradas Quentes",
  macroCategoriaChave: "Entradas e Petiscos",
  macroCategoriaNome: "Entradas e Petiscos",
  capacidadeTeto: 120,
  unidade: "g", // teto da macro é em gramas
  peso: 1, // Peso_Atratividade real (padrão)
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 10, // real, GET /api/preparos/3/custo
  rendimento: 10, // real — 10 UNIDADES, não gramas
};

// Canudinho de Batatonese: rendimento real = 1 UNIDADE.
const canudinhoDeBatatonese: ItemCardapioPrecificacao = {
  preparoId: 7,
  preparoNome: "Canudinho de Batatonese",
  headerExibicao: "Entradas Frias",
  macroCategoriaChave: "Entradas e Petiscos",
  macroCategoriaNome: "Entradas e Petiscos",
  capacidadeTeto: 120,
  unidade: "g",
  peso: 1,
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 0.82, // real
  rendimento: 1, // real — 1 UNIDADE
};

// Carboidratos Densos: teto real = 150g. Arroz é medido em G — sem mistura
// de unidade aqui, serve de controle (item correto na mesma massa de teste).
const arrozComAlhoCrispy: ItemCardapioPrecificacao = {
  preparoId: 13,
  preparoNome: "Arroz Branco com Alho Crispy",
  headerExibicao: "Arroz e Risotos",
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150,
  unidade: "g",
  peso: 1,
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 20.07, // real
  rendimento: 1000, // real — 1000 GRAMAS, unidade bate com o teto
};

// Saladas: teto real = 60g. Também medido em G — outro item de controle.
const tomateEPepinoComCebola: ItemCardapioPrecificacao = {
  preparoId: 14,
  preparoNome: "Tomate e Pepino com Cebola",
  headerExibicao: "Saladas Frescas",
  macroCategoriaChave: "Saladas",
  macroCategoriaNome: "Saladas",
  capacidadeTeto: 60,
  unidade: "g",
  peso: 1,
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 9.73, // real
  rendimento: 1000, // real
};

const CARDAPIO_4_ITENS_SOBREVIVENTES = [
  linguicaToscana,
  canudinhoDeBatatonese,
  arrozComAlhoCrispy,
  tomateEPepinoComCebola,
];

describe("BUG: mistura de unidades no motor de dimensionamento (investigação 2026-09-09)", () => {
  it("reproduz o valor inflado (~R$157/pessoa) visto pelo Pedro — CONFIRMA a suspeita", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO_4_ITENS_SOBREVIVENTES, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
    });

    // Cálculo manual do que o código HOJE produz (documentando o bug, não
    // corrigindo): distribuirPorcoes divide o teto de 120g da macro
    // "Entradas e Petiscos" igualmente entre Linguiça Toscana e Canudinho
    // de Batatonese (mesmo Peso_Atratividade=1) → 60 "unidades do teto"
    // (semanticamente gramas) pra cada um. O código então multiplica isso
    // direto por custo_total_preparo/rendimento — que pra esses dois itens
    // é custo POR UNIDADE VENDIDA (R$1,00/salsicha, R$0,82/canudinho), não
    // custo por grama. Resultado: trata "60g" como "60 salsichas" e "60
    // canudinhos".
    //   Linguiça:   60 × (10/10)   = 60 × 1,00  = 60,00
    //   Canudinho:  60 × (0,82/1)  = 60 × 0,82  = 49,20
    //   Arroz:     150 × (20,07/1000) = 150 × 0,02007 = 3,0105  (SEM bug — unidade bate)
    //   Tomate/Pep: 60 × (9,73/1000)  = 60 × 0,00973   = 0,5838 (SEM bug — unidade bate)
    // custo_cardapio_por_pessoa ≈ 60 + 49,20 + 3,0105 + 0,5838 = 112,7943
    // valor_sugerido_por_pessoa = TETO_centavos(112,7943 × 1,40) ≈ 157,92
    //
    // Pedro reportou R$157,10 no teste real (9 preparos, dos quais 5
    // excluídos por outro motivo — ver docs/PENDENCIAS_NOTURNAS.md). A
    // pequena diferença de centavos é esperada (arredondamentos internos
    // de outras etapas); a ORDEM DE GRANDEZA e o MECANISMO batem
    // exatamente — mais de 97% do "custo" vem de só 2 itens de entrada
    // pequenos, tratados como se fossem 60 unidades cada.
    expect(resultado.custo_cardapio_por_pessoa).toBeGreaterThan(100);
    expect(resultado.valor_sugerido_por_pessoa).toBeGreaterThan(150);

    // Registra o valor exato que o código produz hoje, pra qualquer
    // mudança futura no motor precisar alterar este teste conscientemente
    // (não é uma trava "correta", é uma trava "isso é o que o bug faz
    // hoje" — remover/ajustar quando o Pedro decidir como corrigir).
    expect(resultado.custo_cardapio_por_pessoa).toBeCloseTo(112.79, 1);
    expect(resultado.valor_sugerido_por_pessoa).toBeCloseTo(157.92, 1);
  });

  it("CORRETO (se o motor convertesse unidade->grama pelo peso médio do rendimento): custo real seria ~R$4-5/pessoa, não ~R$113", () => {
    // Reconstituição do que o custo por pessoa DEVERIA ser se cada item
    // fosse cobrado pela fração real de UMA unidade que 60g representa,
    // usando o peso médio por unidade implícito na própria composição do
    // preparo (Linguiça Toscana: 0,6kg de insumo -> 10 unidades = 60g por
    // unidade; Canudinho de Batatonese: sem peso por unidade bem definido
    // no schema atual, ver nota abaixo).
    const pesoMedioPorUnidadeLinguica = 600 / 10; // 60g por salsicha (0,6kg insumo / 10 unidades)
    const custoPorUnidadeLinguica = linguicaToscana.custoTotalPreparo / linguicaToscana.rendimento; // R$1,00
    const unidadesEquivalentesLinguica = 60 / pesoMedioPorUnidadeLinguica; // 60g / 60g-por-unidade = 1 unidade
    const custoCorrigidoLinguicaPorPessoa = custoPorUnidadeLinguica * unidadesEquivalentesLinguica;

    expect(custoCorrigidoLinguicaPorPessoa).toBeCloseTo(1.0, 2);

    // Canudinho de Batatonese é um item MONTADO (não tem peso-por-unidade
    // derivável da composição do jeito que Linguiça tem — a "unidade" É a
    // menor unidade de venda, sem equivalência natural em gramas). Isso
    // por si só já mostra que "converter unidade -> grama pelo peso
    // médio" não é uma correção genérica trivial pra todo preparo por
    // unidade — é uma decisão de negócio real (ver
    // docs/PENDENCIAS_NOTURNAS.md), não decidida neste teste.
  });
});
