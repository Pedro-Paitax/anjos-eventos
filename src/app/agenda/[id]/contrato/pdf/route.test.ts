import { PDFDocument } from "pdf-lib";
import type { Evento } from "@/lib/eventos";
import { contratoDivergeDoTotal, montarDadosContratoSenhorChurrasco } from "@/lib/contrato-senhor-churrasco-dados";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, obterEvento, listarPreparosConfirmadosEvento } = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  obterEvento: vi.fn(),
  listarPreparosConfirmadosEvento: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/eventos", () => ({ obterEvento }));
vi.mock("@/lib/ficha-tecnica-evento", () => ({ listarPreparosConfirmadosEvento }));

import { GET } from "./route";

const evento = {
  id: 42,
  status: "confirmado",
  cliente: "João da Silva",
  empresa_nome: "Buffet Senhor Churrasco",
  data_evento: "2026-12-18T18:30:00",
  tipo_evento: "Confraternização",
  endereco_evento: "Rua de Exemplo, 20",
  telefone: "(41) 90000-0000",
  hora_aperitivo: "19:00:00",
  qtd_adultos: 35,
  qtd_criancas_ate_5: 0,
  valor: "3500.00",
  prazo_pagamento: "2026-12-15",
  cardapio_entrada: "Pão de alho",
  observacoes: "Observação operacional",
  custo_copeira_total: "250",
};

const chamar = (id = "42") =>
  GET(new Request("http://localhost/agenda/" + id + "/contrato/pdf"), {
    params: Promise.resolve({ id }),
  });

