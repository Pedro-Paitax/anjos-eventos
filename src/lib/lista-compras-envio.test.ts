import { beforeEach, describe, expect, it, vi } from "vitest";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ pool: { query } }));

import {
  mascararDestino,
  obterUltimoEnvioListaCompras,
  registrarEnvioListaCompras,
} from "@/lib/lista-compras-envio";

describe("leitura defensiva do último envio", () => {
  beforeEach(() => {
    query.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("coluna inexistente: devolve null, não lança e registra no log", async () => {
    query.mockRejectedValue(new Error('column "lista_compras_enviada_em" does not exist'));
    await expect(obterUltimoEnvioListaCompras(1)).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("linha inexistente ou coluna nula: null", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await obterUltimoEnvioListaCompras(1)).toBeNull();
    query.mockResolvedValueOnce({ rows: [{ enviada_em: null }] });
    expect(await obterUltimoEnvioListaCompras(1)).toBeNull();
  });

  it("com data: devolve ISO", async () => {
    query.mockResolvedValue({ rows: [{ enviada_em: new Date("2026-10-07T12:00:00Z") }] });
    expect(await obterUltimoEnvioListaCompras(1)).toBe("2026-10-07T12:00:00.000Z");
  });
});

describe("gravação do envio", () => {
  beforeEach(() => {
    query.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("usa upsert por evento_id", async () => {
    query.mockResolvedValue({ rows: [] });
    expect(await registrarEnvioListaCompras(7)).toBe(true);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO decisoes_operacionais_evento/);
    expect(sql).toMatch(/ON CONFLICT \(evento_id\) DO UPDATE/);
    expect(params).toEqual([7]);
  });

  it("falha do banco: false, sem lançar", async () => {
    query.mockRejectedValue(new Error("x"));
    expect(await registrarEnvioListaCompras(7)).toBe(false);
  });
});

describe("mascararDestino", () => {
  it("mostra só os 4 últimos dígitos", () => {
    expect(mascararDestino("+55 (11) 91234-5678")).toBe("•••• 5678");
    expect(mascararDestino("5511912345678")).not.toContain("5511");
  });
  it("com menos de 4 dígitos não revela nada", () => {
    expect(mascararDestino("12")).toBe("••••");
  });
});
