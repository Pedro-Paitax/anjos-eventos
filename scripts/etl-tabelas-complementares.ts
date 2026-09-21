/**
 * ETL das 4 tabelas do NocoDB que ficaram fora do primeiro ETL
 * (scripts/etl-nocodb-para-postgres.ts): Hierarquia_Proteina,
 * Configuracoes_Globais, Cardapios_Modelo + Cardapio_Modelo_Itens,
 * Orcamento_Itens_Adicionais. Escopo decidido pelo Pedro em 2026-09-21
 * (docs/CHECKLIST_CORTE_PRODUCAO.md, Fase A). `usuarios` e `contratos` NÃO
 * entram aqui: vêm do Postgres local e são copiados no Dia do Corte (Fase B).
 *
 * NocoDB: SÓ LEITURA. Oracle: só escreve com --write, em tabela VAZIA (se
 * qualquer tabela-alvo já tiver linha, aborta — sem truncate, sem upsert),
 * numa transação única. IDs do NocoDB preservados; sequences resincronizadas
 * depois do commit (setval não é transacional).
 *
 * Validação: Hierarquia_Proteina, Configuracoes_Globais, Cardapios_Modelo e
 * Cardapio_Modelo_Itens são "hard fail" (qualquer valor inesperado bloqueia
 * o --write inteiro). Orcamento_Itens_Adicionais é "soft skip": item cujo
 * Orçamento não existe no Oracle é pulado com aviso, nunca forçado
 * (Orçamentos têm 0 linhas reais no Oracle).
 *
 * Uso:
 *   npx tsx scripts/etl-tabelas-complementares.ts           (dry-run, padrão)
 *   npx tsx scripts/etl-tabelas-complementares.ts --write   (escreve no Oracle)
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
    if (!(chave in process.env)) process.env[chave] = l.slice(igual + 1).trim();
  }
}
// .env ANTES de .env.local de propósito: a DATABASE_URL do Oracle está no
// .env; o .env.local aponta pro Postgres local (dev). O guard abaixo aborta
// se não for o Oracle, qualquer que seja a ordem.
carregarEnv(".env");
carregarEnv(".env.local");

const IP_ORACLE_ESPERADO = "100.121.229.81";
if (!process.env.DATABASE_URL?.includes(IP_ORACLE_ESPERADO)) {
  console.error(`ABORTADO: DATABASE_URL não aponta pro Oracle Cloud (${IP_ORACLE_ESPERADO}).`);
  process.exit(1);
}

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { preparos, subcategoriaProteinaEnum } from "../src/db/schema/preparos";
import { orcamentos } from "../src/db/schema/orcamentos";
import {
  hierarquiaProteina,
  configuracoesGlobais,
  cardapiosModelo,
  cardapioModeloItens,
  orcamentoItensAdicionais,
  origemDadoEnum,
} from "../src/db/schema/catalogo-complementar";

const ESCREVER = process.argv.includes("--write");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const NOCODB_BASE_URL = "http://100.77.218.36:8090/api/v2";
const TABELAS = {
  HierarquiaProteina: "mmzb31uy5dbo7g7",
  ConfiguracoesGlobais: "mizfsy3ecpoj50i",
  CardapiosModelo: "muwzzmniceu6umv",
  CardapioModeloItens: "mv4p70wqf1iihe8",
  OrcamentoItensAdicionais: "m8hw626eihfsnzs",
} as const;

async function buscarTodos<T>(tabelaId: string, token: string): Promise<T[]> {
  const todos: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const resposta = await fetch(`${NOCODB_BASE_URL}/tables/${tabelaId}/records?limit=100&offset=${offset}`, {
      headers: { "xc-token": token },
      signal: AbortSignal.timeout(15000),
    });
    if (!resposta.ok) throw new Error(`NocoDB respondeu ${resposta.status} em ${tabelaId}`);
    const pagina = (await resposta.json()) as { list: T[]; pageInfo: { isLastPage: boolean } };
    todos.push(...pagina.list);
    if (pagina.pageInfo.isLastPage) break;
  }
  return todos;
}

type Link = { Id: number } | null | undefined;
type HierarquiaBruta = { Id: number; Subcategoria: string | null; Peso_Padrao: number | null; Origem_Dado: string | null };
type ConfigBruta = { Id: number; Tolerancia_Troca_Preco_Fixo: number | null };
type CardapioBruto = { Id: number; Nome: string | null; Descricao: string | null; Preco_Fixo_Por_Pessoa: number | null };
type CardapioItemBruto = { Id: number; Cardapio_Modelo?: Link; Cardapios_Modelo_id?: number | null; Preparo?: Link; Preparos_id?: number | null };
type AdicionalBruto = { Id: number; Descricao: string | null; Valor: number | null; Orcamento?: Link; Orcamentos_id?: number | null };

type Problema = { tabela: string; registroId: number | string; motivo: string };
const erros: Problema[] = [];
const avisos: Problema[] = [];

/** numeric(_, 2): só aceita valor que cabe em 2 casas sem perda — nunca arredondar em silêncio. */
function cabeEm2Casas(v: number): boolean {
  return Number(v.toFixed(2)) === v;
}