describe("GET /agenda/[id]/contrato/pdf", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Operador" });
    obterEvento.mockResolvedValue(evento);
    listarPreparosConfirmadosEvento.mockResolvedValue([]);
  });

  it("exige sessão antes de consultar o evento", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    expect((await chamar()).status).toBe(401);
    expect(obterEvento).not.toHaveBeenCalled();
  });

  it("rejeita identificadores inválidos e trata evento inexistente", async () => {
    expect((await chamar("0")).status).toBe(400);
    expect((await chamar("2147483648")).status).toBe(400);
    expect(obterEvento).not.toHaveBeenCalled();

    obterEvento.mockResolvedValue(null);
    expect((await chamar()).status).toBe(404);
  });

  it.each(["orcado", "cancelado", "realizado"])("impede gerar contrato com status %s", async (status) => {
    obterEvento.mockResolvedValue({ ...evento, status });
    expect((await chamar()).status).toBe(409);
    expect(listarPreparosConfirmadosEvento).not.toHaveBeenCalled();
  });

  it("gera o contrato do Senhor Churrasco para evento confirmado com cardápio antigo", async () => {
    const resposta = await chamar();
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toContain("contrato-evento-42.pdf");
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");

    const documento = await PDFDocument.load(await resposta.arrayBuffer());
    expect(documento.getTitle()).toBe("Contrato de prestação de serviços de buffet | Senhor Churrasco | Evento 42");
    expect(documento.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("mantém a minuta padrão para as outras empresas", async () => {
    obterEvento.mockResolvedValue({ ...evento, empresa_nome: "Anjos Cerimonial" });
    const resposta = await chamar();
    const documento = await PDFDocument.load(await resposta.arrayBuffer());
    expect(documento.getTitle()).toBe("Minuta de contrato - Evento 42");
  });

  const completo = {
    ...evento,
    qtd_adultos: 50,
    qtd_criancas_ate_5: 4,
    qtd_criancas_5_a_10: 6,
    preco_pessoa: "100",
    preco_crianca_meia: "50",
    qtd_garcons: 2,
    valor_garcom: "200",
    taxa_deslocamento: "150",
    valor: "5850",
    chave_pix: "pagamento@example.com",
  } as Evento;
  const preparosCompleto = [
    { preparoNome: "Farofa", categoria: "Guarnições" },
    { preparoNome: "Salada de folhas", categoria: "Saladas" },
  ];
  const textoDe = (dados: ReturnType<typeof montarDadosContratoSenhorChurrasco>) =>
    dados.secoes.flatMap((s) => s.blocos.map((b) => b.rotulo + " " + b.texto)).join("\n").replace(/\u00a0/g, " ");

  it("monta o contrato com cardápio, sinal de 25% e anexo com crianças até 5 anos gratuitas", () => {
    const dados = montarDadosContratoSenhorChurrasco(completo, preparosCompleto);
    const texto = textoDe(dados);
    expect(dados.servicoCompleto).toBe(true);
    expect(dados.partes[1][1]).toContain("12.693.950/0001-28");
    expect(texto).toContain("contará com 60 convidados: 50 adultos, 6 crianças de 5 a 10 anos e 4 crianças até 5 anos.");
    expect(texto).toContain("Saladas e acompanhamentos: Farofa, Salada de folhas.");
    expect(texto).toContain("R$ 100,00 (cem reais) por pessoa");
    expect(texto).toContain("2 (dois) garçons, pelo valor de R$ 400,00 (quatrocentos reais)");
    expect(texto).toContain("quantia total de R$ 5.850,00 (cinco mil oitocentos e cinquenta reais), já incluída a taxa de deslocamento de R$ 150,00");
    expect(texto).toContain("na chave pagamento@example.com");
    expect(texto).toContain("no valor de R$ 1.462,50 (mil quatrocentos e sessenta e dois reais e cinquenta centavos)");
    expect(texto).toContain("R$ 4.387,50");
    expect(texto).toContain("ou seja, até 11/12/2026.");
    expect(texto).toContain("R$ 28,00, R$ 24,00 e R$ 16,00");
    expect(texto).toContain("Cláusula 5ª. A CONTRATANTE deverá efetuar o pagamento na forma e nas condições estabelecidas na Cláusula 9ª.");
    expect(texto).toContain("pelo número confirmado na Cláusula 2ª.");
    expect(texto).toContain("receberá de volta 50% (cinquenta por cento) do sinal");
    expect(texto).toContain("Cláusula 19ª. Para dirimir");
    expect(dados.anexo.itens).toContainEqual(["Crianças até 5 anos", 4, 0, 0]);
    expect(dados.anexo.itens).toContainEqual(["Garçons", 2, 200, 400]);
    expect(dados.anexo.total).toMatch(/5\.850,00/);
    expect(dados.anexo.parcelas).toEqual([
      ["Sinal (25%) · na assinatura", expect.stringMatching(/1\.462,50/)],
      ["Restante · até 11/12/2026", expect.stringMatching(/4\.387,50/)],
    ]);
    expect(contratoDivergeDoTotal(completo)).toBe(false);
  });

  it("sem cardápio é só taxa: pagamento integral no dia, sem sinal, sem cláusulas de sinal", () => {
    const dados = montarDadosContratoSenhorChurrasco({ ...completo, cardapio_entrada: null }, []);
    const texto = textoDe(dados);
    expect(dados.servicoCompleto).toBe(false);
    expect(dados.secoes.map((s) => s.titulo)).not.toContain("Do cardápio");
    expect(texto).toContain("será pago integralmente no dia do evento, por PIX, na chave pagamento@example.com, sem sinal.");
    expect(texto).not.toContain("sinal de 25%");
    expect(texto).not.toContain("Do inadimplemento");
    expect(texto).toContain("poderá ser remarcada, sem custo");
    expect(texto).toContain("Cláusula 4ª. A CONTRATANTE deverá efetuar o pagamento na forma e nas condições estabelecidas na Cláusula 8ª.");
    expect(dados.anexo.parcelas).toEqual([["Pagamento integral · no dia do evento", expect.stringMatching(/5\.850,00/)]]);
  });

  it("deixa lacunas quando faltam total, chave PIX e endereço", () => {
    const dados = montarDadosContratoSenhorChurrasco(
      { ...completo, valor: null, chave_pix: null, endereco_evento: null },
      preparosCompleto,
    );
    const texto = textoDe(dados);
    expect(texto).toContain("no endereço ____");
    expect(texto).toContain("quantia total de R$ ____");
    expect(texto).toContain("na chave informada pela CONTRATADA");
    expect(dados.anexo.parcelas[0][1]).toBe("A preencher");
  });

  it("acusa a divergência só fora do PDF quando o total não bate com os itens", () => {
    expect(contratoDivergeDoTotal({ ...completo, valor: "6050" })).toBe(true);
    expect(contratoDivergeDoTotal({ ...completo, valor: null })).toBe(false);
  });

  it("pagina cardápios extensos e aceita dados opcionais ausentes", async () => {
    obterEvento.mockResolvedValue({ ...evento, valor: null, prazo_pagamento: null });
    listarPreparosConfirmadosEvento.mockResolvedValue(
      Array.from({ length: 75 }, (_, i) => ({ preparoNome: "Espetinho de legumes " + i, categoria: "Guarnições" })),
    );

    const resposta = await chamar();
    const documento = await PDFDocument.load(await resposta.arrayBuffer());
    expect(documento.getPageCount()).toBeGreaterThan(1);
  });
});
