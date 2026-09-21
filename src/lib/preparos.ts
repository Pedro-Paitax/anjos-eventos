import "server-only";
import { CATEGORIAS_CARDAPIO, type CategoriaCardapio, type Preparo } from "@/lib/cardapio";
import { exigirToken, nocodbDelete, nocodbGet, nocodbPatch, nocodbPost } from "@/lib/nocodb";
import { dataSource } from "@/lib/data-source";

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

  if (dataSource() === "oracle") {
    // Mesma regra de renomear/excluir categorias, lendo via Drizzle (ordem por id, como a API do NocoDB).
    try {
      const { db } = await import("@/db/client");
      const { asc } = await import("drizzle-orm");
      const { preparos } = await import("@/db/schema/preparos");
      const linhas = await db
        .select({ id: preparos.id, nome: preparos.nomePreparo, categoria: preparos.categoria })
        .from(preparos)
        .orderBy(asc(preparos.id));
      for (const l of linhas) {
        if (CATEGORIAS_EXCLUIDAS.has(l.categoria)) continue;
        const categoria = (RENOMEAR_CATEGORIA[l.categoria] ?? l.categoria) as CategoriaCardapio;
        if (!(categoria in vazio)) continue;
        vazio[categoria].push({ id: l.id, nome: l.nome });
      }
    } catch {
      // Banco indisponível: mesmo comportamento do ramo NocoDB — cardápio vazio em vez de travar a página.
    }
    return vazio;
  }

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

// --- DATA_SOURCE=oracle (Drizzle). Leituras validadas por equivalência; as
// escritas NÃO foram validadas contra banco (ver docs/PENDENCIAS_NOTURNAS.md). ---

const numOuNulo = (v: string | null) => (v == null ? null : Number(v));

