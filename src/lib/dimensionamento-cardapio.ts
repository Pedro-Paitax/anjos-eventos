import "server-only";
import { nocodbGet } from "@/lib/nocodb";
import { buscarPesosPadraoPorSubcategoria } from "@/lib/hierarquia-proteina";

// IDs de tabela do NocoDB (base Senhor_Churrasco_DB), confirmados via
// /api/v2/meta/bases/.../tables — não inventar, checar o schema real antes
// de mudar.
const TABELA_ORCAMENTOS = "mpobqls8ibt3ay3";
const TABELA_ITENS_ORCAMENTO = "m4tc69znld4pmxa";
const TABELA_PREPAROS = "m3yr136ykw6ju2w";
const TABELA_HEADERS_UI = "m1wg9dhlf23jby6";
const TABELA_MACRO_CATEGORIAS = "me1h77whhyj9ghj";

// IDs de campo de link, necessários pra API de links do NocoDB (o lado
// "muitos" de uma relação não vem populado no GET normal de um registro).
const CAMPO_LINK_ORCAMENTO_ITENS = "ckg8dpirjxl3hhf"; // Orcamentos.Itens_Orcamentos1 -> Itens_Orcamento
const CAMPO_LINK_PREPARO_HEADERS_UI = "ccbynq6n7086bto"; // Preparos.Macro_Categoria -> Headers_UI (nome do campo é enganoso: liga a Headers_UI, não a Macro_Categorias)
const CAMPO_LINK_HEADER_UI_MACRO = "c8uxteybq3tg2i4"; // Headers_UI.Macro_Economias -> Macro_Categorias

type OrcamentoRegistro = {
  Id: number;
  Num_Convidados: number | null;
};

type ItemLinkRegistro = { Id: number };

type ItemOrcamentoRegistro = {
  Id: number;
  Preparo: { Id: number } | null;
};

type PreparoRegistro = {
  Id: number;
  "Nome Do Preparo": string;
  Categoria: string | null;
  Peso_Atratividade: number | null;
  Subcategoria_Proteina: string | null;
  Porcao_Maxima_Individual: number | null;
};

type ComLink = { Id: number };
type RespostaLink<T> = T | { list: T[] } | null;

/**
 * A API de links do NocoDB retorna formatos diferentes conforme o tipo de
 * relação: um objeto único para relações "um-pra-um/muitos-pra-um" (ex.:
 * Preparo -> Headers_UI), e `{ list: [...] }` para relações "muitos" (ex.:
 * Preparo -> Composição). Normaliza os dois formatos pro primeiro item.
 */
function primeiroDoLink<T extends ComLink>(resposta: RespostaLink<T>): T | null {
  if (!resposta) return null;
  if ("list" in resposta) return resposta.list[0] ?? null;
  return resposta;
}

function todosDoLink<T extends ComLink>(resposta: RespostaLink<T>): T[] {
  if (!resposta) return [];
  if ("list" in resposta) return resposta.list;
  return [resposta];
}

type HeaderUiLinkRegistro = ComLink & { Nome_Exibicao?: string };

type MacroCategoriaRegistro = {
  Id: number;
  Nome_Macro: string;
  Capacidade_Categoria: number | null;
  UOM: string | null;
};

export type ItemDimensionado = {
  preparo: string;
  peso_item: number;
  origem_peso: string;
  porcao_calculada: number;
  porcao_maxima_individual: number | null;
  porcao_final: number;
  volume_necessario_total: number;
};

export type MacroCategoriaDimensionada = {
  macro_categoria: string;
  capacidade_teto: number;
  unidade: string;
  itens: ItemDimensionado[];
};

export type ItemExcluido = {
  preparo: string;
  motivo: string;
};

export type DimensionamentoResultado = {
  orcamento_id: number;
  num_convidados: number;
  macro_categorias: MacroCategoriaDimensionada[];
  itens_excluidos: ItemExcluido[];
};

export type DimensionamentoErro = { erro: string; status: number };

function arredondar(valor: number): number {
  return Math.round(Number(valor.toFixed(8)) * 100) / 100;
}

export type ItemResolvido = {
  preparoNome: string;
  peso: number;
  origemPeso: string;
  porcaoMaximaIndividual: number | null;
  macroCategoriaChave: string | number;
  macroCategoriaNome: string;
  capacidadeTeto: number;
  unidade: string;
};

