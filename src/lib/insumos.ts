import "server-only";
import { exigirToken, nocodbGet, nocodbPatch, nocodbPost } from "@/lib/nocodb";
import type { UnidadeInsumo } from "@/lib/preparos-opcoes";
import { dataSource } from "@/lib/data-source";

const TABELA_INSUMOS = "m2ll6qtupa1q1il";

export type Insumo = {
  id: number;
  nome: string;
  udm: string;
};

/** Insumo com os campos de preço, usado na tela /insumos (lista e edição). */
export type InsumoResumo = Insumo & {
  preco: number | null;
  fatorCorrecao: number | null;
};

type InsumoRegistro = {
  Id: number;
  Nome: string;
  UDM: string | null;
};

/** InsumoRegistro + campos de preço, só usados na tela /insumos. */
type InsumoRegistroCompleto = InsumoRegistro & {
  "Custo Médio": number | null;
  "Rendimento (%)": number | null;
};

export type DadosInsumo = {
  nome: string;
  udm: UnidadeInsumo;
  preco: number;
  fatorCorrecao: number;
};

const numOuNulo = (v: string | null) => (v == null ? null : Number(v));

/** DATA_SOURCE=oracle: mesma lista via Drizzle (unidade do enum = UDM do NocoDB). */
async function listarInsumosOracle(): Promise<Insumo[]> {
  const { db } = await import("@/db/client");
  const { insumos } = await import("@/db/schema/insumos");
  const linhas = await db.select({ id: insumos.id, nome: insumos.nome, unidade: insumos.unidade }).from(insumos);
  return linhas
    .map((r) => ({ id: r.id, nome: r.nome, udm: r.unidade }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Escrita via Drizzle: NÃO validada contra banco (só leitura foi testada — ver docs/PENDENCIAS_NOTURNAS.md). */
async function criarInsumoOracle(dados: DadosInsumo): Promise<Insumo> {
  const { db } = await import("@/db/client");
  const { insumos } = await import("@/db/schema/insumos");
  const [criado] = await db
    .insert(insumos)
    .values({
      nome: dados.nome,
      unidade: dados.udm,
      preco: String(dados.preco),
      fatorCorrecao: String(dados.fatorCorrecao),
    })
    .returning({ id: insumos.id });
  return { id: criado.id, nome: dados.nome, udm: dados.udm };
}

export async function listarInsumos(): Promise<Insumo[]> {
  if (dataSource() === "oracle") return listarInsumosOracle();
  const token = exigirToken();
  const resposta = await nocodbGet<{ list: InsumoRegistro[] }>(
    `/tables/${TABELA_INSUMOS}/records?limit=1000`,
    token
  );
  return (resposta?.list ?? [])
    .map((r) => ({ id: r.Id, nome: r.Nome, udm: r.UDM ?? "" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function listarInsumosDetalhadoOracle(): Promise<InsumoResumo[]> {
  const { db } = await import("@/db/client");
  const { insumos } = await import("@/db/schema/insumos");
  const linhas = await db.select().from(insumos);
  return linhas
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      udm: r.unidade,
      preco: numOuNulo(r.preco),
      fatorCorrecao: numOuNulo(r.fatorCorrecao),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Lista de Insumos com preço e fator de correção, pra tela /insumos. */
export async function listarInsumosDetalhado(): Promise<InsumoResumo[]> {
  if (dataSource() === "oracle") return listarInsumosDetalhadoOracle();
  const token = exigirToken();
  const resposta = await nocodbGet<{ list: InsumoRegistroCompleto[] }>(
    `/tables/${TABELA_INSUMOS}/records?limit=1000`,
    token
  );
  return (resposta?.list ?? [])
    .map((r) => ({
      id: r.Id,
      nome: r.Nome,
      udm: r.UDM ?? "",
      preco: r["Custo Médio"] ?? null,
      fatorCorrecao: r["Rendimento (%)"] ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function obterInsumoOracle(id: number): Promise<InsumoResumo | null> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { insumos } = await import("@/db/schema/insumos");
  const [r] = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  if (!r) return null;
  return {
    id: r.id,
    nome: r.nome,
    udm: r.unidade,
    preco: numOuNulo(r.preco),
    fatorCorrecao: numOuNulo(r.fatorCorrecao),
  };
}

export async function obterInsumo(id: number): Promise<InsumoResumo | null> {
  if (dataSource() === "oracle") return obterInsumoOracle(id);
  const token = exigirToken();
  const r = await nocodbGet<InsumoRegistroCompleto>(`/tables/${TABELA_INSUMOS}/records/${id}`, token);
  if (!r) return null;
  return {
    id: r.Id,
    nome: r.Nome,
    udm: r.UDM ?? "",
    preco: r["Custo Médio"] ?? null,
    fatorCorrecao: r["Rendimento (%)"] ?? null,
  };
}

/** Escrita via Drizzle: NÃO validada contra banco (só leitura foi testada — ver docs/PENDENCIAS_NOTURNAS.md). */
async function atualizarInsumoOracle(id: number, dados: DadosInsumo): Promise<void> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { insumos } = await import("@/db/schema/insumos");
  await db
    .update(insumos)
    .set({
      nome: dados.nome,
      unidade: dados.udm,
      preco: String(dados.preco),
      fatorCorrecao: String(dados.fatorCorrecao),
    })
    .where(eq(insumos.id, id));
}

export async function atualizarInsumo(id: number, dados: DadosInsumo): Promise<void> {
  if (dataSource() === "oracle") return atualizarInsumoOracle(id, dados);
  const token = exigirToken();
  await nocodbPatch(
    `/tables/${TABELA_INSUMOS}/records`,
    {
      Id: id,
      Nome: dados.nome,
      UDM: dados.udm,
      "Custo Médio": dados.preco,
      "Rendimento (%)": dados.fatorCorrecao,
    },
    token
  );
}

export async function criarInsumo(dados: DadosInsumo): Promise<Insumo> {
  if (dataSource() === "oracle") return criarInsumoOracle(dados);
  const token = exigirToken();
  const criado = await nocodbPost<{ Id: number }>(
    `/tables/${TABELA_INSUMOS}/records`,
    {
      Nome: dados.nome,
      UDM: dados.udm,
      "Custo Médio": dados.preco,
      "Rendimento (%)": dados.fatorCorrecao,
    },
    token
  );
  return { id: criado.Id, nome: dados.nome, udm: dados.udm };
}
