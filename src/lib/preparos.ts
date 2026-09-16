import "server-only";
import { CATEGORIAS_CARDAPIO, type CategoriaCardapio, type Preparo } from "@/lib/cardapio";
import { exigirToken, nocodbDelete, nocodbGet, nocodbPatch, nocodbPost } from "@/lib/nocodb";

const NOCODB_URL =
  "http://100.77.218.36:8090/api/v2/tables/m3yr136ykw6ju2w/records?limit=1000";

const RENOMEAR_CATEGORIA: Record<string, string> = {
  Guarnições: "Acompanhamentos",
};

const CATEGORIAS_EXCLUIDAS = new Set(["Molhos"]);

export async function listarPreparosPorCategoria(): Promise<
  Record<CategoriaCardapio, Preparo[]>
> {
  const vazio = Object.fromEntries(
    CATEGORIAS_CARDAPIO.map((categoria) => [categoria, [] as Preparo[]])
  ) as Record<CategoriaCardapio, Preparo[]>;

  const token = process.env.NOCODB_API_TOKEN;
  if (!token) return vazio;

  let dados: { list?: Array<Record<string, unknown>> };
  try {
    const resposta = await fetch(NOCODB_URL, {
      headers: { "xc-token": token },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!resposta.ok) return vazio;
    dados = await resposta.json();
  } catch {
    // NocoDB fora do ar ou inacessível (ex.: rede Tailscale indisponível
    // a partir de onde o app está rodando) — cardápio fica vazio em vez
    // de travar a página.
    return vazio;
  }

  const registros: Array<Record<string, unknown>> = dados.list ?? [];

  for (const registro of registros) {
    const categoriaOriginal = registro["Categoria"];
    if (typeof categoriaOriginal !== "string") continue;
    if (CATEGORIAS_EXCLUIDAS.has(categoriaOriginal)) continue;

    const categoria = (RENOMEAR_CATEGORIA[categoriaOriginal] ??
      categoriaOriginal) as CategoriaCardapio;
    if (!(categoria in vazio)) continue;

    vazio[categoria].push({
      id: registro["Id"] as number,
      nome: registro["Nome Do Preparo"] as string,
    });
  }

  return vazio;
}

// --- CRUD de cadastro (tela de Preparos + Composição) ---

const TABELA_PREPAROS = "m3yr136ykw6ju2w";
const TABELA_COMPOSICAO = "mj1muse0q0pjli8";

// IDs de campo de link, necessários pra API de links do NocoDB.
const CAMPO_LINK_COMPOSICAO = "cokpnpukyk5tmdg"; // Preparos.Composição -> Composicao
const CAMPO_LINK_ITENS_ORCAMENTO = "cdzkcxvha7nzu5g"; // Preparos.Itens_Orcamentos -> Itens_Orcamento
const CAMPO_LINK_ITENS_EVENTOS_CONFIRMADOS = "cgsefvi50d94mjf"; // Preparos.Itens_Eventos_Confirmados -> Itens_Eventos_Confirmado

type PreparoRegistroCompleto = {
  Id: number;
  "Nome Do Preparo": string;
  Categoria: string | null;
  Rendimento: number | null;
  "UOM Rendimento": string | null;
  "Restrições": string | null;
  "Modo de Preparo": string | null;
  Minutes: number | null;
  Peso_Atratividade: number | null;
  Subcategoria_Proteina: string | null;
  Porcao_Maxima_Individual: number | null;
  Peso_Medio_Unidade_G: number | null;
};

type ComposicaoLinkRegistro = { Id: number };
type ComposicaoRegistroCompleto = {
  Id: number;
  Quantidade: number;
  Insumo: { Id: number } | null;
};

export type PreparoResumo = {
  id: number;
  nome: string;
  categoria: string | null;
  rendimento: number | null;
  unidadeRendimento: string | null;
};

export type ComposicaoLinhaExistente = {
  id: number;
  insumoId: number;
  quantidade: number;
};

export type PreparoDetalhado = {
  id: number;
  nome: string;
  categoria: string | null;
  rendimento: number | null;
  unidadeRendimento: string | null;
  restricoes: string[];
  modoPreparo: string | null;
  tempoPreparoMinutos: number | null;
  pesoAtratividade: number | null;
  subcategoriaProteina: string | null;
  porcaoMaximaIndividual: number | null;
  pesoMedioUnidadeG: number | null;
  composicao: ComposicaoLinhaExistente[];
};

export type DadosPreparoForm = {
  nome: string;
  categoria: string;
  rendimento: number;
  unidadeRendimento: string;
  restricoes: string[];
  modoPreparo: string | null;
  tempoPreparoMinutos: number | null;
  pesoAtratividade: number | null;
  subcategoriaProteina: string | null;
  porcaoMaximaIndividual: number | null;
  /** Obrigatório quando unidadeRendimento === "Unidade" (docs/DECISOES.md, "Correção do Bug de Mistura de Unidades") — validado em src/app/actions/preparo.ts antes de chegar aqui. */
  pesoMedioUnidadeG: number | null;
};

// Linha de composição vinda do formulário: `id` é `null` pra linha nova
// (ainda não gravada no NocoDB).
export type ComposicaoLinhaForm = {
  id: number | null;
  insumoId: number;
  quantidade: number;
};

function paraCamposNocodb(dados: DadosPreparoForm) {
  return {
    "Nome Do Preparo": dados.nome,
    Categoria: dados.categoria,
    Rendimento: dados.rendimento,
    "UOM Rendimento": dados.unidadeRendimento,
    "Restrições": dados.restricoes.length > 0 ? dados.restricoes.join(",") : null,
    "Modo de Preparo": dados.modoPreparo,
    Minutes: dados.tempoPreparoMinutos,
    Peso_Atratividade: dados.pesoAtratividade,
    Subcategoria_Proteina: dados.categoria === "Carnes" ? dados.subcategoriaProteina : null,
    Porcao_Maxima_Individual: dados.porcaoMaximaIndividual,
    Peso_Medio_Unidade_G: dados.unidadeRendimento === "Unidade" ? dados.pesoMedioUnidadeG : null,
  };
}

export async function listarPreparos(): Promise<PreparoResumo[]> {
  const token = exigirToken();
  const resposta = await nocodbGet<{ list: PreparoRegistroCompleto[] }>(
    `/tables/${TABELA_PREPAROS}/records?limit=1000`,
    token
  );
  return (resposta?.list ?? [])
    .map((r) => ({
      id: r.Id,
      nome: r["Nome Do Preparo"],
      categoria: r.Categoria,
      rendimento: r.Rendimento,
      unidadeRendimento: r["UOM Rendimento"],
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterPreparoComComposicao(
  id: number
): Promise<PreparoDetalhado | null> {
  const token = exigirToken();

  const preparo = await nocodbGet<PreparoRegistroCompleto>(
    `/tables/${TABELA_PREPAROS}/records/${id}`,
    token
  );
  if (!preparo) return null;

  const composicaoLinks = await nocodbGet<{ list: ComposicaoLinkRegistro[] }>(
    `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_COMPOSICAO}/records/${id}?limit=1000`,
    token
  );

  const composicao = await Promise.all(
    (composicaoLinks?.list ?? []).map(async (link) => {
      const registro = await nocodbGet<ComposicaoRegistroCompleto>(
        `/tables/${TABELA_COMPOSICAO}/records/${link.Id}`,
        token
      );
      if (!registro?.Insumo) return null;
      return {
        id: registro.Id,
        insumoId: registro.Insumo.Id,
        quantidade: registro.Quantidade,
      };
    })
  );

  return {
    id: preparo.Id,
    nome: preparo["Nome Do Preparo"],
    categoria: preparo.Categoria,
    rendimento: preparo.Rendimento,
    unidadeRendimento: preparo["UOM Rendimento"],
    restricoes: preparo["Restrições"] ? preparo["Restrições"].split(",") : [],
    modoPreparo: preparo["Modo de Preparo"],
    tempoPreparoMinutos: preparo.Minutes,
    pesoAtratividade: preparo.Peso_Atratividade,
    subcategoriaProteina: preparo.Subcategoria_Proteina,
    porcaoMaximaIndividual: preparo.Porcao_Maxima_Individual,
    pesoMedioUnidadeG: preparo.Peso_Medio_Unidade_G,
    composicao: composicao.filter((c): c is ComposicaoLinhaExistente => c !== null),
  };
}

async function gravarLinhaComposicao(
  preparoId: number,
  linha: ComposicaoLinhaForm,
  token: string
): Promise<void> {
  if (linha.id == null) {
    await nocodbPost(
      `/tables/${TABELA_COMPOSICAO}/records`,
      { Preparo: { Id: preparoId }, Insumo: { Id: linha.insumoId }, Quantidade: linha.quantidade },
      token
    );
  } else {
    await nocodbPatch(
      `/tables/${TABELA_COMPOSICAO}/records`,
      { Id: linha.id, Insumo: { Id: linha.insumoId }, Quantidade: linha.quantidade },
      token
    );
  }
}

export async function criarPreparo(
  dados: DadosPreparoForm,
  composicao: ComposicaoLinhaForm[]
): Promise<number> {
  const token = exigirToken();

  const criado = await nocodbPost<{ Id: number }>(
    `/tables/${TABELA_PREPAROS}/records`,
    paraCamposNocodb(dados),
    token
  );

  for (const linha of composicao) {
    await gravarLinhaComposicao(criado.Id, linha, token);
  }

  return criado.Id;
}

export async function atualizarPreparo(
  id: number,
  dados: DadosPreparoForm,
  composicao: ComposicaoLinhaForm[]
): Promise<void> {
  const token = exigirToken();

  await nocodbPatch(
    `/tables/${TABELA_PREPAROS}/records`,
    { Id: id, ...paraCamposNocodb(dados) },
    token
  );

  const composicaoLinksAtuais = await nocodbGet<{ list: ComposicaoLinkRegistro[] }>(
    `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_COMPOSICAO}/records/${id}?limit=1000`,
    token
  );
  const idsAtuais = new Set((composicaoLinksAtuais?.list ?? []).map((l) => l.Id));
  const idsMantidos = new Set(
    composicao.map((l) => l.id).filter((linhaId): linhaId is number => linhaId != null)
  );

  for (const idAtual of idsAtuais) {
    if (!idsMantidos.has(idAtual)) {
      await nocodbDelete(`/tables/${TABELA_COMPOSICAO}/records`, { Id: idAtual }, token);
    }
  }

  for (const linha of composicao) {
    await gravarLinhaComposicao(id, linha, token);
  }
}

/** true = preparo já foi usado em orçamento/evento e não pode ser excluído. */
export async function preparoEstaReferenciado(id: number): Promise<boolean> {
  const token = exigirToken();

  const [itensOrcamento, itensEventos] = await Promise.all([
    nocodbGet<{ list: unknown[] }>(
      `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_ITENS_ORCAMENTO}/records/${id}?limit=1`,
      token
    ),
    nocodbGet<{ list: unknown[] }>(
      `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_ITENS_EVENTOS_CONFIRMADOS}/records/${id}?limit=1`,
      token
    ),
  ]);

  return (itensOrcamento?.list.length ?? 0) > 0 || (itensEventos?.list.length ?? 0) > 0;
}

export async function excluirPreparo(id: number): Promise<void> {
  const token = exigirToken();

  const composicaoLinks = await nocodbGet<{ list: ComposicaoLinkRegistro[] }>(
    `/tables/${TABELA_PREPAROS}/links/${CAMPO_LINK_COMPOSICAO}/records/${id}?limit=1000`,
    token
  );
  for (const link of composicaoLinks?.list ?? []) {
    await nocodbDelete(`/tables/${TABELA_COMPOSICAO}/records`, { Id: link.Id }, token);
  }

  await nocodbDelete(`/tables/${TABELA_PREPAROS}/records`, { Id: id }, token);
}
