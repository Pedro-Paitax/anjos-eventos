import { describe, expect, it } from "vitest";
import { normalizarTelefoneWhatsapp } from "@/lib/colaboradores-opcoes";

describe("normalizarTelefoneWhatsapp", () => {
  it("mantém só dígitos", () => {
    expect(normalizarTelefoneWhatsapp("+55 (41) 99999-9999")).toBe("5541999999999");
  });
  it("vazio vira null", () => {
    expect(normalizarTelefoneWhatsapp("  ")).toBeNull();
  });
  it("rejeita quantidade de dígitos fora de 10-15", () => {
    expect(normalizarTelefoneWhatsapp("12345")).toBe("invalido");
    expect(normalizarTelefoneWhatsapp("1".repeat(16))).toBe("invalido");
  });
});
