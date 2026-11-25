import { describe, expect, it } from "vitest";
import { montarMensagemLembrete, montarMensagemLembreteEvento } from "@/lib/lembrete-mensagem";

describe("montarMensagemLembrete", () => {
  it("lista cliente, data e pendências de cada evento", () => {
    const m = montarMensagemLembrete([
      { cliente: "Maria", data: "03/10", pendencias: ["Definir veículo", "Definir talher"] },
      { cliente: "João", data: "05/10", pendencias: ["Alocar ao menos 1 assador"] },
    ]);
    expect(m).toContain("• Maria (03/10): Definir veículo; Definir talher");
    expect(m).toContain("• João (05/10): Alocar ao menos 1 assador");
    expect(m.split("\n")[0]).toContain("próximos 7 dias");
  });
});

describe("montarMensagemLembreteEvento", () => {
  it("fala de um evento só, sem a janela de 7 dias", () => {
    const m = montarMensagemLembreteEvento({ cliente: "Maria", data: "03/10", pendencias: ["Definir veículo", "Definir talher"] });
    expect(m).toContain("Maria (03/10)");
    expect(m).toContain("• Definir veículo");
    expect(m).not.toContain("7 dias");
  });
});
