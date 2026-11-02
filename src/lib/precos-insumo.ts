import "server-only";
import { pool } from "@/lib/db";
import { precoComMargem, type CanalCompra, type FontePreco } from "@/lib/precos-opcoes";

/**
 * Fornecedores e histórico de preços (tabelas e colunas da migration 0011).
 *
 * Toda leitura devolve `null` quando a migration ainda não foi aplicada (tabela ou
 * coluna inexistente): as telas de insumo continuam funcionando sem o histórico.
 *
 * O preço do histórico é o bruto do fornecedor; `insumos.preco` (com a margem interna
 * de 10-15%, docs/DECISOES.md) não é alterado por nada daqui.
 *
 * Linhas de cotação `rascunho` ou `descartada` nunca entram em leitura de preço.
 */

/** undefined_table / undefined_column: a migration 0011 ainda não está no banco. */
function migracaoPendente(erro: unknown): boolean {
  const codigo = (erro as { code?: string })?.code;
  return codigo === "42P01" || codigo === "42703";
}

async function seMigrado<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (erro) {
    if (migracaoPendente(erro)) return null;
    throw erro;
  }
}

/** Só linhas avulsas ou de cotação aprovada. Usar com `h` = historico_precos e `c` = cotacoes. */
const FILTRO_VALIDO = `(h.cotacao_id IS NULL OR c.status = 'aprovada')`;

export type FornecedorOpcao = { id: number; nome: string; ativo: boolean };

export type Fornecedor = FornecedorOpcao & {
  telefone: string | null;
  observacoes: string | null;
};

export type FornecedorResumo = FornecedorOpcao & {
  itens: number;
  ultimaObservacao: string | null;
};

export type OrigemPrecoInsumo = {
  fornecedorPrincipalId: number | null;
  canal: CanalCompra | null;
  fontePreco: FontePreco | null;
  /** "AAAA-MM-DD" no fuso da equipe. */
  precoAtualizadoEm: string | null;
};

export type PrecoObservado = {
  id: number;
  insumoId: number | null;
  insumoNome: string | null;
  insumoUnidade: string | null;
  fornecedorId: number | null;
  fornecedorNome: string | null;
  nomeNoFornecedor: string | null;
  unidadeFornecedor: string | null;
  preco: number;
  fonte: FontePreco;
  observadoEm: string;
  urlFonte: string | null;
};

type LinhaPreco = Omit<PrecoObservado, "preco" | "observadoEm"> & { preco: string; observadoEm: string | Date };

const SELECT_PRECO = `
  h.id, h.insumo_id AS "insumoId", i.nome AS "insumoNome", i.unidade AS "insumoUnidade",
  h.fornecedor_id AS "fornecedorId", f.nome AS "fornecedorNome",
  h.nome_no_fornecedor AS "nomeNoFornecedor", h.unidade_fornecedor AS "unidadeFornecedor",
  h.preco, h.fonte, h.observado_em::text AS "observadoEm", h.url_fonte AS "urlFonte"`;

const FROM_PRECO = `
  FROM historico_precos h
  LEFT JOIN cotacoes c ON c.id = h.cotacao_id
  LEFT JOIN insumos i ON i.id = h.insumo_id
  LEFT JOIN fornecedores f ON f.id = h.fornecedor_id`;

function paraPreco(r: LinhaPreco): PrecoObservado {
  return { ...r, preco: Number(r.preco), observadoEm: String(r.observadoEm).slice(0, 10) };
}

/**
 * Último preço de cada item de cada fornecedor. "Item" = insumo ligado + nome no fornecedor:
 * "Picanha 1" e "Picanha 2" do mesmo fornecedor aparecem separados.
 */
const ULTIMO_POR_ITEM = `
  SELECT DISTINCT ON (h.fornecedor_id, h.insumo_id, lower(coalesce(h.nome_no_fornecedor, '')))
  ${SELECT_PRECO}
  ${FROM_PRECO}`;
const ORDEM_ULTIMO_POR_ITEM = `
  ORDER BY h.fornecedor_id, h.insumo_id, lower(coalesce(h.nome_no_fornecedor, '')), h.observado_em DESC, h.id DESC`;

// ---------- Fornecedores ----------

export async function listarFornecedoresOpcoes(): Promise<FornecedorOpcao[] | null> {
  return seMigrado(async () => {
    const { rows } = await pool.query<FornecedorOpcao>(
      `SELECT id, nome, ativo FROM fornecedores ORDER BY ativo DESC, nome`,
    );
    return rows;
  });
}

export async function listarFornecedores(): Promise<FornecedorResumo[] | null> {
  return seMigrado(async () => {
    const { rows } = await pool.query<FornecedorResumo & { itens: string }>(
      `SELECT f.id, f.nome, f.ativo,
              count(DISTINCT (h.insumo_id, lower(coalesce(h.nome_no_fornecedor, ''))))
                FILTER (WHERE h.id IS NOT NULL) AS itens,
              max(h.observado_em)::text AS "ultimaObservacao"
         FROM fornecedores f
         LEFT JOIN (
           SELECT h.* FROM historico_precos h LEFT JOIN cotacoes c ON c.id = h.cotacao_id WHERE ${FILTRO_VALIDO}
         ) h ON h.fornecedor_id = f.id
        GROUP BY f.id
        ORDER BY f.ativo DESC, f.nome`,
    );
    return rows.map((r) => ({ ...r, itens: Number(r.itens) }));
  });
}

