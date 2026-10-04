import { describe, expect, it } from "vitest";
import { montarMensagemLembrete } from "@/lib/lembrete-mensagem";

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
