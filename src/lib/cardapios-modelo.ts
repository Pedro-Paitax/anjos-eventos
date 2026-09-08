import "server-only";
import { exigirToken, nocodbDelete, nocodbGet, nocodbPatch, nocodbPost } from "@/lib/nocodb";

// IDs de tabela/campo confirmados via /api/v2/meta (base Senhor_Churrasco_DB,
// mesmo base do NocoDB usado por Preparos/Insumos) — ver docs/DECISOES.md,
// seção "Cardápios Pré-Montados (Senhor Churrasco)".
const TABELA_CARDAPIOS_MODELO = "muwzzmniceu6umv";
const TABELA_CARDAPIO_MODELO_ITENS = "mv4p70wqf1iihe8";

// Cardapios_Modelo.Cardapio_Modelo_Itens (hm, pra listar os itens de um cardápio).
const CAMPO_LINK_ITENS = "c4zoyckd0saty1z";

type CardapioModeloRegistro = { Id: number; Nome: string; Descricao: string | null };
type ItemLinkRegistro = { Id: number };
type ItemRegistroCompleto = {
  Id: number;
  Preparo: { Id: number; "Nome Do Preparo": string } | null;
};

export type CardapioModeloResumo = {
  id: number;
  nome: string;
  descricao: string | null;
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

export async function listarCardapiosModelo(): Promise<CardapioModeloResumo[]> {
  const token = exigirToken();
  const resposta = await nocodbGet<{ list: CardapioModeloRegistro[] }>(
    `/tables/${TABELA_CARDAPIOS_MODELO}/records?limit=1000`,
    token
  );
  return (resposta?.list ?? [])
    .map((r) => ({ id: r.Id, nome: r.Nome, descricao: r.Descricao }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function obterCardapioModeloComItens(
  id: number
): Promise<CardapioModeloDetalhado | null> {
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
    itens: itens.filter((i): i is CardapioModeloItemExistente => i !== null),
  };
}

export async function criarCardapioModelo(
  dados: DadosCardapioModelo,
  preparoIds: number[]
): Promise<number> {
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
