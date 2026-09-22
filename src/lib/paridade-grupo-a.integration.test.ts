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

  it("dimensionamento-cardapio: resolverItensPorPreparoIds idêntico em todos os Preparos", async () => {
    if (!apontaProOracle) return;
    const { resolverItensPorPreparoIds } = await import("@/lib/dimensionamento-cardapio");
    const { db } = await import("@/db/client");
    const { preparos } = await import("@/db/schema/preparos");
    const token = process.env.NOCODB_API_TOKEN!;
    const ids = (await db.select({ id: preparos.id }).from(preparos)).map((r) => r.id).sort((a, b) => a - b);

    // Em lotes: o NocoDB estoura o timeout de 5s com 54 preparos em paralelo
    // (comportamento conhecido da API, não da migração).
    type Res = Awaited<ReturnType<typeof resolverItensPorPreparoIds>>;
    const rodar = async (fonte: "nocodb" | "oracle"): Promise<Res> => {
      process.env.DATA_SOURCE = fonte;
      const acc: Res = { itensResolvidos: [], itensExcluidos: [] };
      for (let i = 0; i < ids.length; i += 6) {
        const r = await resolverItensPorPreparoIds(ids.slice(i, i + 6), token);
        acc.itensResolvidos.push(...r.itensResolvidos);
        acc.itensExcluidos.push(...r.itensExcluidos);
      }
      return acc;
    };
    const noco = await rodar("nocodb");
    const oracle = await rodar("oracle");
    delete process.env.DATA_SOURCE;

    const porId = (r: typeof noco) => new Map(r.itensResolvidos.map((i) => [i.preparoId, JSON.stringify(i)]));
    const excl = (r: typeof noco) => new Map(r.itensExcluidos.map((i) => [i.preparo, i.motivo]));
    const a = porId(noco), b = porId(oracle), ea = excl(noco), eb = excl(oracle);
    const divergencias: string[] = [];
    for (const id of ids) {
      if (a.get(id) !== b.get(id)) divergencias.push(`resolvido Id ${id}: nocodb=${a.get(id)} oracle=${b.get(id)}`);
    }
    for (const [nome, motivo] of ea) if (eb.get(nome) !== motivo) divergencias.push(`excluido "${nome}": nocodb="${motivo}" oracle="${eb.get(nome)}"`);
    for (const nome of eb.keys()) if (!ea.has(nome)) divergencias.push(`excluido só no oracle: "${nome}"`);
    console.log(`[paridade dimensionamento] ${ids.length} preparos; resolvidos nocodb=${a.size} oracle=${b.size}; excluidos nocodb=${ea.size} oracle=${eb.size}; ${divergencias.length} divergências`);
    // Diagnóstico: quantas divergências têm a causa conhecida (peso vindo de
    // Hierarquia_Proteina, tabela ainda sem ETL no Oracle)? As demais são
    // divergência real e bloqueiam de qualquer forma.
    const viaHierarquia = noco.itensResolvidos.filter((i) => i.origemPeso.startsWith("Hierarquia_Proteina"));
    const idsHier = new Set(viaHierarquia.map((i) => i.preparoId));
    const nomesHier = new Set(viaHierarquia.map((i) => i.preparoNome));
    const idsDiv = ids.filter((id) => a.get(id) !== b.get(id));
    const naoExplicadasIds = idsDiv.filter((id) => !idsHier.has(id));
    const nomesExclDiv = [...ea.keys(), ...eb.keys()].filter((n) => ea.get(n) !== eb.get(n));
    const naoExplicadasNomes = [...new Set(nomesExclDiv)].filter((n) => !nomesHier.has(n));
    console.log(
      `[diagnostico] via Hierarquia_Proteina (nocodb)=${viaHierarquia.length}; ids divergentes=${idsDiv.length}; NÃO explicados por hierarquia: ids=${naoExplicadasIds.length} ${JSON.stringify(naoExplicadasIds)} nomes-excluidos=${naoExplicadasNomes.length} ${JSON.stringify(naoExplicadasNomes)}`
    );
    expect(divergencias).toEqual([]);
  }, 300_000);
});
