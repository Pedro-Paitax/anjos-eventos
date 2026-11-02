import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Integração com Postgres REAL e DESCARTÁVEL (migrações até a 0011 aplicadas).
 * Só roda com TEST_DATABASE_URL apontando para um banco cujo nome termina em "_teste"
 * e igual a DATABASE_URL; nunca use o banco de desenvolvimento ou de produção.
 */
const URL_TESTE = process.env.TEST_DATABASE_URL ?? "";
const seguro = /\/[^/?]*_teste(\?|$)/.test(URL_TESTE) && URL_TESTE === process.env.DATABASE_URL;

describe.skipIf(!seguro)("histórico de preços — integração", () => {
  let lib: typeof import("./precos-insumo");
  let pool: typeof import("@/lib/db").pool;
  let usuario: number;
  let picanha: number;
  let arroz: number;
  let fornA: number;
  let fornB: number;
  let fornC: number;

  beforeAll(async () => {
    lib = await import("./precos-insumo");
    pool = (await import("@/lib/db")).pool;
    await pool.query(
      "TRUNCATE historico_precos, cotacoes, fornecedores, composicao, insumos, usuarios RESTART IDENTITY CASCADE",
    );
    usuario = (await pool.query("INSERT INTO usuarios (nome) VALUES ('Teste') RETURNING id")).rows[0].id;
    const ins = async (nome: string, unidade: string, preco: number) =>
      (await pool.query("INSERT INTO insumos (nome, unidade, preco, fator_correcao) VALUES ($1, $2, $3, 1) RETURNING id", [nome, unidade, preco])).rows[0].id as number;
    picanha = await ins("Picanha", "KG", 99);
    arroz = await ins("Arroz", "KG", 7);
    const forn = async (nome: string) => {
      const r = await lib.criarFornecedor({ nome, telefone: null, observacoes: null, ativo: true });
      if ("erro" in r) throw new Error(r.erro);
      return r.id;
    };
    fornA = await forn("Fornecedor A");
    fornB = await forn("Fornecedor B");
    fornC = await forn("Fornecedor C");
  });

  afterAll(async () => {
    await pool?.end();
  });

  const reg = (insumoId: number, fornecedorId: number | null, nome: string | null, preco: number, dia: string) =>
    lib.registrarPreco(
      { insumoId, fornecedorId, nomeNoFornecedor: nome, preco, fonte: "nota_fiscal", observadoEm: dia, urlFonte: null },
      usuario,
    );

  it("não deixa duplicar fornecedor por maiúscula ou espaço", async () => {
    const r = await lib.criarFornecedor({ nome: "  fornecedor a ", telefone: null, observacoes: null, ativo: true });
    expect(r).toEqual({ erro: expect.stringContaining("Já existe") });
  });

  it("usa o último preço de cada item e separa itens do mesmo fornecedor", async () => {
    await reg(picanha, fornA, "Picanha 1", 95, "2026-10-01");
    await reg(picanha, fornA, "Picanha 1", 92, "2026-10-20"); // mais recente vence
    await reg(picanha, fornA, "Picanha 2", 89, "2026-10-20");
    await reg(picanha, fornB, "Picanha 2", 87.5, "2026-10-25");
    await reg(picanha, fornC, "Picanha 3", 101, "2026-10-28");
    await reg(arroz, fornA, null, 6.2, "2026-10-28");

    const doInsumo = await lib.obterPrecosDoInsumo(picanha);
    expect(doInsumo!.porFornecedor.map((p) => [p.fornecedorNome, p.nomeNoFornecedor, p.preco])).toEqual([
      ["Fornecedor B", "Picanha 2", 87.5],
      ["Fornecedor A", "Picanha 2", 89],
      ["Fornecedor A", "Picanha 1", 92],
      ["Fornecedor C", "Picanha 3", 101],
    ]);
    expect(doInsumo!.historico).toHaveLength(5);
    expect(doInsumo!.historico[0].observadoEm).toBe("2026-10-28");

    const comp = await lib.compararPrecos("picanha");
    expect(comp!.map((p) => `${p.fornecedorNome}|${p.nomeNoFornecedor}|${p.preco}`)).toEqual([
      "Fornecedor A|Picanha 2|89",
      "Fornecedor A|Picanha 1|92",
      "Fornecedor B|Picanha 2|87.5",
      "Fornecedor C|Picanha 3|101",
    ]);
    // Busca pelo nome do insumo ligado também encontra item sem nome no fornecedor.
    expect((await lib.compararPrecos("arr"))!.map((p) => p.insumoNome)).toEqual(["Arroz"]);
    // Curinga do LIKE digitado pelo usuário é literal.
    expect(await lib.compararPrecos("%")).toEqual([]);
  });

  it("ignora cotações em rascunho e descartadas", async () => {
    const cot = (status: string) =>
      pool.query(
        "INSERT INTO cotacoes (fornecedor_id, data_cotacao, origem, status) VALUES ($1, '2026-11-01', 'pdf_ia', $2) RETURNING id",
        [fornC, status],
      );
    for (const status of ["rascunho", "descartada"]) {
      const id = (await cot(status)).rows[0].id;
      await pool.query(
        "INSERT INTO historico_precos (insumo_id, fornecedor_id, cotacao_id, nome_no_fornecedor, preco, fonte, observado_em) VALUES ($1, $2, $3, 'Picanha 3', 1, 'cotacao_pdf', '2026-11-01')",
        [picanha, fornC, id],
      );
    }
    const doInsumo = await lib.obterPrecosDoInsumo(picanha);
    expect(doInsumo!.porFornecedor.find((p) => p.fornecedorNome === "Fornecedor C")!.preco).toBe(101);
    const lista = await lib.listarFornecedores();
    expect(lista!.find((f) => f.id === fornC)).toMatchObject({ itens: 1, ultimaObservacao: "2026-10-28" });

    const aprovada = (await cot("aprovada")).rows[0].id;
    await pool.query(
      "INSERT INTO historico_precos (insumo_id, fornecedor_id, cotacao_id, nome_no_fornecedor, preco, fonte, observado_em) VALUES (NULL, $1, $2, 'PICANHA 3 KG', 80, 'cotacao_pdf', '2026-11-01')",
      [fornC, aprovada],
    );
    const doFornecedor = await lib.ultimosPrecosDoFornecedor(fornC);
    expect(doFornecedor!.map((p) => [p.nomeNoFornecedor, p.insumoId])).toEqual([
      ["Picanha 3", picanha],
      ["PICANHA 3 KG", null],
    ]);
  });

  it("origem do insumo: fonte manual e data só quando o preço muda", async () => {
    await lib.atualizarOrigemInsumo(arroz, { fornecedorPrincipalId: fornA, canal: "atacado" }, false);
    let o = (await lib.obterPrecosDoInsumo(arroz))!.origem;
    expect(o).toMatchObject({ fornecedorPrincipalId: fornA, canal: "atacado", fontePreco: null, precoAtualizadoEm: null });

    await lib.atualizarOrigemInsumo(arroz, { fornecedorPrincipalId: null, canal: "varejo" }, true);
    o = (await lib.obterPrecosDoInsumo(arroz))!.origem;
    expect(o.fontePreco).toBe("manual");
    expect(o.precoAtualizadoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const origens = await lib.listarOrigensInsumos();
    expect(origens!.get(arroz)).toMatchObject({ canal: "varejo", fornecedorNome: null, fontePreco: "manual" });
    expect(origens!.get(picanha)).toMatchObject({ canal: null, fontePreco: null });
  });

  it("sem as tabelas/colunas da 0011, as leituras devolvem null (a tela não quebra)", async () => {
    await pool.query("ALTER TABLE historico_precos RENAME TO historico_precos_x");
    await pool.query("ALTER TABLE insumos RENAME COLUMN canal TO canal_x");
    try {
      expect(await lib.obterPrecosDoInsumo(picanha)).toBeNull();
      expect(await lib.compararPrecos("picanha")).toBeNull();
      expect(await lib.listarFornecedores()).toBeNull();
      expect(await lib.listarOrigensInsumos()).toBeNull();
    } finally {
      await pool.query("ALTER TABLE historico_precos_x RENAME TO historico_precos");
      await pool.query("ALTER TABLE insumos RENAME COLUMN canal_x TO canal");
    }
  });

  it("usar no cadastro: preço + 10 %, fonte e data da observação; recusa linha de outro insumo", async () => {
    const linha = (await lib.obterPrecosDoInsumo(picanha))!.porFornecedor[0]; // 87,50 do Fornecedor B
    expect(await lib.aplicarPrecoAoInsumo(picanha, linha.id)).toEqual({ preco: 96.25 });
    const { rows } = await pool.query("SELECT preco FROM insumos WHERE id = $1", [picanha]);
    expect(Number(rows[0].preco)).toBe(96.25);
    expect((await lib.obterPrecosDoInsumo(picanha))!.origem).toMatchObject({
      fontePreco: "nota_fiscal",
      precoAtualizadoEm: "2026-10-25",
    });
    expect(await lib.aplicarPrecoAoInsumo(arroz, linha.id)).toEqual({ erro: expect.any(String) });
  });

  it("CHECK do banco barra canal e fonte fora da lista", async () => {
    await expect(pool.query("UPDATE insumos SET canal = 'feira' WHERE id = $1", [arroz])).rejects.toThrow();
    await expect(
      pool.query("INSERT INTO historico_precos (insumo_id, preco, fonte, observado_em) VALUES ($1, 1, 'chute', '2026-11-01')", [arroz]),
    ).rejects.toThrow();
  });
});