/**
 * Núcleo puro do motor de dimensionamento (sem I/O): recebe itens já
 * resolvidos (peso e macro-categoria definidos) e aplica a fórmula de
 * REGRAS_NEGOCIO.md seção 5 — distribuição proporcional ao peso dentro do
 * teto da macro-categoria, com Hard Cap opcional. Separado da busca no
 * NocoDB pra poder ser validado isoladamente.
 */
export function distribuirPorcoes(
  itens: ItemResolvido[],
  numConvidados: number
): MacroCategoriaDimensionada[] {
  const grupos = new Map<
    string | number,
    { nome: string; capacidadeTeto: number; unidade: string; itens: ItemResolvido[] }
  >();

  for (const item of itens) {
    const grupo = grupos.get(item.macroCategoriaChave) ?? {
      nome: item.macroCategoriaNome,
      capacidadeTeto: item.capacidadeTeto,
      unidade: item.unidade,
      itens: [],
    };
    grupo.itens.push(item);
    grupos.set(item.macroCategoriaChave, grupo);
  }

  const resultado: MacroCategoriaDimensionada[] = [];
  for (const grupo of grupos.values()) {
    const somaPesos = grupo.itens.reduce((soma, item) => soma + item.peso, 0);

    const itensDimensionados: ItemDimensionado[] = grupo.itens.map((item) => {
      const porcaoCalculada = arredondar(grupo.capacidadeTeto * (item.peso / somaPesos));
      const porcaoFinal =
        item.porcaoMaximaIndividual != null
          ? Math.min(porcaoCalculada, item.porcaoMaximaIndividual)
          : porcaoCalculada;

      return {
        preparo: item.preparoNome,
        peso_item: item.peso,
        origem_peso: item.origemPeso,
        porcao_calculada: porcaoCalculada,
        porcao_maxima_individual: item.porcaoMaximaIndividual,
        porcao_final: arredondar(porcaoFinal),
        volume_necessario_total: arredondar(porcaoFinal * numConvidados),
      };
    });

    resultado.push({
      macro_categoria: grupo.nome,
      capacidade_teto: grupo.capacidadeTeto,
      unidade: grupo.unidade,
      itens: itensDimensionados,
    });
  }

  return resultado;
}

function resolverPesoItem(
  preparo: PreparoRegistro,
  pesosPadrao: Map<string, number>
): { peso: number; origem: string } | null {
  if (preparo.Peso_Atratividade != null) {
    return { peso: preparo.Peso_Atratividade, origem: "Peso_Atratividade (manual)" };
  }
  if (preparo.Categoria === "Carnes" && preparo.Subcategoria_Proteina) {
    const pesoPadrao = pesosPadrao.get(preparo.Subcategoria_Proteina);
    if (pesoPadrao != null) {
      return {
        peso: pesoPadrao,
        origem: `Hierarquia_Proteina (${preparo.Subcategoria_Proteina})`,
      };
    }
  }
  return null;
}

async function resolverMacroCategoria(
  preparoId: number,
  token: string
): Promise<MacroCategoriaRegistro | null> {
  const headersUiResposta = await nocodbGet<RespostaLink<HeaderUiLinkRegistro>>(
    `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_PREPARO_HEADERS_UI}/records/${preparoId}?limit=10`,
    token
  );
  const headerUiId = primeiroDoLink(headersUiResposta)?.Id;
  if (!headerUiId) return null;

  const macroCategoriasResposta = await nocodbGet<RespostaLink<MacroCategoriaRegistro>>(
    `/tables/${TABELA_HEADERS_UI}/links/${CAMPO_LINK_HEADER_UI_MACRO}/records/${headerUiId}?limit=10`,
    token
  );
  const macroCategoriaId = primeiroDoLink(macroCategoriasResposta)?.Id;
  if (!macroCategoriaId) return null;

  return nocodbGet<MacroCategoriaRegistro>(
    `/tables/${TABELA_MACRO_CATEGORIAS}/records/${macroCategoriaId}`,
    token
  );
}

