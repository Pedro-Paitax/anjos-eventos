/**
 * Paridade NocoDB x Oracle pelo ENDPOINT REAL do app (HTTP), não só pela lib.
 * SÓ LEITURA nos dois bancos. Divergência de valor é BLOQUEANTE: o script só
 * reporta, nunca ajusta.
 *
 * Como funciona (roda no servidor "ender"):
 *  1. `git archive HEAD` -> diretório próprio (não toca no .next compartilhado
 *     nem em edições não commitadas de outras sessões) + hardlink do
 *     node_modules; `next build` (output standalone) nesse diretório.
 *  2. Sobe duas instâncias standalone em 127.0.0.1: :3101 DATA_SOURCE=nocodb e
 *     :3102 DATA_SOURCE=oracle. As rotas atuais não têm autenticação (não há
 *     middleware/proxy); nada é contornado.
 *  3. GET /api/preparos/{id}/custo pra todos os preparos do Oracle + casos de
 *     borda; e as 3 rotas de /api/orcamentos/{id}/* com um id inexistente
 *     (comportamento de "não encontrado" tem que ser equivalente).
 *     Compara status + corpo JSON campo a campo.
 *  4. Derruba as instâncias que ele mesmo subiu e confere as portas.
 *
 * Uso: npx tsx scripts/paridade-endpoint.ts [--reuse-build]
 * Segredos (DATABASE_URL, NOCODB_API_TOKEN) só são repassados por env aos
 * processos filhos; nunca são impressos.
 */
