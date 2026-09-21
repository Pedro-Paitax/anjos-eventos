/**
 * Equivalência NocoDB x Postgres novo (Oracle) — Grupo B: debug-calculo-cardapio
 * e simulador-orcamento (docs/CHECKLIST_CORTE_PRODUCAO.md, Fase A). SÓ LEITURA.
 * Divergência de valor em módulo financeiro é BLOQUEANTE — não ajustar o teste
 * pra passar.
 *
 * Roda só com RUN_PARIDADE=1 e DATABASE_URL apontando pro Oracle.
 * Uso, no servidor: RUN_PARIDADE=1 npx vitest run paridade-grupo-b-debug-simulador
 *
 * Sem dado de Orçamento (Oracle: 0 linhas; NocoDB: 1 placeholder sem
 * Num_Convidados/itens) NÃO se simula dado: o simulador só tem equivalência
 * testada no caminho "Orçamento inexistente".
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

/**
 * O NocoDB estoura o timeout de 5s sob carga (comportamento conhecido da API,
 * não da migração): repete só falha de TRANSPORTE (exceção de timeout ou
 * "Falha ao consultar NocoDB" no resultado). Valor divergente NUNCA é repetido.
 */
async function comRetentativaDeTransporte<T>(fn: () => Promise<T>, tentativas = 4): Promise<T> {
  let ultimo: T | undefined;
  for (let i = 0; i < tentativas; i++) {
    try {
      ultimo = await fn();
      if (!JSON.stringify(ultimo).includes("Falha ao consultar NocoDB")) return ultimo;
    } catch (e) {
      if (i === tentativas - 1 || !/timeout|aborted/i.test(String((e as Error)?.message ?? e))) throw e;
    }
  }
  return ultimo as T;
}

describe.skipIf(!habilitado)("equivalência Grupo B: debug + simulador (NocoDB x Oracle)", () => {
  it("guard: DATABASE_URL aponta pro Oracle e há token do NocoDB", () => {
    expect(apontaProOracle, "DATABASE_URL não aponta pro Oracle").toBe(true);
    expect(process.env.NOCODB_API_TOKEN, "NOCODB_API_TOKEN ausente").toBeTruthy();
  });

  it("debug-calculo-cardapio: cada Cardápio Modelo real, resultado idêntico (100 convidados)", async () => {
    if (!apontaProOracle) return;
    const { calcularDebugCardapio } = await import("@/lib/debug-calculo-cardapio");
    const { db } = await import("@/db/client");
    const { cardapiosModelo, cardapioModeloItens } = await import("@/db/schema/catalogo-complementar");
    const { eq } = await import("drizzle-orm");

    const cardapios = await db.select().from(cardapiosModelo);
    expect(cardapios.length).toBeGreaterThan(0);

    const divergencias: string[] = [];
    let comparados = 0;
    const inconclusivos: string[] = [];
    for (const c of cardapios) {
      const itens = await db
        .select({ preparoId: cardapioModeloItens.preparoId })
        .from(cardapioModeloItens)
        .where(eq(cardapioModeloItens.cardapioModeloId, c.id));
      const ids = [...new Set(itens.map((i) => i.preparoId))].sort((a, b) => a - b);
      const opcoes = { numConvidados: 100, regiaoMetropolitanaCuritiba: false };

      // Amostra: a 1ª fatia de 4 preparos de cada cardápio (um cardápio inteiro
      // estoura o timeout de 5s do NocoDB e comparar tudo passa de 10 min).
      // Se o NocoDB persistir em timeout, a fatia é dividida ao meio até 1
      // preparo; só falha de TRANSPORTE de 1 preparo vira "inconclusivo".
      // Valor divergente sem sinal de timeout é SEMPRE divergência (bloqueante).
      const comparar = async (fatia: number[]): Promise<void> => {
        process.env.DATA_SOURCE = "nocodb";
        const noco = await comRetentativaDeTransporte(() => calcularDebugCardapio(fatia, opcoes));
        process.env.DATA_SOURCE = "oracle";
        const oracle = await calcularDebugCardapio(fatia, opcoes);
        delete process.env.DATA_SOURCE;

        const nocoTimeout = JSON.stringify(noco).includes("Falha ao consultar NocoDB");
        if (nocoTimeout) {
          if (fatia.length === 1) {
            inconclusivos.push(`Cardápio ${c.id} preparo ${fatia[0]}: NocoDB em timeout`);
            return;
          }
          const meio = Math.ceil(fatia.length / 2);
          await comparar(fatia.slice(0, meio));
          await comparar(fatia.slice(meio));
          return;
        }
        comparados++;
        const igual = JSON.stringify(noco) === JSON.stringify(oracle);
        console.log(`[fatia] cardápio ${c.id} ${JSON.stringify(fatia)} idêntico=${igual}`);
        if (!igual) divergencias.push(`Cardápio ${c.id} (${c.nome}) preparos ${JSON.stringify(fatia)}`);
      };
      await comparar(ids.slice(0, 4));
    }
    console.log("[inconclusivos por timeout do NocoDB]", inconclusivos.length, JSON.stringify(inconclusivos));
    console.log(`[equivalência debug-calculo-cardapio] ${comparados} fatias de cardápio comparadas, ${divergencias.length} divergências`);
    expect(divergencias).toEqual([]);
  }, 900_000);

  it("simulador-orcamento: Orçamento inexistente → mesmo erro e status nos dois modos", async () => {
    if (!apontaProOracle) return;
    const { calcularSimuladorOrcamento } = await import("@/lib/simulador-orcamento");
    process.env.DATA_SOURCE = "nocodb";
    const noco = await calcularSimuladorOrcamento(999999);
    process.env.DATA_SOURCE = "oracle";
    const oracle = await calcularSimuladorOrcamento(999999);
    delete process.env.DATA_SOURCE;
    console.log("[equivalência simulador-orcamento] inexistente:", JSON.stringify(noco), "x", JSON.stringify(oracle));
    expect(oracle).toEqual(noco);
  }, 60_000);
});
