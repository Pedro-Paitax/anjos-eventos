import "server-only";
import { unstable_cache } from "next/cache";
import { nocodbGet } from "@/lib/nocodb";
import { TAG_HIERARQUIA_PROTEINA } from "@/lib/cache-tags";

const TABELA_HIERARQUIA_PROTEINA = "mmzb31uy5dbo7g7";

type HierarquiaProteinaRegistro = {
  Id: number;
  Subcategoria: string;
  Peso_Padrao: number;
};

/**
 * unstable_cache só aceita retorno serializável (Map não é) — a função
 * cacheada retorna pares [chave, valor], e buscarPesosPadraoPorSubcategoria
 * reconstrói o Map depois. Invalidação via revalidateTag(TAG_HIERARQUIA_PROTEINA)
 * — ver /api/revalidate e docs/DECISOES.md, seção "Cache de
 * Hierarquia_Proteina/Macro_Categorias".
 */
const buscarParesPesoPadraoCached = unstable_cache(
  async (token: string): Promise<Array<[string, number]>> => {
    const resposta = await nocodbGet<{ list: HierarquiaProteinaRegistro[] }>(
      `/tables/${TABELA_HIERARQUIA_PROTEINA}/records?limit=100`,
      token
    );
    return (resposta?.list ?? []).map((r) => [r.Subcategoria, r.Peso_Padrao]);
  },
  ["hierarquia-proteina"],
  { tags: [TAG_HIERARQUIA_PROTEINA] }
);

export async function buscarPesosPadraoPorSubcategoria(
  token: string
): Promise<Map<string, number>> {
  return new Map(await buscarParesPesoPadraoCached(token));
}
