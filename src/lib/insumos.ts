import "server-only";
import { exigirToken, nocodbGet, nocodbPost } from "@/lib/nocodb";
import type { UnidadeInsumo } from "@/lib/preparos-opcoes";
import { dataSource } from "@/lib/data-source";

const TABELA_INSUMOS = "m2ll6qtupa1q1il";

export type Insumo = {
  id: number;
  nome: string;
  udm: string;
};

type InsumoRegistro = {
  Id: number;
  Nome: string;
  UDM: string | null;
};

export type DadosInsumo = {
  nome: string;
  udm: UnidadeInsumo;
  preco: number;
  fatorCorrecao: number;
};

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
