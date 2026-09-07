import { describe, expect, it } from "vitest";
import { verificarRateLimit } from "@/lib/rate-limit";

describe("verificarRateLimit", () => {
  it("permite até o limite, depois bloqueia", () => {
    const chave = `teste-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(verificarRateLimit(chave, 3, 60_000)).toEqual({ permitido: true });
    }
    const resultado = verificarRateLimit(chave, 3, 60_000);
    expect(resultado.permitido).toBe(false);
  });

  it("chaves diferentes têm contadores independentes", () => {
    const chaveA = `teste-a-${Math.random()}`;
    const chaveB = `teste-b-${Math.random()}`;
    expect(verificarRateLimit(chaveA, 1, 60_000)).toEqual({ permitido: true });
    expect(verificarRateLimit(chaveA, 1, 60_000).permitido).toBe(false);
    expect(verificarRateLimit(chaveB, 1, 60_000)).toEqual({ permitido: true });
  });

  it("libera de novo depois que a janela expira", async () => {
    const chave = `teste-janela-${Math.random()}`;
    expect(verificarRateLimit(chave, 1, 50)).toEqual({ permitido: true });
    expect(verificarRateLimit(chave, 1, 50).permitido).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(verificarRateLimit(chave, 1, 50)).toEqual({ permitido: true });
  });
});
