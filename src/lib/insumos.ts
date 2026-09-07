import "server-only";
import { exigirToken, nocodbGet, nocodbPost } from "@/lib/nocodb";
import type { UnidadeInsumo } from "@/lib/preparos-opcoes";

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

export async function listarInsumos(): Promise<Insumo[]> {
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
