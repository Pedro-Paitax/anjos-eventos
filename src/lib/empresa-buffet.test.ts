import { describe, expect, it } from "vitest";
import { ehEmpresaSenhorChurrasco } from "@/lib/empresa-buffet";

describe("ehEmpresaSenhorChurrasco", () => {
  it("reconhece o buffet pelo nome da empresa, mesmo sem itens de cardápio", () => {
    expect(ehEmpresaSenhorChurrasco("Buffet Senhor Churrasco")).toBe(true);
  });

  it("não confunde as outras empresas", () => {
    expect(ehEmpresaSenhorChurrasco("Anjos Cerimonial")).toBe(false);
    expect(ehEmpresaSenhorChurrasco("Em Plena Natureza Chácara de Eventos")).toBe(false);
    expect(ehEmpresaSenhorChurrasco(null)).toBe(false);
  });
});
