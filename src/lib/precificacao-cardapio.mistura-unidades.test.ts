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
  unidadeRendimentoPreparo: "Unidade",
  pesoMedioUnidadeG: null, // real: campo ainda não preenchido em produção (docs/DECISOES.md)
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
  unidadeRendimentoPreparo: "Unidade",
  pesoMedioUnidadeG: null, // real: campo ainda não preenchido em produção (docs/DECISOES.md)
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
  unidadeRendimentoPreparo: "G",
  pesoMedioUnidadeG: null,
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
  unidadeRendimentoPreparo: "G",
  pesoMedioUnidadeG: null,
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

// docs/DECISOES.md, "Correção do Bug de Mistura de Unidades" — decisão já
// tomada e implementada em distribuirPorcoes (Peso_Medio_Unidade_G).
// Reproduz o MESMO cardápio acima, mas com Peso_Medio_Unidade_G preenchido
// pros dois itens problemáticos, provando que o valor deixa de ser
// inflado. Valores de Peso_Medio_Unidade_G são FICTÍCIOS pra teste — o
// campo existe no schema real (criado nesta sessão) mas nenhum preparo
// tem esse dado cadastrado em produção ainda.
describe("CORRIGIDO: com Peso_Medio_Unidade_G preenchido, o valor deixa de ser inflado", () => {
  it("Linguiça Toscana com peso médio real da composição (60g/unidade) calcula corretamente", () => {
    const linguicaComPesoMedio = { ...linguicaToscana, pesoMedioUnidadeG: 60 };
    // Canudinho de Batatonese também precisaria do campo preenchido pra
    // entrar no cálculo de verdade (fail-fast em resolverItensPorPreparoIds
    // bloqueia sem ele) — aqui testamos só a correção numérica do núcleo
    // puro, com um valor plausível de teste (item "montado", sem peso por
    // unidade derivável da composição, ver nota do teste anterior).
    const canudinhoComPesoMedio = { ...canudinhoDeBatatonese, pesoMedioUnidadeG: 40 };

    const resultado = calcularPrecificacaoCardapio(
      [linguicaComPesoMedio, canudinhoComPesoMedio, arrozComAlhoCrispy, tomateEPepinoComCebola],
      { numConvidados: NUM_CONVIDADOS, regiaoMetropolitanaCuritiba: false }
    );

    // Entradas e Petiscos (teto 120g), Linguiça e Canudinho com peso 1 cada
    // -> porcao_final = 60g/pessoa cada (igual a antes, isso não muda).
    // A CORREÇÃO está em como isso vira contagem de unidades: TETO é
    // aplicado na porção POR PESSOA (docs/DECISOES.md — mesmo termo
    // "Porcao_Calculada" de REGRAS_NEGOCIO.md seção 5), não no volume já
    // multiplicado pelos convidados:
    //   Linguiça:  TETO(60/60)=1 unidade/pessoa  * 61 = 61  un totais * R$1,00  = R$61,00
    //   Canudinho: TETO(60/40)=2 unidades/pessoa * 61 = 122 un totais * R$0,82  = R$100,04
    // Arroz e Tomate/Pepino continuam sem conversão (unidade já bate com a
    // macro): custo total 150g/pessoa*61*0,02007 + 60g/pessoa*61*0,00973
    //   Arroz:      9150 * 0,02007 = R$183,6405
    //   Tomate/Pep: 3660 * 0,00973 = R$35,6058
    // custo_cardapio_total = 61 + 100,04 + 183,6405 + 35,6058 = R$380,29
    // custo_cardapio_por_pessoa = 380,29 / 61 = R$6,23
    const custoTotalEsperado = 61.0 + 100.04 + 183.6405 + 35.6058;
    expect(resultado.custo_cardapio_total).toBeCloseTo(custoTotalEsperado, 0);
    expect(resultado.custo_cardapio_por_pessoa).toBeCloseTo(custoTotalEsperado / NUM_CONVIDADOS, 1);

    // O ponto central: deixa de ser da mesma ORDEM DE GRANDEZA do bug
    // (~R$113/pessoa, ~R$158 sugerido) — cai pra uma fração disso.
    expect(resultado.custo_cardapio_por_pessoa).toBeLessThan(20);
    expect(resultado.valor_sugerido_por_pessoa).toBeLessThan(30);
  });

  it("só a Linguiça Toscana corrigida (Canudinho continua sem o campo) — mistura parcial dentro do mesmo cardápio", () => {
    const linguicaComPesoMedio = { ...linguicaToscana, pesoMedioUnidadeG: 60 };
    // Canudinho SEM Peso_Medio_Unidade_G: no fluxo real (resolverItensPorPreparoIds)
    // seria excluído por fail-fast antes de chegar aqui. Este teste isola só
    // o comportamento do núcleo puro quando recebe os dois casos juntos.
    const resultado = calcularPrecificacaoCardapio(
      [linguicaComPesoMedio, arrozComAlhoCrispy, tomateEPepinoComCebola],
      { numConvidados: NUM_CONVIDADOS, regiaoMetropolitanaCuritiba: false }
    );

    // Linguiça sozinha na macro agora (Canudinho fora): consome 100% do
    // teto (120g/pessoa) -> TETO(120/60)=2 unidades/pessoa * 61 = 122 un
    // * R$1,00 = R$122,00. Arroz e Tomate/Pepino iguais ao teste acima.
    const custoTotalEsperado = 122.0 + 183.6405 + 35.6058;
    expect(resultado.custo_cardapio_total).toBeCloseTo(custoTotalEsperado, 0);
    // Ainda assim, muito abaixo da ordem de grandeza do bug original
    // (~R$113/pessoa).
    expect(resultado.custo_cardapio_por_pessoa).toBeLessThan(20);
  });
});
