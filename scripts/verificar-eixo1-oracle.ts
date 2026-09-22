/**
 * Eixo 1 de validação (docs/plano-migracao-postgres-vultr.md) —
 * recalcula o custo dos 3 preparos de referência já validados
 * manualmente durante todo o desenvolvimento, mas agora consultando o
 * Postgres novo (Oracle Cloud) via Drizzle, não mais o NocoDB. Prova
 * que a migração preservou a MATEMÁTICA, não só os dados brutos.
 *
 * Fórmula replicada de src/lib/custo-preparo.ts
 * (calcularCustoTotalComposicao/calcularCustoPor100Unidades) — não
 * importado direto dali porque esse arquivo carrega "server-only",
 * que lança fora do bundler do Next (mesmo motivo de
 * scripts/etl-nocodb-para-postgres.ts). Núcleo puro copiado, não
 * reimplementado do zero.
 *
 * Uso: npx tsx scripts/verificar-eixo1-oracle.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function carregarEnv(arquivo: string) {
  const caminho = resolve(process.cwd(), arquivo);
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const igual = l.indexOf("=");
    if (igual === -1) continue;
    const chave = l.slice(0, igual).trim();
    const valor = l.slice(igual + 1).trim();
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}
carregarEnv(".env");
carregarEnv(".env.local");

const IP_ORACLE_ESPERADO = "100.121.229.81";
if (!process.env.DATABASE_URL?.includes(IP_ORACLE_ESPERADO)) {
  console.error(`ABORTADO: DATABASE_URL não aponta pro Oracle Cloud. Valor: ${process.env.DATABASE_URL}`);
  process.exit(1);
}

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { preparos } from "../src/db/schema/preparos";
import { composicao } from "../src/db/schema/composicao";
import { insumos } from "../src/db/schema/insumos";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

/** Cópia exata de src/lib/custo-preparo.ts (calcularCustoTotalComposicao) — não reimplementada, só copiada por causa do guard "server-only". */
function arredondarCentavos(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}
function calcularCustoTotalComposicao(itens: { quantidade: number; preco: number | null; fatorCorrecao: number | null }[]): number {
  let custoTotal = 0;
  for (const item of itens) {
    const custoCorrigido = item.preco == null || !item.fatorCorrecao ? 0 : item.preco / item.fatorCorrecao;
    const subtotal = arredondarCentavos(item.quantidade * custoCorrigido);
    custoTotal = arredondarCentavos(custoTotal + subtotal);
  }
  return custoTotal;
}

const REFERENCIAS = [
  { id: 2, nome: "Vinagrete", esperado: 16.96 },
  { id: 12, nome: "Alcatra Grelhada", esperado: 64.93 },
  { id: 13, nome: "Arroz Branco com Alho Crispy", esperado: 20.07 },
];

async function main() {
  let algumaDivergencia = false;
  for (const ref of REFERENCIAS) {
    const [preparo] = await db.select().from(preparos).where(eq(preparos.id, ref.id));
    if (!preparo) {
      console.log(`[${ref.nome}] NÃO ENCONTRADO no Oracle.`);
      algumaDivergencia = true;
      continue;
    }

    const linhasComposicao = await db
      .select({ quantidade: composicao.quantidade, insumoId: composicao.insumoId })
      .from(composicao)
      .where(eq(composicao.preparoId, ref.id));

    const itensParaCusto = [];
    for (const linha of linhasComposicao) {
      const [insumo] = await db.select().from(insumos).where(eq(insumos.id, linha.insumoId));
      itensParaCusto.push({
        quantidade: Number(linha.quantidade),
        preco: insumo?.preco == null ? null : Number(insumo.preco),
        fatorCorrecao: insumo?.fatorCorrecao == null ? null : Number(insumo.fatorCorrecao),
      });
    }

    const custoTotal = calcularCustoTotalComposicao(itensParaCusto);
    const bate = Math.abs(custoTotal - ref.esperado) < 0.01;
    if (!bate) algumaDivergencia = true;

    console.log(
      `[${ref.nome}] custo calculado no Oracle = R$${custoTotal.toFixed(2)} | referência = R$${ref.esperado.toFixed(2)} | ${bate ? "BATE" : "DIVERGE"} (${linhasComposicao.length} itens de composição)`
    );
  }

  await pool.end();
  if (algumaDivergencia) {
    console.log("\nEixo 1: DIVERGÊNCIA encontrada — migração NÃO validada.");
    process.exit(1);
  }
  console.log("\nEixo 1: todos os 3 valores batem. Migração preservou a matemática do motor de custo.");
}

main().catch((e) => {
  console.error("ERRO FATAL:", e?.message ?? e);
  process.exit(1);
});
