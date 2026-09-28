import { describe, it, expect } from "vitest";
import { montarValoresEvento, type DadosOperacionaisEvento, type OrcamentoResumo } from "@/lib/orcamentos";

type OrcamentoBase = Pick<
  OrcamentoResumo,
  "empresaId" | "clienteNome" | "numConvidados" | "qtdAdultos" | "qtdCriancasAte5" | "qtdCriancas5a10"
>;

const orcamentoChurrasco: OrcamentoBase = {
  empresaId: 1,
  clienteNome: "Maria Teste",
  numConvidados: 120,
  qtdAdultos: 100,
  qtdCriancasAte5: 10,
  qtdCriancas5a10: 10,
};

const orcamentoGenerico: OrcamentoBase = {
  empresaId: 2,
  clienteNome: "João Genérico",
  numConvidados: 80,
  qtdAdultos: 80,
  qtdCriancasAte5: 0,
  qtdCriancas5a10: 0,
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
  qtdGarcons: 4,
  qtdCopeiras: 2,
  regiaoMetropolitanaCuritiba: true,
  precoPessoa: 150,
  precoCriancaMeia: 75,
  valorGarcom: 230,
  valor: 18000,
  prazoPagamento: "2026-10-01",
  chavePix: "chave@pix.com",
  caminhoContrato: "/uploads/contrato.pdf",
  observacoes: "Observação de teste.",
};

describe("montarValoresEvento", () => {
  it("preenche precoPessoa/precoCriancaMeia/valorGarcom/taxaDeslocamento para churrasco", () => {
    const resultado = montarValoresEvento(orcamentoChurrasco, operacionaisBase, true);

    expect(resultado.precoPessoa).toBe("150");
    expect(resultado.precoCriancaMeia).toBe("75");
    expect(resultado.valorGarcom).toBe("230");
    expect(resultado.taxaDeslocamento).toBe("250"); // regiaoMetropolitanaCuritiba=true
    expect(resultado.qtdChurrasqueiros).toBe(2); // CETO(120/100)
    expect(resultado.custoAssadorTotal).toBe("500"); // 2 * VALOR_ASSADOR (250)
  });

  it("zera campos exclusivos de churrasco (precoPessoa, precoCriancaMeia, valorGarcom, taxaDeslocamento, qtdChurrasqueiros, custoAssadorTotal) para empresas sem cardápio de preparos", () => {
    const resultado = montarValoresEvento(orcamentoGenerico, operacionaisBase, false);

    expect(resultado.precoPessoa).toBeNull();
    expect(resultado.precoCriancaMeia).toBeNull();
    expect(resultado.valorGarcom).toBeNull();
    expect(resultado.taxaDeslocamento).toBeNull();
    expect(resultado.qtdChurrasqueiros).toBeNull();
    expect(resultado.custoAssadorTotal).toBe("0");
  });

  it("nunca grava os campos de texto livre de cardápio no fluxo novo, independente da empresa", () => {
    const churrasco = montarValoresEvento(orcamentoChurrasco, operacionaisBase, true);
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

  it("sempre grava status=confirmado e o valor/observações vindos do Passo 3", () => {
    const resultado = montarValoresEvento(orcamentoGenerico, operacionaisBase, false);

    expect(resultado.status).toBe("confirmado");
    expect(resultado.valor).toBe("18000");
    expect(resultado.observacoes).toBe("Observação de teste.");
    expect(resultado.cliente).toBe("João Genérico");
    expect(resultado.qtdCopeiras).toBe(2);
    expect(resultado.custoCopeiraTotal).toBe("500"); // CETO(80/50)=2 * VALOR_COPEIRA(250)
  });

  it("converte dataEvento (string do formulário) em Date", () => {
    const resultado = montarValoresEvento(orcamentoChurrasco, operacionaisBase, true);
    expect(resultado.dataEvento).toBeInstanceOf(Date);
  });

  it("trata cliente ausente (clienteNome null) como string vazia", () => {
    const resultado = montarValoresEvento({ ...orcamentoGenerico, clienteNome: null }, operacionaisBase, false);
    expect(resultado.cliente).toBe("");
  });
});
