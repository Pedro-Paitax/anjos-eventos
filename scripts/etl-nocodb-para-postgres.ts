/**
 * ETL: NocoDB (produção, só leitura via API REST) → Postgres novo
 * (Oracle Cloud, via Drizzle) — docs/plano-migracao-postgres-vultr.md,
 * Passo 3.
 *
 * Desenho aprovado pelo Pedro em 2026-09-17 antes deste script ser
 * escrito (ver docs/PENDENCIAS_NOTURNAS.md). Resumo das decisões:
 *
 * - Ordem: Insumos/Macro_Categorias → Headers_UI/Preparos → Composição/
 *   header_preparo → (mapa fixo de Empresa) → Orcamentos →
 *   Itens_Orcamento → Itens_Evento_Confirmados.
 * - IDs do NocoDB preservados via INSERT explícito de `id` (serial
 *   aceita valor explícito); sequences resincronizadas com `setval`
 *   DEPOIS do commit (setval não é transacional — rodar antes do
 *   commit deixaria a sequence "adiantada" mesmo em caso de rollback).
 * - Transação única para todo o lote (não checkpoint por tabela) —
 *   volume pequeno, estado parcialmente migrado seria pior que refazer
 *   do zero.
 * - Orcamentos/Itens_Orcamento/Itens_Evento_Confirmados: dado real no
 *   NocoDB hoje é praticamente vazio/placeholder (confirmado ao vivo
 *   em 2026-09-17 — 1 Orçamento com Status/Empresa/Cliente_Nome
 *   nulos ou "Cliente_Nome" literal, 0 Itens_Orcamento, 1
 *   Itens_Eventos_Confirmado totalmente vazio, 0 Eventos reais). Por
 *   isso essas 3 tabelas usam validação "soft skip" (linha incompleta
 *   é pulada com aviso, não trava o restante) — diferente de
 *   Preparos/Insumos/Composição/Macro_Categorias/Headers_UI, onde
 *   qualquer valor inesperado é "hard fail" (bloqueia TODO o --write,
 *   nada é inserido pela metade).
 * - Eixo 2 do plano de migração (Teste de Snapshot Transacional) fica
 *   ADIADO — não há dado real suficiente. Não simulado com dado
 *   fictício.
 *
 * Uso:
 *   npx tsx scripts/etl-nocodb-para-postgres.ts             (dry-run, padrão)
 *   npx tsx scripts/etl-nocodb-para-postgres.ts --write     (escreve de fato no Oracle)
 *
 * Em dry-run: busca e valida TUDO, nunca insere nada, imprime um
 * relatório de contagens/avisos/erros e uma amostra de 3-5 registros
 * transformados de Preparos e Insumos.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- Carregamento de env sem dependência nova (mesmo padrão já usado
// nos scripts de verificação desta sessão) ---
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
// Ordem INVERTIDA da convenção do Next.js de propósito: .env é onde a
// DATABASE_URL do Oracle Cloud está guardada (ver docs/PENDENCIAS_NOTURNAS.md,
// 2026-09-15) — precisa vencer aqui. .env.local aponta pro Postgres
// LOCAL antigo (localhost:5433), usado pelo app em dev; se ele
// ganhasse a prioridade padrão, este script escreveria no banco
// errado sem erro nenhum (localhost:5433 também tem uma tabela
// `empresas` real, então o engano passaria despercebido). A checagem
// abaixo é o cinto-e-suspensório: aborta se DATABASE_URL não apontar
// pro IP conhecido do Oracle, não importa a ordem de carregamento.
carregarEnv(".env");
carregarEnv(".env.local");

const IP_ORACLE_ESPERADO = "100.121.229.81";
if (!process.env.DATABASE_URL?.includes(IP_ORACLE_ESPERADO)) {
  console.error(
    `ABORTADO: DATABASE_URL não aponta pro Oracle Cloud (${IP_ORACLE_ESPERADO}). ` +
      `Valor resolvido: ${process.env.DATABASE_URL ?? "(vazio)"}. ` +
      `Isso normalmente significa que .env.local sobrescreveu .env — confira antes de rodar de novo.`
  );
  process.exit(1);
}

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { insumos } from "../src/db/schema/insumos";
import { preparos } from "../src/db/schema/preparos";
import { composicao } from "../src/db/schema/composicao";
import { macroCategorias, headersUi, headerPreparo } from "../src/db/schema/cardapio-referencia";
import { orcamentos, itensOrcamento, itensEventoConfirmados } from "../src/db/schema/orcamentos";

const ESCREVER = process.argv.includes("--write");

// `src/lib/nocodb.ts` e `src/db/client.ts` importam "server-only", que
// lança sempre que o módulo roda fora do bundler do Next (não é um
// guard condicional — só o webpack/turbopack do Next substitui esse
// módulo por um no-op nos bundles de servidor). Rodando este script
// via `tsx` puro, não dá pra reaproveitá-los — cliente e fetch próprios
// abaixo, minimalistas, mesma forma de conexão.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function exigirTokenNocoDB(): string {
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) throw new Error("NOCODB_API_TOKEN não configurado.");
  return token;
}

const NOCODB_BASE_URL = "http://100.77.218.36:8090/api/v2";

async function nocodbGet<T>(caminho: string, token: string): Promise<T | null> {
  const resposta = await fetch(`${NOCODB_BASE_URL}${caminho}`, {
    headers: { "xc-token": token },
    signal: AbortSignal.timeout(10000),
  });
  if (resposta.status === 404) return null;
  if (!resposta.ok) {
    throw new Error(`NocoDB respondeu ${resposta.status} em ${caminho}: ${await resposta.text()}`);
  }
  return (await resposta.json()) as T;
}

// IDs de tabela do NocoDB — conferidos ao vivo nesta sessão e em
// docs/BANCO.md, não inventados.
const TABELAS = {
  Insumos: "m2ll6qtupa1q1il",
  Preparos: "m3yr136ykw6ju2w",
  Composicao: "mj1muse0q0pjli8",
  MacroCategorias: "me1h77whhyj9ghj",
  HeadersUI: "m1wg9dhlf23jby6",
  Orcamentos: "mpobqls8ibt3ay3",
  ItensOrcamento: "m4tc69znld4pmxa",
  ItensEventosConfirmado: "mw4uoldmjxp7bbe",
} as const;

/** Pagina a listagem padrão da API do NocoDB até acabar (limit/offset). */
async function buscarTodosRegistros<T>(tabelaId: string, token: string): Promise<T[]> {
  const pageSize = 100;
  let offset = 0;
  const todos: T[] = [];
  for (;;) {
    const pagina = await nocodbGet<{ list: T[]; pageInfo: { isLastPage: boolean } }>(
      `/tables/${tabelaId}/records?limit=${pageSize}&offset=${offset}`,
      token
    );
    if (!pagina) break;
    todos.push(...pagina.list);
    if (pagina.pageInfo.isLastPage) break;
    offset += pageSize;
  }
  return todos;
}