async function listarPreparosOracle(): Promise<PreparoResumo[]> {
  const { db } = await import("@/db/client");
  const { preparos } = await import("@/db/schema/preparos");
  const linhas = await db.select().from(preparos);
  return linhas
    .map((r) => ({
      id: r.id,
      nome: r.nomePreparo,
      categoria: r.categoria,
      rendimento: numOuNulo(r.rendimento),
      unidadeRendimento: r.unidadeRendimento,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function obterPreparoComComposicaoOracle(id: number): Promise<PreparoDetalhado | null> {
  const { db } = await import("@/db/client");
  const { eq, asc } = await import("drizzle-orm");
  const { preparos } = await import("@/db/schema/preparos");
  const { composicao } = await import("@/db/schema/composicao");
  const [p] = await db.select().from(preparos).where(eq(preparos.id, id));
  if (!p) return null;
  const linhas = await db
    .select({ id: composicao.id, insumoId: composicao.insumoId, quantidade: composicao.quantidade })
    .from(composicao)
    .where(eq(composicao.preparoId, id))
    .orderBy(asc(composicao.id));
  return {
    id: p.id,
    nome: p.nomePreparo,
    categoria: p.categoria,
    rendimento: numOuNulo(p.rendimento),
    unidadeRendimento: p.unidadeRendimento,
    restricoes: p.tags ?? [],
    modoPreparo: p.modoPreparo,
    tempoPreparoMinutos: p.tempoPreparoMinutos,
    pesoAtratividade: numOuNulo(p.pesoAtratividade),
    subcategoriaProteina: p.subcategoriaProteina,
    porcaoMaximaIndividual: numOuNulo(p.porcaoMaximaIndividual),
    pesoMedioUnidadeG: numOuNulo(p.pesoMedioUnidadeG),
    composicao: linhas.map((l) => ({ id: l.id, insumoId: l.insumoId, quantidade: Number(l.quantidade) })),
  };
}

/**
 * Converte o formulário pro schema novo. Duas incompatibilidades REAIS entre o
 * formulário atual e o schema Oracle (docs/schema-fisico-detalhado.md) — falha
 * explícita em vez de gravar errado; decisão de negócio pendente do Pedro:
 * (1) o formulário oferece unidade "KG"/"Pessoas", mas o enum novo só tem G/ML/Unidade;
 * (2) modo_preparo é NOT NULL no schema novo, mas o formulário aceita vazio.
 */
async function paraLinhaOracle(dados: DadosPreparoForm) {
  const { preparos, restricaoAlimentarEnum } = await import("@/db/schema/preparos");
  type Novo = typeof preparos.$inferInsert;
  const categorias: readonly string[] = preparos.categoria.enumValues;
  const unidades: readonly string[] = preparos.unidadeRendimento.enumValues;
  const restricoes: readonly string[] = restricaoAlimentarEnum.enumValues;
  if (!categorias.includes(dados.categoria)) throw new Error(`Categoria não suportada no Postgres novo: "${dados.categoria}"`);
  if (!unidades.includes(dados.unidadeRendimento)) {
    throw new Error(`Unidade de rendimento "${dados.unidadeRendimento}" não existe no Postgres novo (só G, ML, Unidade) — decisão pendente.`);
  }
  if (!dados.modoPreparo?.trim()) throw new Error("Modo de Preparo é obrigatório no Postgres novo (NOT NULL) — decisão pendente.");
  for (const r of dados.restricoes) {
    if (!restricoes.includes(r)) throw new Error(`Restrição desconhecida: "${r}"`);
  }
  return {
    nomePreparo: dados.nome,
    categoria: dados.categoria as Novo["categoria"],
    rendimento: String(dados.rendimento),
    unidadeRendimento: dados.unidadeRendimento as Novo["unidadeRendimento"],
    tags: dados.restricoes.length > 0 ? (dados.restricoes as Novo["tags"]) : null,
    modoPreparo: dados.modoPreparo,
    tempoPreparoMinutos: dados.tempoPreparoMinutos,
    pesoAtratividade: dados.pesoAtratividade == null ? null : String(dados.pesoAtratividade),
    subcategoriaProteina: (dados.categoria === "Carnes" ? dados.subcategoriaProteina : null) as Novo["subcategoriaProteina"],
    porcaoMaximaIndividual: dados.porcaoMaximaIndividual == null ? null : String(dados.porcaoMaximaIndividual),
    pesoMedioUnidadeG:
      dados.unidadeRendimento === "Unidade" && dados.pesoMedioUnidadeG != null ? String(dados.pesoMedioUnidadeG) : null,
    // apresentacao_utensilio não faz parte do formulário: não é tocada aqui (update preserva o valor).
  };
}

async function criarPreparoOracle(dados: DadosPreparoForm, linhasComposicao: ComposicaoLinhaForm[]): Promise<number> {
  const { db } = await import("@/db/client");
  const { preparos } = await import("@/db/schema/preparos");
  const { composicao } = await import("@/db/schema/composicao");
  const valores = await paraLinhaOracle(dados);
  return db.transaction(async (tx) => {
    const [criado] = await tx.insert(preparos).values(valores).returning({ id: preparos.id });
    if (linhasComposicao.length) {
      await tx.insert(composicao).values(
        linhasComposicao.map((l) => ({ preparoId: criado.id, insumoId: l.insumoId, quantidade: String(l.quantidade) }))
      );
    }
    return criado.id;
  });
}

async function atualizarPreparoOracle(id: number, dados: DadosPreparoForm, linhasComposicao: ComposicaoLinhaForm[]): Promise<void> {
  const { db } = await import("@/db/client");
  const { and, eq, notInArray } = await import("drizzle-orm");
  const { preparos } = await import("@/db/schema/preparos");
  const { composicao } = await import("@/db/schema/composicao");
  const valores = await paraLinhaOracle(dados);
  await db.transaction(async (tx) => {
    await tx.update(preparos).set(valores).where(eq(preparos.id, id));
    const idsMantidos = linhasComposicao.map((l) => l.id).filter((x): x is number => x != null);
    if (idsMantidos.length) {
      await tx.delete(composicao).where(and(eq(composicao.preparoId, id), notInArray(composicao.id, idsMantidos)));
    } else {
      await tx.delete(composicao).where(eq(composicao.preparoId, id));
    }
    for (const l of linhasComposicao) {
      if (l.id == null) {
        await tx.insert(composicao).values({ preparoId: id, insumoId: l.insumoId, quantidade: String(l.quantidade) });
      } else {
        await tx
          .update(composicao)
          .set({ insumoId: l.insumoId, quantidade: String(l.quantidade) })
          .where(and(eq(composicao.id, l.id), eq(composicao.preparoId, id)));
      }
    }
  });
}

async function preparoEstaReferenciadoOracle(id: number): Promise<boolean> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { itensOrcamento, itensEventoConfirmados } = await import("@/db/schema/orcamentos");
  const [a, b] = await Promise.all([
    db.select({ id: itensOrcamento.id }).from(itensOrcamento).where(eq(itensOrcamento.preparoId, id)).limit(1),
    db.select({ id: itensEventoConfirmados.id }).from(itensEventoConfirmados).where(eq(itensEventoConfirmados.preparoId, id)).limit(1),
  ]);
  return a.length > 0 || b.length > 0;
}

async function excluirPreparoOracle(id: number): Promise<void> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { preparos } = await import("@/db/schema/preparos");
  // composicao tem ON DELETE CASCADE no preparo; itens de orçamento/evento têm RESTRICT.
  await db.delete(preparos).where(eq(preparos.id, id));
}

export async function listarPreparos(): Promise<PreparoResumo[]> {
  if (dataSource() === "oracle") return listarPreparosOracle();
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
  if (dataSource() === "oracle") return obterPreparoComComposicaoOracle(id);
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
  if (dataSource() === "oracle") return criarPreparoOracle(dados, composicao);
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
  if (dataSource() === "oracle") return atualizarPreparoOracle(id, dados, composicao);
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
  if (dataSource() === "oracle") return preparoEstaReferenciadoOracle(id);
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
  if (dataSource() === "oracle") return excluirPreparoOracle(id);
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
