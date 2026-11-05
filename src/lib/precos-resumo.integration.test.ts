import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integração com Postgres REAL e DESCARTÁVEL (migrações até a 0013 aplicadas, com o gatilho).
 * Só roda com TEST_DATABASE_URL de um banco "*_teste" igual a DATABASE_URL.
 */
const URL_TESTE = process.env.TEST_DATABASE_URL ?? "";
const seguro = /\/[^/?]*_teste(\?|$)/.test(URL_TESTE) && URL_TESTE === process.env.DATABASE_URL;

const enviarDocumento = vi.fn();
vi.mock("@/lib/whatsapp-worker", () => ({
  statusWorker: async () => ({ status: "connected", qr_code: null }),
  enviarDocumento: (...args: unknown[]) => enviarDocumento(...args),
  enviarTexto: vi.fn(),
}));

describe.skipIf(!seguro)("resumo de preços — gatilho e envio", () => {
  let pool: typeof import("@/lib/db").pool;
  let executar: typeof import("./precos-resumo").executarResumoPrecos;
  let arroz: number;

  const pendentes = async () =>
    (await pool.query("SELECT preco_anterior::float AS a, preco_novo::float AS d FROM alteracoes_preco_insumo WHERE enviado_em IS NULL ORDER BY id")).rows;

  beforeAll(async () => {
    process.env.FAMILIA_WHATSAPP_NUMEROS = "5541000000001,5541000000002";
    pool = (await import("@/lib/db")).pool;
    executar = (await import("./precos-resumo")).executarResumoPrecos;
    await pool.query("TRUNCATE alteracoes_preco_insumo, historico_precos, cotacoes, fornecedores, composicao, insumos RESTART IDENTITY CASCADE");
    arroz = (await pool.query("INSERT INTO insumos (nome, unidade, preco, fator_correcao) VALUES ('Arroz', 'KG', 6, 1) RETURNING id")).rows[0].id;
  });
  beforeEach(() => enviarDocumento.mockReset());
  afterAll(async () => {
    await pool?.end();
  });

  it("gatilho: insumo novo entra sem preço anterior; mudança de preço entra; mesmo preço ou outra coluna, não", async () => {
    expect(await pendentes()).toEqual([{ a: null, d: 6 }]);
    await pool.query("UPDATE insumos SET preco = 6 WHERE id = $1", [arroz]);
    await pool.query("UPDATE insumos SET fator_correcao = 0.9 WHERE id = $1", [arroz]);
    expect(await pendentes()).toHaveLength(1);
    await pool.query("UPDATE insumos SET preco = 7.5 WHERE id = $1", [arroz]);
    expect(await pendentes()).toEqual([{ a: null, d: 6 }, { a: 6, d: 7.5 }]);
  });

  it("todos os envios falharam: nada é marcado (sai amanhã)", async () => {
    enviarDocumento.mockRejectedValue(new Error("worker caiu"));
    expect(await executar()).toEqual({ ok: false, motivo: "todos_os_envios_falharam" });
    expect(await pendentes()).toHaveLength(2);
  });

  it("envia um PDF para cada número e marca as linhas; sem mudança nova, não envia", async () => {
    enviarDocumento.mockResolvedValue(undefined);
    expect(await executar()).toEqual({ ok: true, mudancas: 1, enviados: 2, falhas: 0 });
    expect(enviarDocumento).toHaveBeenCalledTimes(2);
    const [numero, arquivo, pdf, legenda] = enviarDocumento.mock.calls[0];
    expect(numero).toBe("5541000000001");
    expect(arquivo).toMatch(/^precos-insumos-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(legenda).toContain("1 insumo mudou");
    expect(await pendentes()).toEqual([]);

    enviarDocumento.mockClear();
    expect(await executar()).toEqual({ ok: true, mudancas: 0 });
    expect(enviarDocumento).not.toHaveBeenCalled();
  });
});