type Problema = { tabela: string; registroId: number | string; motivo: string };

// ---------------------------------------------------------------
// Formato cru dos registros do NocoDB — só os campos que este script
// realmente lê (a API devolve bem mais coisa, ver explorações desta
// sessão). Tipagem mínima pra não usar `any`, não uma modelagem
// completa da API do NocoDB.
// ---------------------------------------------------------------
type LinkUnico = { Id: number } | null;

type InsumoBruto = {
  Id: number;
  Nome: string;
  UDM: string;
  "Custo Médio": number | null;
  "Rendimento (%)": number | null;
};

type PreparoBruto = {
  Id: number;
  "Nome Do Preparo": string;
  Categoria: string;
  Rendimento: number;
  "UOM Rendimento": string;
  "Requisitos de Logística": string | null;
  "Restrições": string | null;
  "Modo de Preparo": string;
  Minutes: number | null;
  Peso_Atratividade: number | null;
  Subcategoria_Proteina: string | null;
  Porcao_Maxima_Individual: number | null;
  Peso_Medio_Unidade_G: number | null;
  _nc_m2m_Preparos_Headers_UIs?: { Headers_UI_id: number }[];
};

type ComposicaoBruta = { Id: number; Quantidade: number; Insumo: LinkUnico; Preparo: LinkUnico };

