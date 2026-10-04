import { describe, it, expect } from "vitest";
import { montarValoresEvento, type DadosOperacionaisEvento, type OrcamentoResumo } from "@/lib/orcamentos";

type OrcamentoBase = Pick<
  OrcamentoResumo,
  | "empresaId"
  | "clienteNome"
  | "numConvidados"
  | "qtdAdultos"
  | "qtdCriancasAte5"
  | "qtdCriancas5a10"
  | "precoPessoa"
  | "qtdGarcons"
  | "valorGarcom"
  | "regiaoMetropolitanaCuritiba"
>;

// Cenário de regressão exato de docs/PENDENCIAS_NOTURNAS.md: Cardápio 01
// (preço fixo R$85), 4 convidados (adultos), 1 garçom -> R$570,00.
const orcamentoChurrascoCardapio01: OrcamentoBase = {
  empresaId: 1,
  clienteNome: "TESTE - apagar",
  numConvidados: 4,
  qtdAdultos: 4,
  qtdCriancasAte5: 0,
  qtdCriancas5a10: 0,
  precoPessoa: 85,
  qtdGarcons: 1,
  valorGarcom: 230,
  regiaoMetropolitanaCuritiba: false,
};

const orcamentoChurrascoMisto: OrcamentoBase = {
  empresaId: 1,
  clienteNome: "Maria Teste",
  numConvidados: 120,
  qtdAdultos: 100,
  qtdCriancasAte5: 10,
  qtdCriancas5a10: 10,
  precoPessoa: 150, // preço editado manualmente, fora do fixo/dinâmico
  qtdGarcons: 4,
  valorGarcom: 230,
  regiaoMetropolitanaCuritiba: true,
};

const orcamentoGenerico: OrcamentoBase = {
  empresaId: 2,
  clienteNome: "João Genérico",
  numConvidados: 80,
  qtdAdultos: 80,
  qtdCriancasAte5: 0,
  qtdCriancas5a10: 0,
  precoPessoa: null,
  qtdGarcons: null,
  valorGarcom: null,
  regiaoMetropolitanaCuritiba: null,
};

const operacionaisBase: DadosOperacionaisEvento = {
  contato: "Contato X",
  telefone: "41999990000",
  enderecoEvento: "Rua Teste, 123",
  dataEvento: "2026-11-01T18:00",
  tipoEvento: "Casamento",
  horaChegadaEquipe: "16:00",
  horaAperitivo: "18:00",
  horaAlmoco: "19:00",
  horaEncerramento: "23:00",
  qtdFornecedores: 2,
  qtdGarcons: 2, // usado só pro caminho genérico
  qtdCopeiras: 2,
  valor: 18000, // usado só pro caminho genérico
  prazoPagamento: "2026-10-01",
  chavePix: "chave@pix.com",
  caminhoContrato: "/uploads/contrato.pdf",
  observacoes: "Observação de teste.",
};

describe("montarValoresEvento — Senhor Churrasco (preço vem do Orçamento, não recalcula)", () => {
  it("regressão: Cardápio 01 (R$85), 4 convidados, 1 garçom = R$570,00", () => {
    const resultado = montarValoresEvento(orcamentoChurrascoCardapio01, operacionaisBase, true);

    expect(resultado.precoPessoa).toBe("85");
    expect(resultado.precoCriancaMeia).toBe("42.5");
    expect(resultado.valorGarcom).toBe("230");
    expect(resultado.qtdGarcons).toBe(1);
    expect(resultado.valor).toBe("570");
  });

  it("respeita preço editado manualmente e convidados mistos (meia-entrada de criança)", () => {
    const resultado = montarValoresEvento(orcamentoChurrascoMisto, operacionaisBase, true);

    // 100*150 + 20*75 + 250 (deslocamento) + 4*230 = 15000+1500+250+920 = 17670
    expect(resultado.precoPessoa).toBe("150");
    expect(resultado.taxaDeslocamento).toBe("250");
    expect(resultado.valor).toBe("17670");
    expect(resultado.qtdChurrasqueiros).toBe(2); // CETO(120/100)
    expect(resultado.custoAssadorTotal).toBe("500"); // 2 * VALOR_ASSADOR (250)
  });

  it("qtdGarcons final vem do Orçamento (precificacao.quantidade_garcom_usada), não do Passo 3", () => {
    const resultado = montarValoresEvento(orcamentoChurrascoCardapio01, operacionaisBase, true);
    // operacionaisBase.qtdGarcons=2, mas o Orçamento definiu 1 -- o Orçamento vence.
    expect(resultado.qtdGarcons).toBe(1);
  });
});

describe("montarValoresEvento — empresas sem cardápio de preparos (Anjos Cerimonial, Em Plena Natureza)", () => {
  it("zera campos exclusivos de churrasco e usa o valor do Passo 3 (default = valor negociado)", () => {
    const resultado = montarValoresEvento(orcamentoGenerico, operacionaisBase, false);

    expect(resultado.precoPessoa).toBeNull();
    expect(resultado.precoCriancaMeia).toBeNull();
    expect(resultado.valorGarcom).toBeNull();
    expect(resultado.taxaDeslocamento).toBeNull();
    expect(resultado.qtdChurrasqueiros).toBeNull();
    expect(resultado.custoAssadorTotal).toBe("0");
    expect(resultado.regiaoMetropolitanaCuritiba).toBe(false);
    expect(resultado.qtdGarcons).toBe(2); // vem de operacionais (Passo 3), não do Orçamento
    expect(resultado.valor).toBe("18000");
  });
});

describe("montarValoresEvento — invariantes comuns às duas empresas", () => {
  it("nunca grava os campos de texto livre de cardápio no fluxo novo", () => {
    const churrasco = montarValoresEvento(orcamentoChurrascoCardapio01, operacionaisBase, true);
    const generico = montarValoresEvento(orcamentoGenerico, operacionaisBase, false);

    for (const resultado of [churrasco, generico]) {
      expect(resultado.cardapioEntrada).toBeNull();
      expect(resultado.cardapioCarnes).toBeNull();
      expect(resultado.cardapioAcompanhamentos).toBeNull();
      expect(resultado.cardapioSaladas).toBeNull();
      expect(resultado.cardapioBebidas).toBeNull();
      expect(resultado.cardapioSobremesa).toBeNull();
    }
  });

  it("sempre grava status=confirmado e observações vindas do Passo 3", () => {
    const resultado = montarValoresEvento(orcamentoGenerico, operacionaisBase, false);

    expect(resultado.status).toBe("confirmado");
    expect(resultado.observacoes).toBe("Observação de teste.");
    expect(resultado.cliente).toBe("João Genérico");
    expect(resultado.qtdCopeiras).toBe(2);
    expect(resultado.custoCopeiraTotal).toBe("500"); // CETO(80/50)=2 * VALOR_COPEIRA(250)
  });

  it("converte dataEvento (string do formulário) em Date", () => {
    const resultado = montarValoresEvento(orcamentoChurrascoCardapio01, operacionaisBase, true);
    expect(resultado.dataEvento).toBeInstanceOf(Date);
  });

  it("trata cliente ausente (clienteNome null) como string vazia", () => {
    const resultado = montarValoresEvento({ ...orcamentoGenerico, clienteNome: null }, operacionaisBase, false);
    expect(resultado.cliente).toBe("");
  });
});
