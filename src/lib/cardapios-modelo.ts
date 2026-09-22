import "server-only";
import { exigirToken, nocodbDelete, nocodbGet, nocodbPatch, nocodbPost } from "@/lib/nocodb";
import { dataSource } from "@/lib/data-source";

// IDs de tabela/campo confirmados via /api/v2/meta (base Senhor_Churrasco_DB,
// mesmo base do NocoDB usado por Preparos/Insumos) — ver docs/DECISOES.md,
// seção "Cardápios Pré-Montados (Senhor Churrasco)".
const TABELA_CARDAPIOS_MODELO = "muwzzmniceu6umv";
const TABELA_CARDAPIO_MODELO_ITENS = "mv4p70wqf1iihe8";

// Cardapios_Modelo.Cardapio_Modelo_Itens (hm, pra listar os itens de um cardápio).
const CAMPO_LINK_ITENS = "c4zoyckd0saty1z";

type CardapioModeloRegistro = {
  Id: number;
  Nome: string;
  Descricao: string | null;
  Preco_Fixo_Por_Pessoa: number | null;
  Cardapio_Modelo_Itens: number;
};
type ItemLinkRegistro = { Id: number };
type ItemRegistroCompleto = {
  Id: number;
  Preparo: { Id: number; "Nome Do Preparo": string } | null;
};

export type CardapioModeloResumo = {
  id: number;
  nome: string;
  descricao: string | null;
  precoFixoPorPessoa: number | null;
  quantidadeItens: number;
};

export type CardapioModeloItemExistente = {
  id: number;
  preparoId: number;
  preparoNome: string;
};

export type CardapioModeloDetalhado = CardapioModeloResumo & {
  itens: CardapioModeloItemExistente[];
};

export type DadosCardapioModelo = {
  nome: string;
  descricao: string | null;
};

// --- DATA_SOURCE=oracle (Drizzle). Leituras validadas por equivalência; as
// escritas NÃO foram validadas contra banco (ver docs/PENDENCIAS_NOTURNAS.md). ---

const num = (v: string | null) => (v == null ? null : Number(v));

