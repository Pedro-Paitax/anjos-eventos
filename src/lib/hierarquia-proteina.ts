import "server-only";
import { nocodbGet } from "@/lib/nocodb";

const TABELA_HIERARQUIA_PROTEINA = "mmzb31uy5dbo7g7";

type HierarquiaProteinaRegistro = {
  Id: number;
  Subcategoria: string;
  Peso_Padrao: number;
};

/**
 * Busca a Hierarquia_Proteina direto na API do NocoDB a cada chamada (sem
 * cache — decisão registrada em docs/DECISOES.md: tabela de 5 linhas,
 * custo de latência irrelevante no volume de uso atual; cache/invalidação
 * via webhook fica como melhoria futura).
 */
export async function buscarPesosPadraoPorSubcategoria(
  token: string
): Promise<Map<string, number>> {
  const resposta = await nocodbGet<{ list: HierarquiaProteinaRegistro[] }>(
    `/tables/${TABELA_HIERARQUIA_PROTEINA}/records?limit=100`,
    token
  );

  const mapa = new Map<string, number>();
  for (const registro of resposta?.list ?? []) {
    mapa.set(registro.Subcategoria, registro.Peso_Padrao);
  }
  return mapa;
}
