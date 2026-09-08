import { describe, expect, it } from "vitest";
import {
  calcularPrecificacaoCardapio,
  calcularTaxaDeslocamento,
  type ItemCardapioPrecificacao,
} from "@/lib/precificacao-cardapio";

// Cardápio com os 3 preparos reais já validados nesta conversa (custo e
// rendimento reais, confirmados contra o NocoDB/testes anteriores). Pesos
// e macro-categorias/tetos reproduzem o mesmo cenário já usado nos testes
// do motor de dimensionamento (Vinagrete e Arroz na mesma macro
// "Carboidratos Densos", Alcatra sozinha em "Proteínas Principais").
// Pesos de Vinagrete/Arroz continuam FICTÍCIOS (nenhum preparo real tem
// Peso_Atratividade cadastrado ainda); peso de Alcatra é o real da
// Hierarquia_Proteina (Carne Vermelha = 2,0).

const vinagrete: ItemCardapioPrecificacao = {
  preparoId: 2,
  preparoNome: "Vinagrete",
  headerExibicao: "Acompanhamentos Rústicos",
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150,
  unidade: "ml",
  peso: 1, // fictício
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 16.96, // real
  rendimento: 1500, // real
};

const arroz: ItemCardapioPrecificacao = {
  preparoId: 13,
  preparoNome: "Arroz Branco com Alho Crispy",
  headerExibicao: "Arroz e Risotos",
  macroCategoriaChave: "Carboidratos Densos",
  macroCategoriaNome: "Carboidratos Densos",
  capacidadeTeto: 150,
  unidade: "g",
  peso: 3, // fictício
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 20.07, // real
  rendimento: 1000, // real
};

const alcatra: ItemCardapioPrecificacao = {
  preparoId: 12,
  preparoNome: "Alcatra Grelhada",
  headerExibicao: "Carnes Vermelhas",
  macroCategoriaChave: "Proteínas Principais",
  macroCategoriaNome: "Proteínas Principais",
  capacidadeTeto: 400,
  unidade: "g",
  peso: 2.0, // real (Hierarquia_Proteina, Carne Vermelha)
  porcaoMaximaIndividual: null,
  custoTotalPreparo: 64.93, // real
  rendimento: 1000, // real
};

const CARDAPIO = [vinagrete, arroz, alcatra];

// 61 convidados exercita arredondamento pra cima nos 3 campos de equipe:
// garçom CETO(61/30)=3, copeira CETO(61/50)=2, assador CETO(61/100)=1.
const NUM_CONVIDADOS = 61;

describe("calcularTaxaDeslocamento", () => {
  it("R$250 quando é região metropolitana de Curitiba", () => {
    expect(calcularTaxaDeslocamento(true)).toBe(250);
  });
  it("R$0 quando não é", () => {
    expect(calcularTaxaDeslocamento(false)).toBe(0);
  });
});

describe("calcularPrecificacaoCardapio", () => {
  it("calcula custo do cardápio reaproveitando o motor de dimensionamento + motor de custo", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
    });

    // Vinagrete: 150*(1/4)=37.5ml/pessoa * 61 = 2287.5ml -> custo 16.96/1500 * 2287.5 = 25.86
    // Arroz:     150*(3/4)=112.5g/pessoa  * 61 = 6862.5g -> custo 20.07/1000 * 6862.5 = 137.73
    // Alcatra:   400g/pessoa (sozinha)    * 61 = 24400g  -> custo 64.93/1000 * 24400  = 1584.29
    // (soma feita com toBeCloseTo pra não depender de arredondamento de ponto
    // flutuante do próprio literal 25.86 + 137.73 + 1584.29 no teste)
    expect(resultado.custo_cardapio_total).toBeCloseTo(25.86 + 137.73 + 1584.29, 2);
    expect(resultado.custo_cardapio_total).toBe(1747.88);
  });

  it("arredonda pra cima quantidade de garçom, copeira e assador com 61 convidados", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
    });

    expect(resultado.quantidade_garcom_sugerida).toBe(3); // CETO(61/30)
    expect(resultado.quantidade_copeira_sugerida).toBe(2); // CETO(61/50)
    expect(resultado.quantidade_assador_sugerida).toBe(1); // CETO(61/100)

    expect(resultado.custo_copeira_total).toBe(2 * 250);
    expect(resultado.custo_assador_total).toBe(1 * 250);
  });

  it("Valor_Sugerido_Por_Pessoa = TETO(custo por pessoa x 1,40), criança paga a metade", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
    });

    // custo por pessoa = 1747.88 / 61 = 28.6537... * 1.4 = 40.11527... ->
    // TETO em centavos (não em Real inteiro) = 40.12
    expect(resultado.custo_cardapio_por_pessoa).toBeCloseTo(28.65, 1);
    expect(resultado.valor_sugerido_por_pessoa).toBe(40.12);
    expect(resultado.valor_sugerido_crianca).toBe(20.06);
  });

  it("Valor_Sugerido_Total_Evento COM toggle de região metropolitana (soma taxa de R$250)", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: true,
    });

    // (40.12 * 61) + 250 (deslocamento) + (3 garçons sugeridos * 230)
    expect(resultado.taxa_deslocamento).toBe(250);
    expect(resultado.quantidade_garcom_usada).toBe(3);
    expect(resultado.valor_garcom).toBe(230);
    expect(resultado.valor_sugerido_total_evento).toBeCloseTo(40.12 * 61 + 250 + 3 * 230, 2);
  });

  it("Valor_Sugerido_Total_Evento SEM o toggle (sem taxa de deslocamento)", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
    });

    expect(resultado.taxa_deslocamento).toBe(0);
    expect(resultado.valor_sugerido_total_evento).toBeCloseTo(40.12 * 61 + 0 + 3 * 230, 2);
  });

  it("quantidade de garçom e valor de garçom são editáveis, sobrepondo a sugestão/padrão", () => {
    const resultado = calcularPrecificacaoCardapio(CARDAPIO, {
      numConvidados: NUM_CONVIDADOS,
      regiaoMetropolitanaCuritiba: false,
      quantidadeGarcom: 5, // usuário editou por cima da sugestão (3)
      valorGarcom: 200, // usuário editou por cima do padrão (230)
    });

    expect(resultado.quantidade_garcom_sugerida).toBe(3); // sugestão não muda
    expect(resultado.quantidade_garcom_usada).toBe(5); // valor usado é o editado
    expect(resultado.valor_garcom).toBe(200);
    expect(resultado.valor_sugerido_total_evento).toBeCloseTo(40.12 * 61 + 0 + 5 * 200, 2);
  });
});