type MacroCategoriaBruta = { Id: number; Nome_Macro: string; Capacidade_Categoria: number; UOM: string };

type HeaderUiBruto = { Id: number; Nome_Exibicao: string; Macro_Economias: LinkUnico };

type OrcamentoBruto = {
  Id: number;
  Status: string | null;
  Num_Convidados: number | null;
  Empresa: { Title: string } | null;
  Cliente_Nome: string | null;
  Desconto_Tipo: string | null;
  Desconto_Valor: number | null;
  Usar_Preco_Fixo_Modelo: boolean | null;
};

type ItemOrcamentoBruto = { Id: number; Orcamento: LinkUnico; Preparo: LinkUnico };

type ItemEventoConfirmadoBruto = {
  Id: number;
  Evento: LinkUnico | LinkUnico[];
  Preparo: LinkUnico | LinkUnico[];
  Quantidade_Confirmada: number | null;
  Custo_Unitario_Snapshot: number | null;
};

// ---------------------------------------------------------------
// Transformações — cada função recebe o registro cru do NocoDB e
// devolve a linha pronta pro schema novo, ou lança com o motivo (pra
// tabelas "hard fail") / é filtrada fora antes de chamar (tabelas
// "soft skip", tratadas no fluxo principal).
// ---------------------------------------------------------------

const CATEGORIAS_VALIDAS = new Set([
  "Bebidas",
  "Carnes",
  "Entrada",
  "Guarnições",
  "Massas",
  "Molhos",
  "Saladas",
  "Sobremesa",
]);
const UNIDADES_RENDIMENTO_VALIDAS = new Set(["G", "ML", "Unidade"]);
const UNIDADES_INSUMO_VALIDAS = new Set(["KG", "Litro", "Unidade", "Maço"]);
const SUBCATEGORIAS_VALIDAS = new Set(["Carne Vermelha", "Ovino", "Suíno", "Peixe", "Aves"]);
const RESTRICOES_VALIDAS = new Set(["Vegano", "Vegetariano", "Sem Gluten", "Sem Lactose"]);

function transformarInsumo(r: InsumoBruto): typeof insumos.$inferInsert {
  if (!UNIDADES_INSUMO_VALIDAS.has(r.UDM)) {
    throw new Error(`Unidade (UDM) desconhecida: "${r.UDM}"`);
  }
  return {
    id: r.Id,
    nome: r.Nome,
    unidade: r.UDM as "KG" | "Litro" | "Unidade" | "Maço",
    preco: r["Custo Médio"] == null ? null : String(r["Custo Médio"]),
    fatorCorrecao: r["Rendimento (%)"] == null ? null : String(r["Rendimento (%)"]),
  };
}

