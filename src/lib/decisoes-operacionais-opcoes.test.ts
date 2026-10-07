import { describe, expect, it } from "vitest";
import {
  OPCOES_COPO_TACA,
  OPCOES_MODELO_PRATO,
  OPCOES_TALHER,
  OPCOES_VEICULO,
  ehValorLegado,
  valorValido,
  validarQuantidadeTacas,
} from "@/lib/decisoes-operacionais-opcoes";
import { calcularPendencias } from "@/lib/pendencias-evento";

describe("opções de logística", () => {
  it("listas exatamente como definidas", () => {
    expect([...OPCOES_VEICULO]).toEqual(["Master", "Kombi Nova", "Kombi Velha", "Outro/Terceiro"]);
    expect([...OPCOES_MODELO_PRATO]).toEqual(["Redondo pequeno", "Redondo grande", "Quadrado"]);
    expect([...OPCOES_COPO_TACA]).toEqual(["Copo", "Taça"]);
    expect([...OPCOES_TALHER]).toEqual(["Grande", "Pequeno"]);
  });

  it("valorValido aceita só valores da lista do campo", () => {
    expect(valorValido("veiculo", "Master")).toBe(true);
    expect(valorValido("veiculo", "Kombi")).toBe(false);
    expect(valorValido("tipoTalher", "Master")).toBe(false);
  });

  it("ehValorLegado: texto livre fora da lista sim; vazio ou da lista não", () => {
    expect(ehValorLegado("veiculo", "Kombi")).toBe(true);
    expect(ehValorLegado("veiculo", "Master")).toBe(false);
    expect(ehValorLegado("veiculo", "  ")).toBe(false);
    expect(ehValorLegado("veiculo", null)).toBe(false);
  });
});

describe("pendência com valor legado", () => {
  it("valor legado conta como preenchido", () => {
    expect(
      calcularPendencias({
        garconsNecessarios: null,
        equipe: { copeiras: 1, assadores: 1, garcons: 0 },
        decisoes: {
          veiculo: "Kombi",
          modeloPrato: "Raso branco",
          tipoBebidaRecipiente: "Copo americano",
          tipoTalher: "Inox",
        },
      })
    ).toEqual([]);
  });
});

describe("validarQuantidadeTacas", () => {
  it("sem a caixa marcada a quantidade é nula, mesmo se enviada", () => {
    expect(validarQuantidadeTacas(false, "", "taças")).toEqual({ valor: null });
    expect(validarQuantidadeTacas(false, "12", "taças")).toEqual({ valor: null });
  });
  it("com a caixa marcada aceita inteiro >= 1", () => {
    expect(validarQuantidadeTacas(true, "1", "taças")).toEqual({ valor: 1 });
    expect(validarQuantidadeTacas(true, " 48 ", "taças")).toEqual({ valor: 48 });
  });
  it("com a caixa marcada rejeita vazio, zero, negativo, decimal, texto e estouro", () => {
    for (const t of ["", "  ", "0", "-3", "2.5", "2,5", "abc", "1e3", "2147483648"]) {
      const r = validarQuantidadeTacas(true, t, "taças");
      expect(r.valor).toBeNull();
      expect(r.erro).toBeTruthy();
    }
  });
});
