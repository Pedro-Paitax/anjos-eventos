import { describe, expect, it } from "vitest";
import { jidDoWhatsapp, NumeroSemWhatsappError, paraJid } from "./telefone.js";

describe("paraJid", () => {
  it("normaliza para o JID do WhatsApp", () => {
    expect(paraJid("+55 (00) 90000-0000")).toBe("5500900000000@s.whatsapp.net");
  });
  it("rejeita quantidade de dígitos fora de 10-15", () => {
    expect(() => paraJid("123")).toThrow();
    expect(() => paraJid("1".repeat(16))).toThrow();
  });
});

describe("jidDoWhatsapp", () => {
  it("usa o JID devolvido pelo WhatsApp, mesmo que difira do montado (nono dígito)", () => {
    const montado = paraJid("5500900000000");
    const real = "550090000000@s.whatsapp.net";
    expect(jidDoWhatsapp([{ exists: true, jid: real }])).toBe(real);
    expect(real).not.toBe(montado);
  });
  it("mantém o JID quando o WhatsApp confirma o mesmo", () => {
    const jid = paraJid("5500900000000");
    expect(jidDoWhatsapp([{ exists: true, jid }])).toBe(jid);
  });
  it("falha quando o número não tem WhatsApp ou a resposta vem vazia", () => {
    expect(() => jidDoWhatsapp([{ exists: false, jid: "5500900000000@s.whatsapp.net" }])).toThrow(
      NumeroSemWhatsappError,
    );
    expect(() => jidDoWhatsapp([])).toThrow(NumeroSemWhatsappError);
    expect(() => jidDoWhatsapp(undefined)).toThrow(NumeroSemWhatsappError);
  });
});