function transformarPreparo(r: PreparoBruto): typeof preparos.$inferInsert {
  // Campos NOT NULL no schema novo (docs/schema-fisico-detalhado.md) —
  // validados explicitamente aqui em vez de confiar que o dado real
  // sempre bate com o documento (achado real: Preparo "Costela", Id 32,
  // tem Modo de Preparo vazio no NocoDB — sem esta checagem, isso só
  // apareceria como erro de constraint do Postgres NO MEIO da
  // transação de escrita, não no relatório de validação do dry-run).
  if (!r["Nome Do Preparo"]) throw new Error("Nome Do Preparo vazio");
  if (r.Rendimento == null) throw new Error("Rendimento vazio");
  if (!r["Modo de Preparo"]) throw new Error("Modo de Preparo vazio");
  if (!CATEGORIAS_VALIDAS.has(r.Categoria)) {
    throw new Error(`Categoria desconhecida: "${r.Categoria}"`);
  }
  const unidadeRendimento = r["UOM Rendimento"];
  if (!UNIDADES_RENDIMENTO_VALIDAS.has(unidadeRendimento)) {
    throw new Error(`UOM Rendimento desconhecida/inesperada: "${unidadeRendimento}" (só G/ML/Unidade têm uso real hoje)`);
  }
  if (r.Subcategoria_Proteina != null && !SUBCATEGORIAS_VALIDAS.has(r.Subcategoria_Proteina)) {
    throw new Error(`Subcategoria_Proteina desconhecida: "${r.Subcategoria_Proteina}"`);
  }
  const tagsBrutas = (r["Restrições"] as string | null)
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tagsBrutas) {
    for (const t of tagsBrutas) {
      if (!RESTRICOES_VALIDAS.has(t)) throw new Error(`Restrição desconhecida: "${t}"`);
    }
  }
  const tags = tagsBrutas as ("Vegano" | "Vegetariano" | "Sem Gluten" | "Sem Lactose")[] | undefined;
  return {
    id: r.Id,
    nomePreparo: r["Nome Do Preparo"],
    categoria: r.Categoria as
      | "Bebidas"
      | "Carnes"
      | "Entrada"
      | "Guarnições"
      | "Massas"
      | "Molhos"
      | "Saladas"
      | "Sobremesa",
    rendimento: String(r.Rendimento),
    unidadeRendimento: unidadeRendimento as "G" | "ML" | "Unidade",
    // Substitui "Requisitos de Logística" (multi-select) por texto
    // livre, como texto corrido — decisão registrada no desenho
    // aprovado (docs/PENDENCIAS_NOTURNAS.md, 2026-09-17).
    apresentacaoUtensilio: r["Requisitos de Logística"] ?? null,
    tags: tags && tags.length > 0 ? tags : null,
    modoPreparo: r["Modo de Preparo"],
    tempoPreparoMinutos: r.Minutes ?? null,
    pesoAtratividade: r.Peso_Atratividade == null ? null : String(r.Peso_Atratividade),
    subcategoriaProteina: r.Subcategoria_Proteina as
      | "Carne Vermelha"
      | "Ovino"
      | "Suíno"
      | "Peixe"
      | "Aves"
      | null,
    porcaoMaximaIndividual: r.Porcao_Maxima_Individual == null ? null : String(r.Porcao_Maxima_Individual),
    pesoMedioUnidadeG: r.Peso_Medio_Unidade_G == null ? null : String(r.Peso_Medio_Unidade_G),
  };
}

function transformarComposicao(r: ComposicaoBruta): typeof composicao.$inferInsert {
  if (!r.Insumo?.Id) throw new Error("Sem Insumo vinculado");
  if (!r.Preparo?.Id) throw new Error("Sem Preparo vinculado");
  return {
    id: r.Id,
    quantidade: String(r.Quantidade),
    insumoId: r.Insumo.Id,
    preparoId: r.Preparo.Id,
  };
}

function transformarMacroCategoria(r: MacroCategoriaBruta): typeof macroCategorias.$inferInsert {
  if (r.UOM !== "g" && r.UOM !== "ml") throw new Error(`UOM inesperada: "${r.UOM}"`);
  return {
    id: r.Id,
    nomeMacro: r.Nome_Macro,
    capacidadeTeto: String(r.Capacidade_Categoria),
    unidade: r.UOM,
  };
}

function transformarHeaderUi(r: HeaderUiBruto): typeof headersUi.$inferInsert {
  const macroId = r.Macro_Economias?.Id;
  if (!macroId) throw new Error("Sem Macro_Categoria vinculada");
  return {
    id: r.Id,
    nomeExibicao: r.Nome_Exibicao,
    macroCategoriaId: macroId,
  };
}

/** Extrai os pares (Header_UI, Preparo) via o array m2m real, não via o campo de conveniência singular — ver desenho aprovado. */
function extrairHeaderPreparo(preparoBruto: PreparoBruto): (typeof headerPreparo.$inferInsert)[] {
  const links = preparoBruto._nc_m2m_Preparos_Headers_UIs as { Headers_UI_id: number }[] | undefined;
  if (!links || links.length === 0) return [];
  return links.map((l) => ({ headerUiId: l.Headers_UI_id, preparoId: preparoBruto.Id }));
}

