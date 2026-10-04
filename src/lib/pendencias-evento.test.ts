import { describe, expect, it } from "vitest";
import {
  calcularItensPendencia,
  calcularPendencias,
  destinoItemPendencia,
  type EntradaPendencias,
} from "@/lib/pendencias-evento";

const completo: EntradaPendencias = {
  garconsNecessarios: 2,
  equipe: { copeiras: 1, assadores: 1, garcons: 2 },
  decisoes: {
    veiculo: "Kombi",
    modeloPrato: "Raso branco",
    tipoBebidaRecipiente: "Copo americano",
    tipoTalher: "Inox",
  },
};

describe("calcularPendencias", () => {
  it("evento completo não tem pendência", () => {
    expect(calcularPendencias(completo)).toEqual([]);
  });

  it("aponta equipe mínima faltando", () => {
    const r = calcularPendencias({
      ...completo,
      equipe: { copeiras: 0, assadores: 0, garcons: 1 },
    });
    expect(r).toEqual([
      "Alocar ao menos 1 copeira",
      "Alocar ao menos 1 assador",
      "Alocar garçons (1 de 2)",
    ]);
  });

  it("sem garçons contratados, nenhum garçom é exigido", () => {
    expect(
      calcularPendencias({
        ...completo,
        garconsNecessarios: null,
        equipe: { copeiras: 1, assadores: 1, garcons: 0 },
      })
    ).toEqual([]);
  });

  it("decisões nunca salvas geram uma única pendência", () => {
    expect(calcularPendencias({ ...completo, decisoes: null })).toEqual([
      "Preencher as decisões operacionais",
    ]);
  });

  it("campo logístico vazio ou só espaços é pendente", () => {
    const r = calcularPendencias({
      ...completo,
      decisoes: { veiculo: "  ", modeloPrato: null, tipoBebidaRecipiente: "x", tipoTalher: "" },
    });
    expect(r).toEqual(["Definir veículo", "Definir modelo do prato", "Definir talher"]);
  });
});

describe("itens e destino", () => {
  const ativos = { copeira: 0, assador: 2, garcom: 3 };
  const itens = calcularItensPendencia({
    garconsNecessarios: 3,
    equipe: { copeiras: 0, assadores: 0, garcons: 1 },
    decisoes: { veiculo: null, modeloPrato: "x", tipoBebidaRecipiente: "x", tipoTalher: "x" },
  });

  it("itens estruturados trazem função e quantidade faltante", () => {
    expect(itens.map((i) => i.texto)).toEqual(
      calcularPendencias({
        garconsNecessarios: 3,
        equipe: { copeiras: 0, assadores: 0, garcons: 1 },
        decisoes: { veiculo: null, modeloPrato: "x", tipoBebidaRecipiente: "x", tipoTalher: "x" },
      })
    );
    expect(itens[2]).toMatchObject({ tipo: "equipe", funcao: "garcom", faltam: 2 });
  });

  it("sem ativo da função, leva a /colaboradores; senão à âncora do evento", () => {
    expect(destinoItemPendencia(itens[0], 7, ativos).href).toBe("/colaboradores");
    expect(destinoItemPendencia(itens[1], 7, ativos).href).toBe("/agenda/7#decisoes-operacionais");
    expect(destinoItemPendencia(itens[3], 7, ativos).href).toBe("/agenda/7#decisoes-operacionais");
  });
});
