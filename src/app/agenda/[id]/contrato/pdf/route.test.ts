import { PDFDocument } from "pdf-lib";
import type { Evento } from "@/lib/eventos";
import { montarDadosContratoSenhorChurrasco } from "@/lib/contrato-senhor-churrasco-dados";
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
    expect(documento.getTitle()).toBe("Contrato de reserva de evento | Senhor Churrasco | Evento 42");
    expect(documento.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("mantém a minuta padrão para as outras empresas", async () => {
    obterEvento.mockResolvedValue({ ...evento, empresa_nome: "Anjos Cerimonial" });
    const resposta = await chamar();
    const documento = await PDFDocument.load(await resposta.arrayBuffer());
    expect(documento.getTitle()).toBe("Minuta de contrato - Evento 42");
  });

  it("apresenta dados salvos, agrupa o cardápio e preserva o total do evento", () => {
    const dados = montarDadosContratoSenhorChurrasco({
      ...evento,
      qtd_adultos: 50,
      qtd_criancas_ate_5: 4,
      qtd_criancas_5_a_10: 6,
      preco_pessoa: "100",
      preco_crianca_meia: "50",
      qtd_garcons: 2,
      valor_garcom: "200",
      taxa_deslocamento: "150",
      valor: "6050",
      chave_pix: "pagamento@example.com",
    } as Evento, [
      { preparoNome: "Farofa", categoria: "Guarnições" },
      { preparoNome: "Salada de folhas", categoria: "Saladas" },
    ]);
    expect(dados.principais).toContainEqual(["Convidados", "60 pessoas", true]);
    expect(dados.cardapio).toContainEqual(["Saladas e acompanhamentos", "Farofa, Salada de folhas"]);
    expect(dados.itens).toContainEqual(["Crianças de 0 a 5 anos", 4, 50, 200]);
    expect(dados.itens).toContainEqual(["Garçons", 2, 200, 400]);
    expect(dados.total).toMatch(/6\.050,00/);
    expect(dados.detalhamentoDiverge).toBe(false);
    expect(dados.pagamento).toContainEqual(["Vencimento", "15/12/2026"]);
  });

  it("mantém em aberto o preço da faixa menor em registros legados", () => {
    const dados = montarDadosContratoSenhorChurrasco({
      ...evento, qtd_criancas_ate_5: 4, preco_crianca_meia: "50",
    } as Evento, []);
    expect(dados.itens).toContainEqual(["Crianças de 0 a 5 anos", 4, null, null]);
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