export async function obterFornecedor(id: number): Promise<Fornecedor | null> {
  return (
    (await seMigrado(async () => {
      const { rows } = await pool.query<Fornecedor>(
        `SELECT id, nome, telefone, observacoes, ativo FROM fornecedores WHERE id = $1`,
        [id],
      );
      return rows[0] ?? null;
    })) ?? null
  );
}

export type DadosFornecedor = { nome: string; telefone: string | null; observacoes: string | null; ativo: boolean };

/** Nome repetido (ignorando maiúsculas e espaços) devolve erro em vez de duplicar. */
export async function criarFornecedor(dados: DadosFornecedor): Promise<{ id: number } | { erro: string }> {
  const repetido = await pool.query(`SELECT 1 FROM fornecedores WHERE lower(trim(nome)) = lower(trim($1))`, [dados.nome]);
  if (repetido.rowCount) return { erro: `Já existe um fornecedor chamado "${dados.nome}".` };
  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO fornecedores (nome, telefone, observacoes, ativo) VALUES ($1, $2, $3, $4) RETURNING id`,
      [dados.nome, dados.telefone, dados.observacoes, dados.ativo],
    );
    return { id: rows[0].id };
  } catch (erro) {
    if ((erro as { code?: string }).code === "23505") return { erro: `Já existe um fornecedor chamado "${dados.nome}".` };
    throw erro;
  }
}

export async function atualizarFornecedor(id: number, dados: DadosFornecedor): Promise<{ ok: true } | { erro: string }> {
  const repetido = await pool.query(
    `SELECT 1 FROM fornecedores WHERE lower(trim(nome)) = lower(trim($1)) AND id <> $2`,
    [dados.nome, id],
  );
  if (repetido.rowCount) return { erro: `Já existe outro fornecedor chamado "${dados.nome}".` };
  try {
    await pool.query(
      `UPDATE fornecedores SET nome = $2, telefone = $3, observacoes = $4, ativo = $5 WHERE id = $1`,
      [id, dados.nome, dados.telefone, dados.observacoes, dados.ativo],
    );
  } catch (erro) {
    if ((erro as { code?: string }).code === "23505") return { erro: `Já existe outro fornecedor chamado "${dados.nome}".` };
    throw erro;
  }
  return { ok: true };
}

/** Último preço de cada item do fornecedor, em ordem alfabética. */
export async function ultimosPrecosDoFornecedor(fornecedorId: number): Promise<PrecoObservado[] | null> {
  return seMigrado(async () => {
    const { rows } = await pool.query<LinhaPreco>(
      `SELECT * FROM (${ULTIMO_POR_ITEM} WHERE h.fornecedor_id = $1 AND ${FILTRO_VALIDO} ${ORDEM_ULTIMO_POR_ITEM}) t
        ORDER BY lower(coalesce(t."nomeNoFornecedor", t."insumoNome", ''))`,
      [fornecedorId],
    );
    return rows.map(paraPreco);
  });
}

// ---------- Comparação ----------

/**
 * Último preço de cada item de cada fornecedor cujo nome no fornecedor ou insumo ligado
 * contém a busca. Itens sem fornecedor não entram (não há o que comparar).
 */
export async function compararPrecos(busca: string): Promise<PrecoObservado[] | null> {
  return seMigrado(async () => {
    const padrao = `%${busca.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const { rows } = await pool.query<LinhaPreco>(
      `SELECT * FROM (${ULTIMO_POR_ITEM}
          WHERE h.fornecedor_id IS NOT NULL AND ${FILTRO_VALIDO}
            AND (h.nome_no_fornecedor ILIKE $1 OR i.nome ILIKE $1)
          ${ORDEM_ULTIMO_POR_ITEM}) t
        ORDER BY t."fornecedorNome", t.preco`,
      [padrao],
    );
    return rows.map(paraPreco);
  });
}

// ---------- Insumo ----------

export type PrecosDoInsumo = {
  origem: OrigemPrecoInsumo;
  /** Último preço de cada fornecedor (e de cada nome que ele usa), do menor para o maior. */
  porFornecedor: PrecoObservado[];
  /** Tudo, do mais recente para o mais antigo (até 50). */
  historico: PrecoObservado[];
};

