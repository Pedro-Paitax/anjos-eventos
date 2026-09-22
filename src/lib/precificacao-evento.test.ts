import { describe, expect, it, vi } from "vitest";
import type { ItemResolvido } from "@/lib/dimensionamento-cardapio";
import type { CustoPreparoResultado, CustoPreparoErro } from "@/lib/custo-preparo";

// docs/DECISOES.md, "Política de Falha do Motor de Cálculo" — testa a
// distinção fail-hard (timeout/erro de rede) x fail-fast (dado faltando)
// em resolverItensParaPrecificacao, sem depender de rede/NocoDB real:
// resolverItensPorPreparoIds e calcularCustoPreparo são mockados.
vi.mock("@/lib/nocodb", () => ({
  exigirToken: () => "token-fake",
}));
vi.mock("@/lib/data-source", () => ({
  dataSource: () => "nocodb",
}));

const resolverItensPorPreparoIds = vi.fn<
  (preparoIds: number[], token: string) => Promise<{ itensResolvidos: ItemResolvido[]; itensExcluidos: { preparo: string; motivo: string }[] }>
>();
vi.mock("@/lib/dimensionamento-cardapio", async () => {
  // distribuirPorcoes é usado de verdade por calcularPrecificacaoCardapio
  // (núcleo puro, já testado em precificacao-cardapio.test.ts) — só
  // resolverItensPorPreparoIds (I/O) é mockado aqui.
  const real = await vi.importActual<typeof import("@/lib/dimensionamento-cardapio")>(
    "@/lib/dimensionamento-cardapio"
  );
  return {
    ...real,
    resolverItensPorPreparoIds: (...args: [number[], string]) => resolverItensPorPreparoIds(...args),
  };
});

const calcularCustoPreparo = vi.fn<
  (preparoId: number, preparoJaBuscado?: unknown) => Promise<CustoPreparoResultado | CustoPreparoErro>
>();
vi.mock("@/lib/custo-preparo", async () => {
  const real = await vi.importActual<typeof import("@/lib/custo-preparo")>("@/lib/custo-preparo");
  return {
    ...real,
    calcularCustoPreparo: (...args: [number, unknown?]) => calcularCustoPreparo(...args),
  };
});

const { calcularPrecificacaoParaPreparos } = await import("@/lib/precificacao-evento");

function itemResolvido(preparoId: number, preparoNome: string): ItemResolvido {
  return {
    preparoId,
    preparoNome,
    headerExibicao: "Header",
    peso: 1,
    origemPeso: "padrao",
    porcaoMaximaIndividual: null,
    macroCategoriaChave: "Macro",
    macroCategoriaNome: "Macro",
    capacidadeTeto: 100,
    unidade: "g",
    unidadeRendimentoPreparo: "G",
    pesoMedioUnidadeG: null,
    rendimentoPreparo: 1000,
  };
}

function custoValido(): CustoPreparoResultado {
  return { preparo: "x", custo_total_preparo: 10, rendimento: 100, unidade_rendimento: "g", custo_por_100_unidades: 10 };
}

const OPCOES = { numConvidados: 10, regiaoMetropolitanaCuritiba: false };

describe("resolverItensParaPrecificacao — Política de Falha do Motor de Cálculo", () => {
  it("timeout/erro de rede em UM item derruba o cálculo INTEIRO (fail-hard), mesmo com outro item válido", async () => {
    resolverItensPorPreparoIds.mockResolvedValueOnce({
      itensResolvidos: [itemResolvido(1, "Vinagrete"), itemResolvido(2, "Arroz")],
      itensExcluidos: [],
    });
    calcularCustoPreparo.mockImplementation(async (preparoId: number) =>
      preparoId === 1
        ? custoValido()
        : { erro: "Falha ao consultar NocoDB: timeout", status: 502, motivoFalhaRede: "timeout_composicao" }
    );

    const resultado = await calcularPrecificacaoParaPreparos([1, 2], OPCOES);

    expect(resultado).toEqual({
      erro: "falha_calculo",
      mensagem: "Não foi possível calcular o cardápio agora. Tente novamente.",
      itens_com_falha: [{ preparo_id: 2, motivo: "timeout_composicao" }],
      status: 503,
    });
  });

  it("dado faltando (ex.: Rendimento não cadastrado) continua excluindo o item normalmente — não é fail-hard", async () => {
    resolverItensPorPreparoIds.mockResolvedValueOnce({
      itensResolvidos: [itemResolvido(1, "Vinagrete"), itemResolvido(2, "Sem Rendimento")],
      itensExcluidos: [],
    });
    calcularCustoPreparo.mockImplementation(async (preparoId: number) =>
      preparoId === 1
        ? custoValido()
        : { erro: 'Preparo "Sem Rendimento" está sem Rendimento válido cadastrado.', status: 422 }
    );

    const resultado = await calcularPrecificacaoParaPreparos([1, 2], OPCOES);

    expect("erro" in resultado).toBe(false);
    if (!("erro" in resultado)) {
      expect(resultado.itensExcluidos).toEqual([
        { preparo: "Sem Rendimento", motivo: "Falha ao calcular o custo do preparo." },
      ]);
    }
  });

  it("falha de rede ao resolver peso/macro-categoria (resolverItensPorPreparoIds lança) também é fail-hard, não vira exceção não tratada", async () => {
    resolverItensPorPreparoIds.mockRejectedValueOnce(new Error("NocoDB respondeu 502 em /tables/..."));

    const resultado = await calcularPrecificacaoParaPreparos([1, 2], OPCOES);

    expect(resultado).toEqual({
      erro: "falha_calculo",
      mensagem: "Não foi possível calcular o cardápio agora. Tente novamente.",
      itens_com_falha: [
        { preparo_id: 1, motivo: "timeout_preparo" },
        { preparo_id: 2, motivo: "timeout_preparo" },
      ],
      status: 503,
    });
  });

  it("nenhuma falha: comportamento normal preservado (regressão)", async () => {
    resolverItensPorPreparoIds.mockResolvedValueOnce({
      itensResolvidos: [itemResolvido(1, "Vinagrete")],
      itensExcluidos: [],
    });
    calcularCustoPreparo.mockResolvedValueOnce(custoValido());

    const resultado = await calcularPrecificacaoParaPreparos([1], OPCOES);

    expect("erro" in resultado).toBe(false);
    if (!("erro" in resultado)) {
      expect(resultado.itensExcluidos).toEqual([]);
      expect(resultado.resultado.custo_cardapio_total).toBeGreaterThan(0);
    }
  });
});