// Mapa fixo Empresa NocoDB -> nome real na tabela nativa `empresas` —
// confirmado com o Pedro em 2026-09-17 (2 dos 3 nomes não batem por
// string exata entre os dois sistemas).
const MAPA_NOME_EMPRESA: Record<string, string> = {
  "Senhor Churrasco": "Buffet Senhor Churrasco",
  "Anjos Cerimonial": "Anjos Cerimonial",
  "Em Plena Natureza": "Em Plena Natureza Chácara de Eventos",
};

/**
 * Lê o NocoDB (só leitura), transforma e valida. NÃO escreve nada. Reusado pelo
 * modo padrão (main, abaixo) e pelo orquestrador do Dia do Corte
 * (scripts/etl-corte-producao.ts, modo truncate+reload).
 */
export async function preparar() {
  const token = exigirTokenNocoDB();

  // --- Fase A: Insumos, Macro_Categorias ---
  const insumosBrutos = await buscarTodosRegistros<InsumoBruto>(TABELAS.Insumos, token);
  const macrosBrutas = await buscarTodosRegistros<MacroCategoriaBruta>(TABELAS.MacroCategorias, token);

  // --- Fase B: Headers_UI, Preparos ---
  const headersBrutos = await buscarTodosRegistros<HeaderUiBruto>(TABELAS.HeadersUI, token);
  const preparosBrutos = await buscarTodosRegistros<PreparoBruto>(TABELAS.Preparos, token);

  // --- Fase C: Composição, header_preparo ---
  const composicaoBruta = await buscarTodosRegistros<ComposicaoBruta>(TABELAS.Composicao, token);

  // --- Orcamentos / Itens_Orcamento / Itens_Evento_Confirmados ---
  const orcamentosBrutos = await buscarTodosRegistros<OrcamentoBruto>(TABELAS.Orcamentos, token);
  const itensOrcamentoBrutos = await buscarTodosRegistros<ItemOrcamentoBruto>(TABELAS.ItensOrcamento, token);
  const itensEventoBrutos = await buscarTodosRegistros<ItemEventoConfirmadoBruto>(
    TABELAS.ItensEventosConfirmado,
    token
  );

  const erros: Problema[] = [];
  const avisos: Problema[] = [];

  function transformarComColeta<Bruto extends { Id: number }, T>(
    tabela: string,
    brutos: Bruto[],
    fn: (r: Bruto) => T
  ): T[] {
    const ok: T[] = [];
    for (const r of brutos) {
      try {
        ok.push(fn(r));
      } catch (e) {
        erros.push({ tabela, registroId: r.Id, motivo: (e as Error).message });
      }
    }
    return ok;
  }

  const insumosLinhas = transformarComColeta("Insumos", insumosBrutos, transformarInsumo);
  const macrosLinhas = transformarComColeta("Macro_Categorias", macrosBrutas, transformarMacroCategoria);
  const headersLinhas = transformarComColeta("Headers_UI", headersBrutos, transformarHeaderUi);
  const preparosLinhas = transformarComColeta("Preparos", preparosBrutos, transformarPreparo);
  const composicaoLinhas = transformarComColeta("Composicao", composicaoBruta, transformarComposicao);
  const headerPreparoLinhas = preparosBrutos.flatMap(extrairHeaderPreparo);

  // --- Orcamentos: soft skip (dado real hoje é placeholder/vazio) ---
  const orcamentosLinhas: (typeof orcamentos.$inferInsert)[] = [];
  const nativeEmpresas = await pool.query<{ id: number; nome: string }>("SELECT id, nome FROM empresas");
  const empresaIdPorNome = new Map(nativeEmpresas.rows.map((e) => [e.nome, e.id]));

  for (const r of orcamentosBrutos) {
    if (r.Status == null || r.Num_Convidados == null || !r.Empresa?.Title || r.Cliente_Nome === "Cliente_Nome") {
      avisos.push({
        tabela: "Orcamentos",
        registroId: r.Id,
        motivo: "Registro incompleto/placeholder (Status, Num_Convidados, Empresa ou Cliente_Nome ausente/genérico) — pulado, não é dado real migrável.",
      });
      continue;
    }
    const nomeNativo = MAPA_NOME_EMPRESA[r.Empresa.Title];
    const empresaId = nomeNativo ? empresaIdPorNome.get(nomeNativo) : undefined;
    if (!empresaId) {
      erros.push({
        tabela: "Orcamentos",
        registroId: r.Id,
        motivo: `Empresa "${r.Empresa.Title}" não tem mapeamento pra tabela nativa — mapa fixo desatualizado.`,
      });
      continue;
    }
    orcamentosLinhas.push({
      id: r.Id,
      eventoId: null, // nenhum Evento real vinculado hoje, ver docs/PENDENCIAS_NOTURNAS.md
      empresaId,
      clienteNome: r.Cliente_Nome,
      numConvidados: r.Num_Convidados,
      status: r.Status as "Simulação" | "Enviado" | "Aceito" | "Recusado",
      descontoTipo: r.Desconto_Tipo as "Percentual" | "Valor Fixo" | "Nenhum" | null,
      descontoValor: r.Desconto_Valor == null ? null : String(r.Desconto_Valor),
      usarPrecoFixoModelo: Boolean(r.Usar_Preco_Fixo_Modelo),
    });
  }

  // --- Itens_Orcamento: soft skip ---
  const itensOrcamentoLinhas: (typeof itensOrcamento.$inferInsert)[] = [];
  for (const r of itensOrcamentoBrutos) {
    if (!r.Orcamento?.Id || !r.Preparo?.Id) {
      avisos.push({ tabela: "Itens_Orcamento", registroId: r.Id, motivo: "Sem Orcamento ou Preparo vinculado — pulado." });
      continue;
    }
    itensOrcamentoLinhas.push({ id: r.Id, orcamentoId: r.Orcamento.Id, preparoId: r.Preparo.Id });
  }

  // --- Itens_Evento_Confirmados (Fase G): soft skip ---
  const itensEventoLinhas: (typeof itensEventoConfirmados.$inferInsert)[] = [];
  for (const r of itensEventoBrutos) {
    const evento = Array.isArray(r.Evento) ? r.Evento[0] : r.Evento;
    const preparo = Array.isArray(r.Preparo) ? r.Preparo[0] : r.Preparo;
    if (!evento?.Id || !preparo?.Id || r.Quantidade_Confirmada == null || r.Custo_Unitario_Snapshot == null) {
      avisos.push({
        tabela: "Itens_Evento_Confirmados",
        registroId: r.Id,
        motivo: "Registro incompleto (sem Evento/Preparo/Quantidade/Custo) — pulado, não é dado real migrável.",
      });
      continue;
    }
    // Nenhum Evento nativo existe hoje (tabela eventos vazia) — esta
    // branch fica sem cobertura real até haver Evento de verdade.
    erros.push({
      tabela: "Itens_Evento_Confirmados",
      registroId: r.Id,
      motivo: "Mapeamento Evento NocoDB -> eventos nativo ainda não implementado (nenhum Evento real existe em nenhum dos dois lados hoje).",
    });
  }

  // --- Relatório ---
  console.log("\n=== CONTAGENS ===");
  console.log("Insumos:", insumosLinhas.length, "/", insumosBrutos.length);
  console.log("Macro_Categorias:", macrosLinhas.length, "/", macrosBrutas.length);
  console.log("Headers_UI:", headersLinhas.length, "/", headersBrutos.length);
  console.log("Preparos:", preparosLinhas.length, "/", preparosBrutos.length);
  console.log("Composicao:", composicaoLinhas.length, "/", composicaoBruta.length);
  console.log("header_preparo (derivado):", headerPreparoLinhas.length);
  console.log("Orcamentos:", orcamentosLinhas.length, "/", orcamentosBrutos.length, "(soft skip)");
  console.log("Itens_Orcamento:", itensOrcamentoLinhas.length, "/", itensOrcamentoBrutos.length, "(soft skip)");
  console.log("Itens_Evento_Confirmados:", itensEventoLinhas.length, "/", itensEventoBrutos.length, "(soft skip)");

  if (avisos.length > 0) {
    console.log("\n=== AVISOS (registros pulados, não bloqueiam) ===");
    for (const a of avisos) console.log(`  [${a.tabela} #${a.registroId}] ${a.motivo}`);
  }
  if (erros.length > 0) {
    console.log("\n=== ERROS (bloqueiam --write) ===");
    for (const e of erros) console.log(`  [${e.tabela} #${e.registroId}] ${e.motivo}`);
  }

  console.log("\n=== AMOSTRA — 3 Preparos transformados ===");
  console.log(JSON.stringify(preparosLinhas.slice(0, 3), null, 2));
  console.log("\n=== AMOSTRA — 5 Insumos transformados ===");
  console.log(JSON.stringify(insumosLinhas.slice(0, 5), null, 2));

  const tabelas = [
    "insumos",
    "macro_categorias",
    "headers_ui",
    "preparos",
    "composicao",
    "header_preparo",
    "orcamentos",
    "itens_orcamento",
    "itens_evento_confirmados",
  ];
  /** Só as com coluna serial `id` (header_preparo tem PK composta, sem sequence). */
  const tabelasComSerial = tabelas.filter((t) => t !== "header_preparo");

  return {
    erros,
    avisos,
    tabelas,
    tabelasComSerial,
    linhas: {
      insumos: insumosLinhas.length,
      macro_categorias: macrosLinhas.length,
      headers_ui: headersLinhas.length,
      preparos: preparosLinhas.length,
      composicao: composicaoLinhas.length,
      header_preparo: headerPreparoLinhas.length,
      orcamentos: orcamentosLinhas.length,
      itens_orcamento: itensOrcamentoLinhas.length,
      itens_evento_confirmados: itensEventoLinhas.length,
    },
    preparoIds: preparosLinhas.map((p) => p.id as number),
    orcamentoIds: orcamentosLinhas.map((o) => o.id as number),
    /** Insere tudo (ordem respeita FKs) dentro da transação recebida. */
    async gravar(tx: Tx) {
      if (insumosLinhas.length) await tx.insert(insumos).values(insumosLinhas);
      if (macrosLinhas.length) await tx.insert(macroCategorias).values(macrosLinhas);
      if (headersLinhas.length) await tx.insert(headersUi).values(headersLinhas);
      if (preparosLinhas.length) await tx.insert(preparos).values(preparosLinhas);
      if (composicaoLinhas.length) await tx.insert(composicao).values(composicaoLinhas);
      if (headerPreparoLinhas.length) await tx.insert(headerPreparo).values(headerPreparoLinhas);
      if (orcamentosLinhas.length) await tx.insert(orcamentos).values(orcamentosLinhas);
      if (itensOrcamentoLinhas.length) await tx.insert(itensOrcamento).values(itensOrcamentoLinhas);
      if (itensEventoLinhas.length) await tx.insert(itensEventoConfirmados).values(itensEventoLinhas);
    },
  };
}

