import { describe, expect, it } from "vitest";
import { dataEventoParaGravar } from "@/lib/data-evento";

describe("dataEventoParaGravar", () => {
  it("guarda a hora digitada, sem depender do fuso do servidor", () => {
    // toISOString() é o que o Drizzle grava num timestamp sem fuso.
    expect(dataEventoParaGravar("2027-01-16T12:00")?.toISOString()).toBe("2027-01-16T12:00:00.000Z");
    expect(dataEventoParaGravar("2027-01-16T12:00:30")?.toISOString()).toBe("2027-01-16T12:00:30.000Z");
  });

  it("recusa texto fora do formato do campo", () => {
    expect(dataEventoParaGravar("")).toBeNull();
    expect(dataEventoParaGravar("16/01/2027 12:00")).toBeNull();
    expect(dataEventoParaGravar("2027-02-30T12:00")).toBeNull();
  });
});