export async function obterPrecosDoInsumo(insumoId: number): Promise<PrecosDoInsumo | null> {
  return seMigrado(async () => {
    const [origem, porFornecedor, historico] = await Promise.all([
      pool.query<OrigemPrecoInsumo>(
        `SELECT fornecedor_principal_id AS "fornecedorPrincipalId", canal, fonte_preco AS "fontePreco",
                to_char(preco_atualizado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS "precoAtualizadoEm"
           FROM insumos WHERE id = $1`,
        [insumoId],
      ),
      pool.query<LinhaPreco>(
        `SELECT * FROM (${ULTIMO_POR_ITEM}
            WHERE h.insumo_id = $1 AND h.fornecedor_id IS NOT NULL AND ${FILTRO_VALIDO}
            ${ORDEM_ULTIMO_POR_ITEM}) t
          ORDER BY t.preco, t."observadoEm" DESC`,
        [insumoId],
      ),
      pool.query<LinhaPreco>(
        `SELECT ${SELECT_PRECO} ${FROM_PRECO}
          WHERE h.insumo_id = $1 AND ${FILTRO_VALIDO}
          ORDER BY h.observado_em DESC, h.id DESC
          LIMIT 50`,
        [insumoId],
      ),
    ]);
    return {
      origem: origem.rows[0] ?? { fornecedorPrincipalId: null, canal: null, fontePreco: null, precoAtualizadoEm: null },
      porFornecedor: porFornecedor.rows.map(paraPreco),
      historico: historico.rows.map(paraPreco),
    };
  });
}

/**
 * Fornecedor principal e canal do insumo. Com `precoMudou`, marca a fonte como "manual"
 * e a data de atualização como agora (o preço foi digitado na tela do insumo).
 */
export async function atualizarOrigemInsumo(
  insumoId: number,
  dados: { fornecedorPrincipalId: number | null; canal: CanalCompra | null },
  precoMudou: boolean,
): Promise<void> {
  await pool.query(
    `UPDATE insumos
        SET fornecedor_principal_id = $2,
            canal = $3,
            fonte_preco = CASE WHEN $4 THEN 'manual' ELSE fonte_preco END,
            preco_atualizado_em = CASE WHEN $4 THEN now() ELSE preco_atualizado_em END
      WHERE id = $1`,
    [insumoId, dados.fornecedorPrincipalId, dados.canal, precoMudou],
  );
}

export type DadosRegistroPreco = {
  insumoId: number;
  fornecedorId: number | null;
  nomeNoFornecedor: string | null;
  preco: number;
  fonte: FontePreco;
  observadoEm: string;
  urlFonte: string | null;
};

/** Registro avulso (sem cotação): nota fiscal, pesquisa, Ceasa ou digitação. Não mexe em `insumos.preco`. */
export async function registrarPreco(dados: DadosRegistroPreco, usuarioId: number): Promise<void> {
  await pool.query(
    `INSERT INTO historico_precos
       (insumo_id, fornecedor_id, nome_no_fornecedor, preco, fonte, observado_em, url_fonte, registrado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      dados.insumoId,
      dados.fornecedorId,
      dados.nomeNoFornecedor,
      dados.preco,
      dados.fonte,
      dados.observadoEm,
      dados.urlFonte,
      usuarioId,
    ],
  );
}

export type OrigemResumo = {
  fornecedorNome: string | null;
  canal: CanalCompra | null;
  fontePreco: FontePreco | null;
  /** "AAAA-MM-DD" no fuso da equipe. */
  atualizadoEm: string | null;
};

/** Origem do preço de todos os insumos, para a lista de /insumos. `null` = migration pendente. */
export async function listarOrigensInsumos(): Promise<Map<number, OrigemResumo> | null> {
  return seMigrado(async () => {
    const { rows } = await pool.query<OrigemResumo & { id: number }>(
      `SELECT i.id, f.nome AS "fornecedorNome", i.canal, i.fonte_preco AS "fontePreco",
              to_char(i.preco_atualizado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS "atualizadoEm"
         FROM insumos i
         LEFT JOIN fornecedores f ON f.id = i.fornecedor_principal_id`,
    );
    return new Map(rows.map(({ id, ...r }) => [id, r]));
  });
}

/**
 * Leva um preço do histórico para o cadastro do insumo: `preco` = bruto + 10 % (precoComMargem),
 * `fonte_preco` = fonte da linha e `preco_atualizado_em` = dia em que o preço foi observado
 * (a idade do preço é a da informação, não a do clique). Só aceita linha do próprio insumo,
 * avulsa ou de cotação aprovada.
 */
export async function aplicarPrecoAoInsumo(
  insumoId: number,
  historicoId: number,
): Promise<{ preco: number } | { erro: string }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ preco: string; fonte: FontePreco; observadoEm: string }>(
      `SELECT h.preco, h.fonte, h.observado_em::text AS "observadoEm"
         FROM historico_precos h
         LEFT JOIN cotacoes c ON c.id = h.cotacao_id
        WHERE h.id = $1 AND h.insumo_id = $2 AND ${FILTRO_VALIDO}`,
      [historicoId, insumoId],
    );
    const linha = rows[0];
    if (!linha) {
      await client.query("ROLLBACK");
      return { erro: "Esse preço não pertence a este insumo ou não está aprovado." };
    }
    const preco = precoComMargem(Number(linha.preco));
    await client.query(
      `UPDATE insumos
          SET preco = $2, fonte_preco = $3,
              preco_atualizado_em = ($4::date)::timestamp AT TIME ZONE 'America/Sao_Paulo'
        WHERE id = $1`,
      [insumoId, preco, linha.fonte, linha.observadoEm],
    );
    await client.query("COMMIT");
    return { preco };
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}
