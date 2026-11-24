import { describe, expect, it } from "vitest";
import { motivoBloqueioExclusao } from "@/lib/exclusao-evento";

describe("motivoBloqueioExclusao", () => {
  it("libera quando o evento não tem decisões operacionais", () => {
    expect(motivoBloqueioExclusao(null)).toBeNull();
  });

  it("libera quando nada foi enviado", () => {
    expect(motivoBloqueioExclusao({ listaComprasEnviadaEm: null, ordensDisparadasEm: null })).toBeNull();
  });

  it("bloqueia depois da lista de compras enviada e sugere cancelar", () => {
    const motivo = motivoBloqueioExclusao({
      listaComprasEnviadaEm: new Date("2026-11-20T15:00:00Z"),
      ordensDisparadasEm: null,
    });
    expect(motivo).toContain("lista de compras");
    expect(motivo).toContain("20/11");
    expect(motivo).toContain("Cancelado");
  });

  it("bloqueia depois da Ordem de Ação enviada", () => {
    const motivo = motivoBloqueioExclusao({
      listaComprasEnviadaEm: null,
      ordensDisparadasEm: new Date("2026-12-05T13:00:00Z"),
    });
    expect(motivo).toContain("Ordem de Ação");
  });
});