export async function calcularDimensionamentoOrcamento(
  orcamentoId: number
): Promise<DimensionamentoResultado | DimensionamentoErro> {
  const token = process.env.NOCODB_API_TOKEN;
  if (!token) {
    return { erro: "NOCODB_API_TOKEN não configurado.", status: 500 };
  }

  let orcamento: OrcamentoRegistro | null;
  let itensLink: ItemLinkRegistro[];
  try {
    orcamento = await nocodbGet<OrcamentoRegistro>(
      `/tables/${TABELA_ORCAMENTOS}/records/${orcamentoId}`,
      token
    );
    if (!orcamento) {
      return { erro: "Orçamento não encontrado.", status: 404 };
    }

    itensLink = todosDoLink(
      await nocodbGet<RespostaLink<ItemLinkRegistro>>(
        `/tables/${TABELA_ORCAMENTOS}/links/${CAMPO_LINK_ORCAMENTO_ITENS}/records/${orcamentoId}?limit=1000`,
        token
      )
    );
  } catch (erro) {
    return { erro: `Falha ao consultar NocoDB: ${(erro as Error).message}`, status: 502 };
  }

  const numConvidados = orcamento["Num_Convidados"];
  if (!numConvidados || numConvidados <= 0) {
    return { erro: "Orçamento está sem Num_Convidados válido cadastrado.", status: 422 };
  }

  const itensExcluidos: ItemExcluido[] = [];
  const itensResolvidos: ItemResolvido[] = [];

  try {
    const pesosPadrao = await buscarPesosPadraoPorSubcategoria(token);

    const itensOrcamento = await Promise.all(
      itensLink.map((item) =>
        nocodbGet<ItemOrcamentoRegistro>(`/tables/${TABELA_ITENS_ORCAMENTO}/records/${item.Id}`, token)
      )
    );

    const preparoIds = [
      ...new Set(
        itensOrcamento
          .map((item) => item?.Preparo?.Id)
          .filter((id): id is number => typeof id === "number")
      ),
    ];

    const preparos = await Promise.all(
      preparoIds.map((id) => nocodbGet<PreparoRegistro>(`/tables/${TABELA_PREPAROS}/records/${id}`, token))
    );
    const preparoPorId = new Map(
      preparos.filter((p): p is PreparoRegistro => p !== null).map((p) => [p.Id, p])
    );

    const macroCategoriaPorPreparoId = new Map<number, MacroCategoriaRegistro | null>();
    await Promise.all(
      preparoIds.map(async (id) => {
        macroCategoriaPorPreparoId.set(id, await resolverMacroCategoria(id, token));
      })
    );

    for (const item of itensOrcamento) {
      const preparoId = item?.Preparo?.Id;
      if (!preparoId) continue;
      const preparo = preparoPorId.get(preparoId);
      if (!preparo) continue;

      const pesoResolvido = resolverPesoItem(preparo, pesosPadrao);
      if (!pesoResolvido) {
        itensExcluidos.push({
          preparo: preparo["Nome Do Preparo"],
          motivo:
            "Peso não resolvido: sem Peso_Atratividade definido e sem Subcategoria_Proteina (ou categoria diferente de Carnes).",
        });
        continue;
      }

      const macroCategoria = macroCategoriaPorPreparoId.get(preparoId);
      if (!macroCategoria || macroCategoria.Capacidade_Categoria == null || !macroCategoria.UOM) {
        itensExcluidos.push({
          preparo: preparo["Nome Do Preparo"],
          motivo: "Macro-categoria não resolvida (preparo sem Header_UI vinculado ou Header_UI sem Macro_Categoria).",
        });
        continue;
      }

      itensResolvidos.push({
        preparoNome: preparo["Nome Do Preparo"],
        peso: pesoResolvido.peso,
        origemPeso: pesoResolvido.origem,
        porcaoMaximaIndividual: preparo.Porcao_Maxima_Individual,
        macroCategoriaChave: macroCategoria.Id,
        macroCategoriaNome: macroCategoria.Nome_Macro,
        capacidadeTeto: macroCategoria.Capacidade_Categoria,
        unidade: macroCategoria.UOM,
      });
    }
  } catch (erro) {
    return { erro: `Falha ao consultar NocoDB: ${(erro as Error).message}`, status: 502 };
  }

  return {
    orcamento_id: orcamentoId,
    num_convidados: numConvidados,
    macro_categorias: distribuirPorcoes(itensResolvidos, numConvidados),
    itens_excluidos: itensExcluidos,
  };
}
