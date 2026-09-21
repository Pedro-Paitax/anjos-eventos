/**
 * Paridade NocoDB x Postgres novo (Oracle) dos módulos do Grupo A
 * (docs/CHECKLIST_CORTE_PRODUCAO.md, Fase A). SÓ LEITURA nos dois lados.
 * Divergência de valor aqui é BLOQUEANTE — não ajustar o teste pra passar.
 *
 * Roda só com RUN_PARIDADE=1 e DATABASE_URL apontando pro Oracle (guard
 * abaixo). Uso, no servidor: RUN_PARIDADE=1 npx vitest run paridade-grupo-a
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

// unstable_cache fora do Next não tem cache incremental: passa direto.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
}));

function carregarEnv(arquivo: string) {
  const caminho = resolve(process.cwd(), arquivo);
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i === -1) continue;
    const chave = l.slice(0, i).trim();
    if (!(chave in process.env)) process.env[chave] = l.slice(i + 1).trim();
  }
}

const IP_ORACLE = "100.121.229.81";
const habilitado = process.env.RUN_PARIDADE === "1";
if (habilitado) {
  carregarEnv(".env");
  carregarEnv(".env.local");
}
const apontaProOracle = process.env.DATABASE_URL?.includes(IP_ORACLE) ?? false;

describe.skipIf(!habilitado)("paridade Grupo A (NocoDB x Oracle)", () => {
  it("guard: DATABASE_URL aponta pro Oracle e há token do NocoDB", () => {
    expect(apontaProOracle, "DATABASE_URL não aponta pro Oracle").toBe(true);
    expect(process.env.NOCODB_API_TOKEN, "NOCODB_API_TOKEN ausente").toBeTruthy();
  });

  it("custo-preparo: todos os Preparos, todos os campos idênticos", async () => {
    if (!apontaProOracle) return;
    const { calcularCustoPreparo } = await import("@/lib/custo-preparo");
    const { db } = await import("@/db/client");
    const { preparos } = await import("@/db/schema/preparos");

    const ids = (await db.select({ id: preparos.id }).from(preparos)).map((r) => r.id).sort((a, b) => a - b);
    expect(ids.length).toBeGreaterThan(0);

    const divergencias: string[] = [];
    for (const id of ids) {
      process.env.DATA_SOURCE = "nocodb";
      const noco = await calcularCustoPreparo(id);
      process.env.DATA_SOURCE = "oracle";
      const oracle = await calcularCustoPreparo(id);
      if (JSON.stringify(noco) !== JSON.stringify(oracle)) {
        divergencias.push(`Id ${id}: nocodb=${JSON.stringify(noco)} oracle=${JSON.stringify(oracle)}`);
      }
    }
    delete process.env.DATA_SOURCE;
    console.log(`[paridade custo-preparo] ${ids.length} preparos comparados, ${divergencias.length} divergências`);
    expect(divergencias).toEqual([]);
  }, 300_000);

  it("hierarquia-proteina: mapa subcategoria -> peso idêntico", async () => {
    if (!apontaProOracle) return;
    const { buscarPesosPadraoPorSubcategoria } = await import("@/lib/hierarquia-proteina");
    const token = process.env.NOCODB_API_TOKEN!;
    process.env.DATA_SOURCE = "nocodb";
    const noco = await buscarPesosPadraoPorSubcategoria(token);
    process.env.DATA_SOURCE = "oracle";
    const oracle = await buscarPesosPadraoPorSubcategoria(token);
    delete process.env.DATA_SOURCE;
    console.log(`[paridade hierarquia-proteina] nocodb=${noco.size} oracle=${oracle.size} entradas`);
    expect([...oracle.entries()].sort()).toEqual([...noco.entries()].sort());
  }, 60_000);
});
