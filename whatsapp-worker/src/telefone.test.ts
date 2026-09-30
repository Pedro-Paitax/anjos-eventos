import { describe, expect, it } from "vitest";
import { paraJid } from "./telefone.js";

describe("paraJid", () => {
  it("normaliza para o JID do WhatsApp", () => {
    expect(paraJid("+55 (00) 90000-0000")).toBe("5500900000000@s.whatsapp.net");
  });
  it("rejeita quantidade de dígitos fora de 10-15", () => {
    expect(() => paraJid("123")).toThrow();
    expect(() => paraJid("1".repeat(16))).toThrow();
  });
});