async function main() {
  console.log(ESCREVER ? "MODO: escrita real (--write)" : "MODO: dry-run (nenhuma escrita)");
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) throw new Error("NOCODB_API_TOKEN não configurado.");

  const [hierBrutos, configBrutas, cardBrutos, itensBrutos, adicBrutos] = await Promise.all([
    buscarTodos<HierarquiaBruta>(TABELAS.HierarquiaProteina, token),
    buscarTodos<ConfigBruta>(TABELAS.ConfiguracoesGlobais, token),
    buscarTodos<CardapioBruto>(TABELAS.CardapiosModelo, token),
    buscarTodos<CardapioItemBruto>(TABELAS.CardapioModeloItens, token),
    buscarTodos<AdicionalBruto>(TABELAS.OrcamentoItensAdicionais, token),
  ]);

  // --- Estado do Oracle: tabelas-alvo precisam estar vazias; FKs precisam existir ---
  const contagens: Record<string, number> = {};
  for (const [nome, tabela] of Object.entries({
    hierarquia_proteina: hierarquiaProteina,
    configuracoes_globais: configuracoesGlobais,
    cardapios_modelo: cardapiosModelo,
    cardapio_modelo_itens: cardapioModeloItens,
    orcamento_itens_adicionais: orcamentoItensAdicionais,
  })) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tabela);
    contagens[nome] = n;
  }
  const naoVazias = Object.entries(contagens).filter(([, n]) => n > 0);
  const preparoIdsOracle = new Set((await db.select({ id: preparos.id }).from(preparos)).map((p) => p.id));
  const orcamentoIdsOracle = new Set((await db.select({ id: orcamentos.id }).from(orcamentos)).map((o) => o.id));

  // --- Hierarquia_Proteina (hard fail) ---
  const subcategoriasValidas = new Set<string>(subcategoriaProteinaEnum.enumValues);
  const origensValidas = new Set<string>(origemDadoEnum.enumValues);
  const hierLinhas: (typeof hierarquiaProteina.$inferInsert)[] = [];
  for (const r of hierBrutos) {
    if (!r.Subcategoria || !subcategoriasValidas.has(r.Subcategoria)) {
      erros.push({ tabela: "Hierarquia_Proteina", registroId: r.Id, motivo: `Subcategoria inesperada: ${JSON.stringify(r.Subcategoria)}` });
      continue;
    }
    if (!r.Origem_Dado || !origensValidas.has(r.Origem_Dado)) {
      erros.push({ tabela: "Hierarquia_Proteina", registroId: r.Id, motivo: `Origem_Dado inesperada: ${JSON.stringify(r.Origem_Dado)}` });
      continue;
    }
    if (r.Peso_Padrao == null || !cabeEm2Casas(r.Peso_Padrao)) {
      erros.push({ tabela: "Hierarquia_Proteina", registroId: r.Id, motivo: `Peso_Padrao inválido ou com mais de 2 casas: ${r.Peso_Padrao}` });
      continue;
    }
    hierLinhas.push({
      id: r.Id,
      subcategoria: r.Subcategoria as (typeof hierLinhas)[number]["subcategoria"],
      pesoPadrao: String(r.Peso_Padrao),
      origemDado: r.Origem_Dado as (typeof hierLinhas)[number]["origemDado"],
    });
  }

  // --- Configuracoes_Globais (hard fail) ---
  const configLinhas: (typeof configuracoesGlobais.$inferInsert)[] = [];
  for (const r of configBrutas) {
    if (r.Tolerancia_Troca_Preco_Fixo == null || !cabeEm2Casas(r.Tolerancia_Troca_Preco_Fixo)) {
      erros.push({ tabela: "Configuracoes_Globais", registroId: r.Id, motivo: `Tolerancia_Troca_Preco_Fixo inválida: ${r.Tolerancia_Troca_Preco_Fixo}` });
      continue;
    }
    configLinhas.push({ id: r.Id, toleranciaTrocaPrecoFixo: String(r.Tolerancia_Troca_Preco_Fixo) });
  }

  // --- Cardapios_Modelo (hard fail) ---
  const cardLinhas: (typeof cardapiosModelo.$inferInsert)[] = [];
  for (const r of cardBrutos) {
    if (!r.Nome?.trim()) {
      erros.push({ tabela: "Cardapios_Modelo", registroId: r.Id, motivo: "Nome vazio" });
      continue;
    }
    if (r.Preco_Fixo_Por_Pessoa != null && !cabeEm2Casas(r.Preco_Fixo_Por_Pessoa)) {
      erros.push({ tabela: "Cardapios_Modelo", registroId: r.Id, motivo: `Preco_Fixo_Por_Pessoa com mais de 2 casas: ${r.Preco_Fixo_Por_Pessoa}` });
      continue;
    }
    cardLinhas.push({
      id: r.Id,
      nome: r.Nome,
      descricao: r.Descricao,
      precoFixoPorPessoa: r.Preco_Fixo_Por_Pessoa == null ? null : String(r.Preco_Fixo_Por_Pessoa),
    });
  }
  const cardIds = new Set(cardLinhas.map((c) => c.id));

  // --- Cardapio_Modelo_Itens (hard fail) ---
  const itensLinhas: (typeof cardapioModeloItens.$inferInsert)[] = [];
  for (const r of itensBrutos) {
    const cardapioId = r.Cardapio_Modelo?.Id ?? r.Cardapios_Modelo_id ?? null;
    const preparoId = r.Preparo?.Id ?? r.Preparos_id ?? null;
    if (cardapioId == null || !cardIds.has(cardapioId)) {
      erros.push({ tabela: "Cardapio_Modelo_Itens", registroId: r.Id, motivo: `Cardápio pai ausente/inexistente: ${cardapioId}` });
      continue;
    }
    if (preparoId == null || !preparoIdsOracle.has(preparoId)) {
      erros.push({ tabela: "Cardapio_Modelo_Itens", registroId: r.Id, motivo: `Preparo inexistente no Oracle: ${preparoId}` });
      continue;
    }
    itensLinhas.push({ id: r.Id, cardapioModeloId: cardapioId, preparoId });
  }

  // --- Orcamento_Itens_Adicionais (soft skip) ---
  const adicLinhas: (typeof orcamentoItensAdicionais.$inferInsert)[] = [];
  for (const r of adicBrutos) {
    const orcamentoId = r.Orcamento?.Id ?? r.Orcamentos_id ?? null;
    if (orcamentoId == null || !orcamentoIdsOracle.has(orcamentoId)) {
      avisos.push({ tabela: "Orcamento_Itens_Adicionais", registroId: r.Id, motivo: `pulado: Orçamento ${orcamentoId} não existe no Oracle` });
      continue;
    }
    if (!r.Descricao?.trim() || r.Valor == null || !cabeEm2Casas(r.Valor)) {
      avisos.push({ tabela: "Orcamento_Itens_Adicionais", registroId: r.Id, motivo: "pulado: Descricao/Valor incompletos" });
      continue;
    }
    adicLinhas.push({ id: r.Id, descricao: r.Descricao, valor: String(r.Valor), orcamentoId });
  }

  console.log("\n=== CONTAGENS (a inserir / lidas do NocoDB) ===");
  console.log("Hierarquia_Proteina:", hierLinhas.length, "/", hierBrutos.length);
  console.log("Configuracoes_Globais:", configLinhas.length, "/", configBrutas.length);
  console.log("Cardapios_Modelo:", cardLinhas.length, "/", cardBrutos.length);
  console.log("Cardapio_Modelo_Itens:", itensLinhas.length, "/", itensBrutos.length);
  console.log("Orcamento_Itens_Adicionais:", adicLinhas.length, "/", adicBrutos.length, "(soft skip)");
  console.log("\n=== ESTADO ATUAL DO ORACLE (linhas nas tabelas-alvo) ===");
  console.log(contagens);
  console.log(`Preparos no Oracle: ${preparoIdsOracle.size} | Orcamentos no Oracle: ${orcamentoIdsOracle.size}`);

  if (avisos.length) {
    console.log("\n=== AVISOS (pulados, não bloqueiam) ===");
    for (const a of avisos) console.log(`  [${a.tabela} #${a.registroId}] ${a.motivo}`);
  }
  if (erros.length) {
    console.log("\n=== ERROS (bloqueiam --write) ===");
    for (const e of erros) console.log(`  [${e.tabela} #${e.registroId}] ${e.motivo}`);
  }
  if (naoVazias.length) {
    console.log("\n=== BLOQUEIO: tabelas-alvo NÃO estão vazias (carga só em tabela vazia) ===");
    for (const [n, q] of naoVazias) console.log(`  ${n}: ${q} linha(s)`);
  }

  console.log("\n=== AMOSTRA — Hierarquia_Proteina (todas) ===");
  console.log(JSON.stringify(hierLinhas));
  console.log("=== AMOSTRA — Configuracoes_Globais ===");
  console.log(JSON.stringify(configLinhas));
  console.log("=== AMOSTRA — Cardapios_Modelo (todos) ===");
  console.log(JSON.stringify(cardLinhas));

  if (!ESCREVER) {
    console.log("\nDry-run — nenhuma escrita realizada. Rode com --write para aplicar.");
    await pool.end();
    return;
  }
  if (erros.length || naoVazias.length) {
    console.log("\nABORTADO: erros ou tabela-alvo não vazia. Nada foi escrito.");
    await pool.end();
    process.exitCode = 1;
    return;
  }

  console.log("\nIniciando escrita em transação única...");
  await db.transaction(async (tx) => {
    if (hierLinhas.length) await tx.insert(hierarquiaProteina).values(hierLinhas);
    if (configLinhas.length) await tx.insert(configuracoesGlobais).values(configLinhas);
    if (cardLinhas.length) await tx.insert(cardapiosModelo).values(cardLinhas);
    if (itensLinhas.length) await tx.insert(cardapioModeloItens).values(itensLinhas);
    if (adicLinhas.length) await tx.insert(orcamentoItensAdicionais).values(adicLinhas);
  });
  console.log("Transação commitada.");

  for (const t of ["hierarquia_proteina", "configuracoes_globais", "cardapios_modelo", "cardapio_modelo_itens", "orcamento_itens_adicionais"]) {
    // Tabela vazia: mantém a sequence em 1 "não usada", pro próximo id ser 1.
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), (SELECT MAX(id) FROM ${t}) IS NOT NULL)`
    );
  }
  console.log("Sequences resincronizadas.");
  await pool.end();
}

main().catch((e) => {
  console.error("ERRO FATAL:", e?.cause?.message ?? e?.message ?? e);
  process.exit(1);
});
