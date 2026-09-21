/**
 * Equivalência NocoDB x Postgres novo (Oracle) dos módulos do Grupo B:
 * insumos, cardapios-modelo, preparos (listas, contagens e valores lidos).
 * SÓ LEITURA nos dois lados. As funções de ESCRITA (criar/atualizar/excluir)
 * NÃO são exercitadas aqui: escrever em produção está fora do escopo
 * autorizado — ficam registradas como "não validadas contra banco".
 *
 * Roda só com RUN_PARIDADE=1 e DATABASE_URL apontando pro Oracle.
 * Uso, no servidor: RUN_PARIDADE=1 npx vitest run paridade-grupo-b.integration
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
 * Roda `fn` uma vez em cada modo e devolve os dois resultados. O lado NocoDB
 * tem retry (timeout de 5s estoura sob carga — a API leva ~3s só pra listar
 * os Preparos — e alguns ramos engolem o erro e devolvem vazio): isso separa
 * instabilidade do NocoDB de divergência real. O lado Oracle NÃO tem retry.
 */
async function nosDoisModos<T>(
  fn: () => Promise<T>,
  resultadoValido: (r: T) => boolean = () => true
): Promise<{ nocodb: T; oracle: T }> {
  process.env.DATA_SOURCE = "nocodb";
  let nocodb!: T;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      nocodb = await fn();
      if (resultadoValido(nocodb)) break;
    } catch (erro) {
      if (tentativa === 4) throw erro;
    }
    await new Promise((r) => setTimeout(r, 3000 * tentativa));
  }
  process.env.DATA_SOURCE = "oracle";
  const oracle = await fn();
  delete process.env.DATA_SOURCE;
  return { nocodb, oracle };
}

describe.skipIf(!habilitado)("equivalência Grupo B (NocoDB x Oracle)", () => {
  it("guard: DATABASE_URL aponta pro Oracle e há token do NocoDB", () => {
    expect(apontaProOracle, "DATABASE_URL não aponta pro Oracle").toBe(true);
    expect(process.env.NOCODB_API_TOKEN, "NOCODB_API_TOKEN ausente").toBeTruthy();
  });

  it("insumos: listarInsumos idêntico", async () => {
    if (!apontaProOracle) return;
    const { listarInsumos } = await import("@/lib/insumos");
    const { nocodb, oracle } = await nosDoisModos(listarInsumos);
    console.log(`[equivalência insumos] nocodb=${nocodb.length} oracle=${oracle.length}`);
    expect(oracle).toEqual(nocodb);
  }, 120_000);

  it("cardapios-modelo: lista e detalhe de cada cardápio idênticos", async () => {
    if (!apontaProOracle) return;
    const { listarCardapiosModelo, obterCardapioModeloComItens } = await import("@/lib/cardapios-modelo");
    const { nocodb, oracle } = await nosDoisModos(listarCardapiosModelo);
    console.log(`[equivalência cardapios-modelo] lista nocodb=${nocodb.length} oracle=${oracle.length}`);
    expect(oracle).toEqual(nocodb);

    const divergencias: string[] = [];
    let totalItens = 0;
    for (const c of nocodb) {
      const r = await nosDoisModos(() => obterCardapioModeloComItens(c.id));
      const ordenar = (d: typeof r.nocodb) => (d ? { ...d, itens: [...d.itens].sort((a, b) => a.id - b.id) } : d);
      totalItens += r.nocodb?.itens.length ?? 0;
      if (JSON.stringify(ordenar(r.nocodb)) !== JSON.stringify(ordenar(r.oracle))) {
        divergencias.push(`cardápio ${c.id}: nocodb=${JSON.stringify(ordenar(r.nocodb))} oracle=${JSON.stringify(ordenar(r.oracle))}`);
      }
    }
    console.log(`[equivalência cardapios-modelo] ${nocodb.length} cardápios, ${totalItens} itens, ${divergencias.length} divergências`);
    expect(divergencias).toEqual([]);
  }, 300_000);

  it("preparos: listas por categoria e plana idênticas", async () => {
    if (!apontaProOracle) return;
    const { listarPreparos, listarPreparosPorCategoria } = await import("@/lib/preparos");
    const lista = await nosDoisModos(listarPreparos);
    console.log(`[equivalência preparos] listarPreparos nocodb=${lista.nocodb.length} oracle=${lista.oracle.length}`);
    expect(lista.oracle).toEqual(lista.nocodb);

    const porCat = await nosDoisModos(listarPreparosPorCategoria, (r) =>
      Object.values(r).some((v) => v.length > 0)
    );
    const contagem = Object.fromEntries(Object.entries(porCat.nocodb).map(([k, v]) => [k, v.length]));
    console.log(`[equivalência preparos] por categoria (nocodb): ${JSON.stringify(contagem)}`);
    expect(porCat.oracle).toEqual(porCat.nocodb);
  }, 300_000);

  it("preparos: obterPreparoComComposicao idêntico em todos os Preparos", async () => {
    if (!apontaProOracle) return;
    const { obterPreparoComComposicao, listarPreparos } = await import("@/lib/preparos");
    process.env.DATA_SOURCE = "oracle";
    const ids = (await listarPreparos()).map((p) => p.id).sort((a, b) => a - b);
    delete process.env.DATA_SOURCE;

    const divergencias: string[] = [];
    let totalComposicao = 0;
    for (const id of ids) {
      const r = await nosDoisModos(() => obterPreparoComComposicao(id));
      const ordenar = (d: typeof r.nocodb) => (d ? { ...d, composicao: [...d.composicao].sort((a, b) => a.id - b.id) } : d);
      totalComposicao += r.nocodb?.composicao.length ?? 0;
      if (JSON.stringify(ordenar(r.nocodb)) !== JSON.stringify(ordenar(r.oracle))) {
        divergencias.push(`Id ${id}: nocodb=${JSON.stringify(ordenar(r.nocodb))} oracle=${JSON.stringify(ordenar(r.oracle))}`);
      }
    }
    console.log(`[equivalência preparos] ${ids.length} preparos, ${totalComposicao} linhas de composição, ${divergencias.length} divergências`);
    console.log(divergencias.slice(0, 5).join("\n"));
    expect(divergencias).toEqual([]);
  }, 900_000);
});