import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { execSync, spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";

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
// .env antes de .env.local: a URL do Oracle está no .env (ver scripts de ETL).
carregarEnv(".env");
carregarEnv(".env.local");

const IP_ORACLE = "100.121.229.81";
if (!process.env.DATABASE_URL?.includes(IP_ORACLE)) {
  console.error(`ABORTADO: DATABASE_URL não aponta pro Oracle (${IP_ORACLE}).`);
  process.exit(1);
}
if (!process.env.NOCODB_API_TOKEN) {
  console.error("ABORTADO: NOCODB_API_TOKEN ausente.");
  process.exit(1);
}

const RAIZ = process.cwd();
const APP_DIR = resolve(homedir(), ".paridade-endpoint-app");
const PORTA = { nocodb: 3101, oracle: 3102 } as const;
const REUSAR = process.argv.includes("--reuse-build");
const filhos: ChildProcess[] = [];

function sh(cmd: string, cwd: string) {
  execSync(cmd, { cwd, stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
}

function construir() {
  if (REUSAR && existsSync(resolve(APP_DIR, ".next/standalone/server.js"))) {
    console.log("Reusando build existente em", APP_DIR);
    return;
  }
  console.log("Snapshot do git HEAD ->", APP_DIR);
  rmSync(APP_DIR, { recursive: true, force: true });
  mkdirSync(APP_DIR, { recursive: true });
  sh(`git archive HEAD | tar -x -C "${APP_DIR}"`, RAIZ);
  // hardlink (mesmo filesystem): sem copiar 1GB nem symlink (Turbopack rejeita).
  sh(`cp -al "${RAIZ}/node_modules" "${APP_DIR}/node_modules"`, RAIZ);
  console.log("next build (pode levar alguns minutos)...");
  sh("node node_modules/next/dist/bin/next build", APP_DIR);
}

function subir(fonte: "nocodb" | "oracle"): ChildProcess {
  const filho = spawn("node", [".next/standalone/server.js"], {
    cwd: APP_DIR,
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: "production",
      PORT: String(PORTA[fonte]),
      HOSTNAME: "127.0.0.1",
      DATA_SOURCE: fonte,
      DATABASE_URL: process.env.DATABASE_URL,
      NOCODB_API_TOKEN: process.env.NOCODB_API_TOKEN,
    },
  });
  filhos.push(filho);
  return filho;
}

function derrubar() {
  for (const f of filhos) {
    try {
      if (f.pid) process.kill(-f.pid, "SIGTERM");
    } catch {
      /* já encerrado */
    }
  }
}
process.on("exit", derrubar);
for (const s of ["SIGINT", "SIGTERM"] as const) process.on(s, () => { derrubar(); process.exit(130); });

async function aguardar(fonte: "nocodb" | "oracle") {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORTA[fonte]}/api/preparos/0/custo`, { signal: AbortSignal.timeout(3000) });
      if (r.status === 400) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`instância ${fonte} não subiu em 60s`);
}

type Resp = { status: number; corpo: unknown };
let repeticoesTimeout = 0;
async function chamarUmaVez(fonte: "nocodb" | "oracle", caminho: string): Promise<Resp> {
  const r = await fetch(`http://127.0.0.1:${PORTA[fonte]}${caminho}`, { signal: AbortSignal.timeout(60000) });
  const texto = await r.text();
  let corpo: unknown = texto;
  try {
    corpo = JSON.parse(texto);
  } catch {
    /* corpo não-JSON: compara como texto */
  }
  return { status: r.status, corpo };
}

/**
 * O NocoDB estoura o timeout de 5s da lib com preparos de muitos insumos
 * (comportamento conhecido da API sob concorrência — o app devolve 502 com
 * "aborted due to timeout"). Isso é falha de transporte, não valor: repete
 * SÓ esse caso (até 4x) e conta. Qualquer outro status/diferença NÃO é repetido.
 */
async function chamar(fonte: "nocodb" | "oracle", caminho: string): Promise<Resp> {
  let resp = await chamarUmaVez(fonte, caminho);
  for (let t = 0; t < 4 && resp.status === 502 && JSON.stringify(resp.corpo).includes("aborted due to timeout"); t++) {
    repeticoesTimeout++;
    await new Promise((r) => setTimeout(r, 2000));
    resp = await chamarUmaVez(fonte, caminho);
  }
  return resp;
}

/** Diferenças campo a campo (caminho -> valor de cada lado). */
function diferencas(a: unknown, b: unknown, caminho = ""): string[] {
  if (a === b) return [];
  if (typeof a === "object" && a && typeof b === "object" && b) {
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...chaves].flatMap((k) =>
      diferencas((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${caminho}.${k}`)
    );
  }
  return [`${caminho || "(raiz)"}: nocodb=${JSON.stringify(a)} oracle=${JSON.stringify(b)}`];
}

async function comparar(caminho: string): Promise<string[]> {
  const [n, o] = await Promise.all([chamar("nocodb", caminho), chamar("oracle", caminho)]);
  const d: string[] = [];
  if (n.status !== o.status) d.push(`status: nocodb=${n.status} oracle=${o.status}`);
  d.push(...diferencas(n.corpo, o.corpo));
  return d.map((x) => `${caminho} -> ${x}`);
}

async function main() {
  construir();

  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const ids: number[] = (await pool.query("SELECT id FROM preparos ORDER BY id")).rows.map((r) => r.id);
  await pool.end();

  subir("nocodb");
  subir("oracle");
  await Promise.all([aguardar("nocodb"), aguardar("oracle")]);
  console.log(`Instâncias no ar (nocodb :${PORTA.nocodb}, oracle :${PORTA.oracle}). ${ids.length} preparos.`);

  const divergencias: string[] = [];
  let comparados = 0;
  for (const id of ids) {
    divergencias.push(...(await comparar(`/api/preparos/${id}/custo`)));
    comparados++;
  }
  console.log(`[custo] ${comparados} preparos comparados pelo endpoint, ${divergencias.length} divergência(s)`);

  const bordas = ["/api/preparos/999999/custo", "/api/preparos/0/custo", "/api/preparos/abc/custo", "/api/preparos/-1/custo"];
  const orc = ["dimensionamento", "margem-projetada", "simulador"].map((r) => `/api/orcamentos/999999/${r}`);
  const invalidos = ["dimensionamento", "margem-projetada", "simulador"].map((r) => `/api/orcamentos/0/${r}`);
  const divBordas: string[] = [];
  for (const c of [...bordas, ...orc, ...invalidos]) divBordas.push(...(await comparar(c)));
  console.log(`[bordas + orçamento inexistente/inválido] ${bordas.length + orc.length + invalidos.length} casos, ${divBordas.length} divergência(s)`);

  console.log(`(repetições por timeout transitório do NocoDB: ${repeticoesTimeout})`);
  const todas = [...divergencias, ...divBordas];
  if (todas.length) {
    console.log("\n=== DIVERGÊNCIAS (BLOQUEANTES) ===");
    for (const d of todas.slice(0, 40)) console.log("  " + d);
    process.exitCode = 1;
  } else {
    console.log("\nSEM DIVERGÊNCIAS.");
  }
}

main()
  .catch((e) => {
    console.error("ERRO:", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    derrubar();
    await new Promise((r) => setTimeout(r, 1500));
    for (const [fonte, porta] of Object.entries(PORTA)) {
      try {
        await fetch(`http://127.0.0.1:${porta}/api/preparos/0/custo`, { signal: AbortSignal.timeout(1500) });
        console.log(`AVISO: porta ${porta} (${fonte}) ainda responde!`);
      } catch {
        console.log(`porta ${porta} (${fonte}) livre.`);
      }
    }
  });