async function main() {
  console.log(ESCREVER ? "MODO: escrita real (--write)" : "MODO: dry-run (nenhuma escrita)");
  const preparado = await preparar();

  if (!ESCREVER) {
    console.log("\nDry-run — nenhuma escrita realizada. Rode com --write para aplicar.");
    await pool.end();
    return;
  }

  if (preparado.erros.length > 0) {
    console.log(`\nABORTADO: ${preparado.erros.length} erro(s) encontrado(s) em tabelas de dado real — corrija a causa e rode de novo. Nada foi escrito.`);
    await pool.end();
    process.exitCode = 1;
    return;
  }

  console.log("\nIniciando escrita em transação única...");
  await db.transaction((tx) => preparado.gravar(tx));
  console.log("Transação commitada.");

  // setval FORA da transação, só depois do commit — ver comentário no
  // topo do arquivo (setval não é transacional).
  for (const t of preparado.tabelasComSerial) {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), (SELECT MAX(id) FROM ${t}) IS NOT NULL)`
    );
  }
  console.log("Sequences resincronizadas.");

  await pool.end();
}

// Só executa quando chamado direto (não quando importado pelo orquestrador
// do Dia do Corte).
if (process.argv[1] && /etl-nocodb-para-postgres.[cm]?[tj]s$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error("ERRO FATAL:", e?.cause?.message ?? e?.message ?? e);
    process.exit(1);
  });
}