async function listarCardapiosModeloOracle(): Promise<CardapioModeloResumo[]> {
  const { db } = await import("@/db/client");
  const { eq, sql } = await import("drizzle-orm");
  const { cardapiosModelo, cardapioModeloItens } = await import("@/db/schema/catalogo-complementar");
  const linhas = await db
    .select({
      id: cardapiosModelo.id,
      nome: cardapiosModelo.nome,
      descricao: cardapiosModelo.descricao,
      preco: cardapiosModelo.precoFixoPorPessoa,
      quantidadeItens: sql<number>`count(${cardapioModeloItens.id})::int`,
    })
    .from(cardapiosModelo)
    .leftJoin(cardapioModeloItens, eq(cardapioModeloItens.cardapioModeloId, cardapiosModelo.id))
    .groupBy(cardapiosModelo.id);
  return linhas
    .map((r) => ({
      id: r.id,
      nome: r.nome,
      descricao: r.descricao,
      precoFixoPorPessoa: num(r.preco),
      quantidadeItens: r.quantidadeItens,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

async function obterCardapioModeloComItensOracle(id: number): Promise<CardapioModeloDetalhado | null> {
  const { db } = await import("@/db/client");
  const { eq, asc } = await import("drizzle-orm");
  const { cardapiosModelo, cardapioModeloItens } = await import("@/db/schema/catalogo-complementar");
  const { preparos } = await import("@/db/schema/preparos");
  const [cardapio] = await db.select().from(cardapiosModelo).where(eq(cardapiosModelo.id, id));
  if (!cardapio) return null;
  const itens = await db
    .select({ id: cardapioModeloItens.id, preparoId: cardapioModeloItens.preparoId, preparoNome: preparos.nomePreparo })
    .from(cardapioModeloItens)
    .innerJoin(preparos, eq(cardapioModeloItens.preparoId, preparos.id))
    .where(eq(cardapioModeloItens.cardapioModeloId, id))
    .orderBy(asc(cardapioModeloItens.id));
  return {
    id: cardapio.id,
    nome: cardapio.nome,
    descricao: cardapio.descricao,
    precoFixoPorPessoa: num(cardapio.precoFixoPorPessoa),
    quantidadeItens: itens.length,
    itens,
  };
}

async function criarCardapioModeloOracle(dados: DadosCardapioModelo, preparoIds: number[]): Promise<number> {
  const { db } = await import("@/db/client");
  const { cardapiosModelo, cardapioModeloItens } = await import("@/db/schema/catalogo-complementar");
  return db.transaction(async (tx) => {
    const [criado] = await tx
      .insert(cardapiosModelo)
      .values({ nome: dados.nome, descricao: dados.descricao })
      .returning({ id: cardapiosModelo.id });
    if (preparoIds.length) {
      await tx.insert(cardapioModeloItens).values(preparoIds.map((preparoId) => ({ cardapioModeloId: criado.id, preparoId })));
    }
    return criado.id;
  });
}

async function atualizarCardapioModeloOracle(id: number, dados: DadosCardapioModelo, preparoIds: number[]): Promise<void> {
  const { db } = await import("@/db/client");
  const { and, eq, notInArray } = await import("drizzle-orm");
  const { cardapiosModelo, cardapioModeloItens } = await import("@/db/schema/catalogo-complementar");
  await db.transaction(async (tx) => {
    await tx.update(cardapiosModelo).set({ nome: dados.nome, descricao: dados.descricao }).where(eq(cardapiosModelo.id, id));
    const atuais = await tx
      .select({ preparoId: cardapioModeloItens.preparoId })
      .from(cardapioModeloItens)
      .where(eq(cardapioModeloItens.cardapioModeloId, id));
    if (preparoIds.length) {
      await tx
        .delete(cardapioModeloItens)
        .where(and(eq(cardapioModeloItens.cardapioModeloId, id), notInArray(cardapioModeloItens.preparoId, preparoIds)));
    } else {
      await tx.delete(cardapioModeloItens).where(eq(cardapioModeloItens.cardapioModeloId, id));
    }
    const existentes = new Set(atuais.map((a) => a.preparoId));
    const novos = preparoIds.filter((p) => !existentes.has(p));
    if (novos.length) {
      await tx.insert(cardapioModeloItens).values(novos.map((preparoId) => ({ cardapioModeloId: id, preparoId })));
    }
  });
}

async function excluirCardapioModeloOracle(id: number): Promise<void> {
  const { db } = await import("@/db/client");
  const { eq } = await import("drizzle-orm");
  const { cardapiosModelo } = await import("@/db/schema/catalogo-complementar");
  // cardapio_modelo_itens tem ON DELETE CASCADE no cardápio pai.
  await db.delete(cardapiosModelo).where(eq(cardapiosModelo.id, id));
}

export async function listarCardapiosModelo(): Promise<CardapioModeloResumo[]> {
  if (dataSource() === "oracle") return listarCardapiosModeloOracle();
  const token = exigirToken();
  const resposta = await nocodbGet<{ list: CardapioModeloRegistro[] }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/records?limit=1000`,
    token
  );
  return (resposta?.list ?? [])
    .map((r) => ({
      id: r.Id,
      nome: r.Nome,
      descricao: r.Descricao,
      precoFixoPorPessoa: r.Preco_Fixo_Por_Pessoa,
      quantidadeItens: r.Cardapio_Modelo_Itens,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterCardapioModeloComItens(
  id: number
): Promise<CardapioModeloDetalhado | null> {
  if (dataSource() === "oracle") return obterCardapioModeloComItensOracle(id);
  const token = exigirToken();

  const cardapio = await nocodbGet<CardapioModeloRegistro>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/records/${id}`,
    token
  );
  if (!cardapio) return null;

  const itensLinks = await nocodbGet<{ list: ItemLinkRegistro[] }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/links/${CAMPO_LINK_ITENS}/records/${id}?limit=1000`,
    token
  );

  const itens = await Promise.all(
    (itensLinks?.list ?? []).map(async (link) => {
      const registro = await nocodbGet<ItemRegistroCompleto>(
        `/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records/${link.Id}`,
        token
      );
      if (!registro?.Preparo) return null;
      return {
        id: registro.Id,
        preparoId: registro.Preparo.Id,
        preparoNome: registro.Preparo["Nome Do Preparo"],
      };
    })
  );

  return {
    id: cardapio.Id,
    nome: cardapio.Nome,
    descricao: cardapio.Descricao,
    precoFixoPorPessoa: cardapio.Preco_Fixo_Por_Pessoa,
    quantidadeItens: cardapio.Cardapio_Modelo_Itens,
    itens: itens.filter((i): i is CardapioModeloItemExistente => i !== null),
  };
}

export async function criarCardapioModelo(
  dados: DadosCardapioModelo,
  preparoIds: number[]
): Promise<number> {
  if (dataSource() === "oracle") return criarCardapioModeloOracle(dados, preparoIds);
  const token = exigirToken();

  const criado = await nocodbPost<{ Id: number }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/records`,
    { Nome: dados.nome, Descricao: dados.descricao },
    token
  );

  for (const preparoId of preparoIds) {
    await nocodbPost(
      `/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records`,
      { Cardapio_Modelo: { Id: criado.Id }, Preparo: { Id: preparoId } },
      token
    );
  }

  return criado.Id;
}

export async function atualizarCardapioModelo(
  id: number,
  dados: DadosCardapioModelo,
  preparoIds: number[]
): Promise<void> {
  if (dataSource() === "oracle") return atualizarCardapioModeloOracle(id, dados, preparoIds);
  const token = exigirToken();

  await nocodbPatch(
    `/tables/${TABELA_CARDAPIOS_MODELO}/records`,
    { Id: id, Nome: dados.nome, Descricao: dados.descricao },
    token
  );

  const itensLinksAtuais = await nocodbGet<{ list: ItemLinkRegistro[] }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/links/${CAMPO_LINK_ITENS}/records/${id}?limit=1000`,
    token
  );

  const itensAtuais = await Promise.all(
    (itensLinksAtuais?.list ?? []).map((link) =>
      nocodbGet<ItemRegistroCompleto>(
        `/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records/${link.Id}`,
        token
      )
    )
  );

  const preparoIdsMantidos = new Set(preparoIds);
  for (const item of itensAtuais) {
    if (!item?.Preparo) continue;
    if (!preparoIdsMantidos.has(item.Preparo.Id)) {
      await nocodbDelete(
        `/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records`,
        { Id: item.Id },
        token
      );
    }
  }

  const preparoIdsExistentes = new Set(
    itensAtuais.filter((i) => i?.Preparo).map((i) => i!.Preparo!.Id)
  );
  for (const preparoId of preparoIds) {
    if (!preparoIdsExistentes.has(preparoId)) {
      await nocodbPost(
        `/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records`,
        { Cardapio_Modelo: { Id: id }, Preparo: { Id: preparoId } },
        token
      );
    }
  }
}

export async function excluirCardapioModelo(id: number): Promise<void> {
  if (dataSource() === "oracle") return excluirCardapioModeloOracle(id);
  const token = exigirToken();

  const itensLinks = await nocodbGet<{ list: ItemLinkRegistro[] }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/links/${CAMPO_LINK_ITENS}/records/${id}?limit=1000`,
    token
  );
  for (const link of itensLinks?.list ?? []) {
    await nocodbDelete(`/tables/${TABELA_CARDAPIO_MODELO_ITENS}/records`, { Id: link.Id }, token);
  }

  await nocodbDelete(`/tables/${TABELA_CARDAPIOS_MODELO}/records`, { Id: id }, token);
}
