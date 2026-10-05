import { describe, expect, it } from "vitest";
import { chaveDiaEvento, diasAteEvento, rotuloEmDias } from "@/lib/formatacao";

// 2026-10-04 12:00 em São Paulo (UTC-3) = 15:00 UTC.
const MEIO_DIA_SP = new Date("2026-10-04T15:00:00Z");

describe("diasAteEvento", () => {
  it("mesmo dia de calendário é 0, mesmo que a hora do evento já tenha passado", () => {
    expect(diasAteEvento(new Date(2026, 9, 4, 0, 30), MEIO_DIA_SP)).toBe(0);
    expect(diasAteEvento(new Date(2026, 9, 4, 23, 59), MEIO_DIA_SP)).toBe(0);
  });

  it("conta dias de calendário, não de 24 horas", () => {
    // 23:30 em SP (02:30 UTC do dia 5): o evento das 08:00 do dia 5 é amanhã (1), não 0.
    const noite = new Date("2026-10-05T02:30:00Z");
    expect(diasAteEvento(new Date(2026, 9, 5, 8, 0), noite)).toBe(1);
    expect(diasAteEvento(new Date(2026, 9, 4, 20, 0), noite)).toBe(0);
  });

  it("usa a data de São Paulo, não a de UTC, perto da meia-noite", () => {
    // 01:00 UTC do dia 5 ainda é dia 4 em São Paulo.
    const tarde = new Date("2026-10-05T01:00:00Z");
    expect(diasAteEvento(new Date(2026, 9, 5, 12, 0), tarde)).toBe(1);
  });

  it("atravessa fim de mês e de ano", () => {
    expect(diasAteEvento(new Date(2026, 10, 3, 10, 0), MEIO_DIA_SP)).toBe(30);
    expect(diasAteEvento(new Date(2027, 0, 1, 10, 0), new Date("2026-12-30T15:00:00Z"))).toBe(2);
  });

  it("data passada dá negativo", () => {
    expect(diasAteEvento(new Date(2026, 9, 3, 10, 0), MEIO_DIA_SP)).toBe(-1);
  });
});

describe("rotuloEmDias", () => {
  it("hoje, amanhã, em N dias e nada para passado", () => {
    expect(rotuloEmDias(0)).toBe("hoje");
    expect(rotuloEmDias(1)).toBe("amanhã");
    expect(rotuloEmDias(2)).toBe("em 2 dias");
    expect(rotuloEmDias(15)).toBe("em 15 dias");
    expect(rotuloEmDias(-1)).toBeNull();
  });
});

describe("chaveDiaEvento", () => {
  it("formata AAAA-MM-DD com zeros, pela data local do evento", () => {
    expect(chaveDiaEvento(new Date(2026, 9, 7, 23, 30))).toBe("2026-10-07");
    expect(chaveDiaEvento(new Date(2027, 0, 1, 0, 5))).toBe("2027-01-01");
    expect(chaveDiaEvento(new Date(2026, 11, 31, 12, 0))).toBe("2026-12-31");
  });
});
