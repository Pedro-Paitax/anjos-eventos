import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, calcularDebugCardapio, obterFichasTecnicasPorPreparos, redirect } = vi.hoisted(() => ({
  obterUsuarioAtual: vi.fn(),
  calcularDebugCardapio: vi.fn(),
  obterFichasTecnicasPorPreparos: vi.fn(),
  redirect: vi.fn((destino: string) => {
    throw new Error(`REDIRECT:${destino}`);
  }),
}));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/debug-calculo-cardapio", () => ({ calcularDebugCardapio }));
vi.mock("@/lib/ficha-tecnica-evento", () => ({ obterFichasTecnicasPorPreparos }));
vi.mock("next/navigation", () => ({ redirect }));

import PaginaFichasTecnicasCardapio from "./page";
import { lerParametrosQuantidades, montarUrlFichasTecnicas } from "@/lib/quantidades-cardapio-url";

const renderizar = async (busca: Record<string, string>) =>
  renderToStaticMarkup(await PaginaFichasTecnicasCardapio({ searchParams: Promise.resolve(busca) }));

const ficha = {
  preparoId: 5,
  nomePreparo: "Arroz",
  quantidadeConfirmada: 4200,
  fatorMultiplicador: 1.1,
  rendimentoAjustado: 4620,
  unidadeRendimento: "G",
  insumos: [{ insumoId: 1, nome: "Cebola", unidade: "Unidade", quantidadeEscalada: 11, quantidadeExata: 11 }],
  passos: [{ ordem: 1, descricao: "Refogue.", tempo_estimado_min: 5 }],
  modoPreparoBruto: "",
};

describe("página /simulador-cardapio/fichas-tecnicas", () => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    calcularDebugCardapio.mockReset();
    obterFichasTecnicasPorPreparos.mockReset();
    redirect.mockClear();
  });

  it("sem sessão: vai para /login, sem consultar cálculo nem banco", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    await expect(renderizar({ preparos: "5", adultos: "10" })).rejects.toThrow("REDIRECT:/login");
    expect(calcularDebugCardapio).not.toHaveBeenCalled();
    expect(obterFichasTecnicasPorPreparos).not.toHaveBeenCalled();
  });

  it.each([
    ["sem preparos", { adultos: "10" }, "Selecione ao menos um item"],
    ["preparo inválido", { preparos: "abc", adultos: "10" }, "Item de cardápio inválido"],
    ["convidados inválidos", { preparos: "1", adultos: "-3" }, "Quantidade de convidados inválida"],
    ["nenhum convidado", { preparos: "1", adultos: "0" }, "Informe a quantidade de convidados"],
  ])("parâmetro inválido (%s): mensagem na folha, sem cálculo", async (_nome, busca, mensagem) => {
    obterUsuarioAtual.mockResolvedValue({ id: 1 });
    const html = await renderizar(busca);
    expect(html).toContain(mensagem);
    expect(html).not.toContain("Preparo 1 de");
    expect(calcularDebugCardapio).not.toHaveBeenCalled();
    expect(obterFichasTecnicasPorPreparos).not.toHaveBeenCalled();
  });

  it("com sessão e parâmetros válidos: mesma folha da Agenda, quantidade vinda do diagnóstico", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1 });
    calcularDebugCardapio.mockResolvedValue({
      linhas: [{ preparoId: 5, quantidadeParaCusto: 4200 }],
      itensExcluidos: [{ preparo: "Bolo", motivo: "Sem ficha" }],
    });
    obterFichasTecnicasPorPreparos.mockResolvedValue([ficha]);
    const html = await renderizar({ preparos: "5", adultos: "40", criancasAte5: "3", criancas5a10: "2" });
    expect(obterFichasTecnicasPorPreparos).toHaveBeenCalledWith([{ preparoId: 5, quantidade: 4200 }]);
    expect(html).toContain("Preparo 1 de 1");
    expect(html).toContain("11 Unidade");
    expect(html).toContain("quantidades incluem 10% de folga");
    expect(html).toContain("45 (40 adultos, 3 até 5 anos, 2 de 5 a 10 anos)");
    expect(html).toContain("Bolo");
    expect(html).toContain("Imprimir / Salvar como PDF");
  });

  it("erro do cálculo aparece na folha", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1 });
    calcularDebugCardapio.mockResolvedValue({ erro: "Preparo não encontrado.", status: 404 });
    expect(await renderizar({ preparos: "9", adultos: "10" })).toContain("Preparo não encontrado.");
    expect(obterFichasTecnicasPorPreparos).not.toHaveBeenCalled();
  });
});

describe("montarUrlFichasTecnicas", () => {
  it("aponta para a página e usa os parâmetros que a leitura valida", () => {
    const p = { preparoIds: [3, 7], adultos: 40, criancasAte5: 3, criancas5a10: 2 };
    const url = montarUrlFichasTecnicas(p);
    expect(url.startsWith("/simulador-cardapio/fichas-tecnicas?")).toBe(true);
    expect(lerParametrosQuantidades(new URLSearchParams(url.split("?")[1]))).toEqual(p);
  });
});
