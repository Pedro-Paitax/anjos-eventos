import "server-only";
import { nocodbGet } from "@/lib/nocodb";

// IDs de tabela do NocoDB (base Senhor_Churrasco_DB), confirmados via
// /api/v2/meta/bases/.../tables — não inventar, checar o schema real antes
// de mudar.
const TABELA_PREPAROS = "m3yr136ykw6ju2w";
const TABELA_COMPOSICAO = "mj1muse0q0pjli8";
const TABELA_INSUMOS = "m2ll6qtupa1q1il";

// Id do campo de link "Composição" na tabela Preparos — necessário para
// buscar as linhas de composição pela API de links do NocoDB (o campo de
// link não vem populado no GET normal de um registro de Preparo).
const CAMPO_LINK_COMPOSICAO = "cokpnpukyk5tmdg";

const UNIDADE_RENDIMENTO: Record<string, "g" | "ml" | "unidade"> = {
  G: "g",
  ML: "ml",
  Unidade: "unidade",
};

type PreparoRegistro = {
  Id: number;
  "Nome Do Preparo": string;
  Rendimento: number | null;
  "UOM Rendimento": string | null;
};

type ComposicaoLinkRegistro = { Id: number };

type ComposicaoRegistro = {
  Id: number;
  Quantidade: number;
  Insumo: { Id: number } | null;
};

type InsumoRegistro = {
  Id: number;
  Nome: string;
  "Custo Médio": number | null;
  "Rendimento (%)": number | null;
};

export type CustoPreparoResultado = {
  preparo: string;
  custo_total_preparo: number;
  rendimento: number;
  unidade_rendimento: "g" | "ml" | "unidade";
  custo_por_100_unidades: number;
};

export type CustoPreparoErro = { erro: string; status: number };

/**
 * Arredonda pra centavos corrigindo antes o erro de representação binária
 * do float (ex.: 0.15 * 29.9 vira 4.484999999999999 em vez de 4.485), que
 * faria casos de meio-centavo exato arredondarem pra baixo por engano.
 */
function arredondarCentavos(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

export type ItemComposicaoParaCusto = {
  quantidade: number;
  preco: number | null;
  fatorCorrecao: number | null;
};

/**
 * Núcleo puro do motor de custo (sem I/O): soma quantidade x preço
 * corrigido de cada item da composição, seguindo docs/REGRAS_NEGOCIO.md
 * seção 4. Separado da busca no NocoDB pra poder ser validado
 * isoladamente.
 */
export function calcularCustoTotalComposicao(itens: ItemComposicaoParaCusto[]): number {
  let custoTotal = 0;
  for (const item of itens) {
    // Regra de borda: Preço vazio OU Fator de Correção 0 → custo R$0
    // (nunca dividir por zero).
    const custoCorrigido =
      item.preco == null || !item.fatorCorrecao ? 0 : item.preco / item.fatorCorrecao;
    const subtotal = arredondarCentavos(item.quantidade * custoCorrigido);
    custoTotal = arredondarCentavos(custoTotal + subtotal);
  }
  return custoTotal;
}

export function calcularCustoPor100Unidades(custoTotal: number, rendimento: number): number {
  return arredondarCentavos((custoTotal / rendimento) * 100);
}

/**
 * Subconjunto de PreparoRegistro que um chamador upstream (ex.:
 * resolverItensPorPreparoIds, que já buscou o Preparo pra resolver
 * peso/macro-categoria) pode passar pronto, evitando uma segunda busca do
 * mesmo registro — causa raiz do timeout sob concorrência, ver
 * docs/DECISOES.md, "Política de Falha do Motor de Cálculo".
 */
export type PreparoJaBuscado = Pick<PreparoRegistro, "Nome Do Preparo" | "Rendimento" | "UOM Rendimento">;

export async function calcularCustoPreparo(
  preparoId: number,
  preparoJaBuscado?: PreparoJaBuscado
): Promise<CustoPreparoResultado | CustoPreparoErro> {
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) {
    return { erro: "NOCODB_API_TOKEN não configurado.", status: 500 };
  }

  let preparo: PreparoJaBuscado | null;
  let composicaoLinks: { list: ComposicaoLinkRegistro[] };
  try {
    if (preparoJaBuscado) {
      preparo = preparoJaBuscado;
    } else {
      preparo = await nocodbGet<PreparoRegistro>(
        `/tables/${TABELA_PREPAROS}/records/${preparoId}`,
        token
      );
      if (!preparo) {
        return { erro: "Preparo não encontrado.", status: 404 };
      }
    }

    composicaoLinks = (await nocodbGet<{ list: ComposicaoLinkRegistro[] }>(
      `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_COMPOSICAO}/records/${preparoId}?limit=1000`,
      token
    )) ?? { list: [] };
  } catch (erro) {
    return { erro: `Falha ao consultar NocoDB: ${(erro as Error).message}`, status: 502 };
  }

  const rendimento = preparo["Rendimento"];
  const unidadeOriginal = preparo["UOM Rendimento"];
  const unidade = unidadeOriginal ? UNIDADE_RENDIMENTO[unidadeOriginal] : undefined;

  if (!rendimento || rendimento <= 0) {
    return {
      erro: `Preparo "${preparo["Nome Do Preparo"]}" está sem Rendimento válido cadastrado.`,
      status: 422,
    };
  }
  if (!unidade) {
    return {
      erro: `Unidade de rendimento "${unidadeOriginal}" não suportada por este endpoint (esperado G, ML ou Unidade).`,
      status: 422,
    };
  }

  let custoTotal: number;
  try {
    const composicoes = await Promise.all(
      composicaoLinks.list.map((c) =>
        nocodbGet<ComposicaoRegistro>(`/tables/${TABELA_COMPOSICAO}/records/${c.Id}`, token)
      )
    );

    const insumoIds = [
      ...new Set(
        composicoes
          .map((c) => c?.Insumo?.Id)
          .filter((id): id is number => typeof id === "number")
      ),
    ];
    const insumos = await Promise.all(
      insumoIds.map((id) => nocodbGet<InsumoRegistro>(`/tables/${TABELA_INSUMOS}/records/${id}`, token))
    );
    const insumoPorId = new Map(
      insumos.filter((i): i is InsumoRegistro => i !== null).map((i) => [i.Id, i])
    );

    const itensParaCusto: ItemComposicaoParaCusto[] = composicoes
      .filter((c): c is ComposicaoRegistro => c?.Insumo != null)
      .map((composicao) => {
        const insumo = insumoPorId.get(composicao.Insumo!.Id);
        return {
          quantidade: composicao.Quantidade,
          preco: insumo?.["Custo Médio"] ?? null,
          fatorCorrecao: insumo?.["Rendimento (%)"] ?? null,
        };
      });

    custoTotal = calcularCustoTotalComposicao(itensParaCusto);
  } catch (erro) {
    return { erro: `Falha ao consultar NocoDB: ${(erro as Error).message}`, status: 502 };
  }

  const custoPor100Unidades = calcularCustoPor100Unidades(custoTotal, rendimento);

  return {
    preparo: preparo["Nome Do Preparo"],
    custo_total_preparo: custoTotal,
    rendimento,
    unidade_rendimento: unidade,
    custo_por_100_unidades: custoPor100Unidades,
  };
}
