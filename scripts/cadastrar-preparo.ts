/**
 * Cadastra fichas técnicas (Preparo + Composição + Header_UI + Insumos novos) a partir de
 * um arquivo JSON, direto no Postgres de produção. Usado pelo comando /cadastrar-preparo.
 *
 *   npx tsx scripts/cadastrar-preparo.ts --referencia
 *       Lista preparos já cadastrados, headers (com macro e teto), insumos (unidade, preço, fator) e fornecedores.
 *   npx tsx scripts/cadastrar-preparo.ts --preparo "Fraldinha"
 *       Mostra a ficha de um preparo existente no formato do arquivo (ponto de partida das versões).
 *   npx tsx scripts/cadastrar-preparo.ts fichas-preparo/arquivo.json
 *       SIMULAÇÃO (padrão): valida tudo e mostra o resumo de revisão. Não grava nada.
 *   npx tsx scripts/cadastrar-preparo.ts fichas-preparo/arquivo.json --gravar
 *       Grava, em UMA transação para o arquivo inteiro (erro em qualquer ficha = nada gravado).
 *
 * Só grava depois que o Pedro aprovar o resumo da simulação. Nunca altera insumo existente
 * (preço, fator e nome ficam como estão) e nunca cria preparo com nome que já existe.
 * Insumo novo: preço de cadastro = bruto do fornecedor + 10 %; o bruto vai para o histórico
 * de preços (se pesquisado) com fonte, link e data. Preço estimado entra sem data.
 * Formato do arquivo e regras: scripts/lib-cadastro-preparo.ts e .claude/commands/cadastrar-preparo.md.
 *
 * Testes em banco descartável: --banco-teste (DATABASE_URL precisa terminar em "_teste").
 */
import { readFileSync, existsSync } from "fs";
import { Pool, type PoolClient } from "pg";
import { precoComMargem, formatarReais } from "../src/lib/precos-opcoes";
import {
  custoLinha,
  errosLegiveis,
  fichaSchema,
  modoPreparoDosPassos,
  normalizarNome,
  tituloInsumo,
  type Ficha,
} from "./lib-cadastro-preparo";

function carregarEnv(caminho: string) {
  if (!existsSync(caminho)) return;
  for (const linha of readFileSync(caminho, "utf8").split("\n")) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const igual = l.indexOf("=");
    if (igual === -1) continue;
    const chave = l.slice(0, igual).trim();
    if (!(chave in process.env)) process.env[chave] = l.slice(igual + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const args = process.argv.slice(2);
const gravar = args.includes("--gravar");
const referencia = args.includes("--referencia");
const bancoTeste = args.includes("--banco-teste");
const idxPreparo = args.indexOf("--preparo");
const nomePreparo = idxPreparo >= 0 ? args[idxPreparo + 1] : undefined;
const arquivo = args.find((a, i) => !a.startsWith("--") && (idxPreparo < 0 || i !== idxPreparo + 1));

// .env antes de .env.local: a DATABASE_URL do Oracle está no .env (mesma ordem dos ETLs).
carregarEnv(".env");
carregarEnv(".env.local");
const IP_ORACLE = "100.121.229.81";
const url = process.env.DATABASE_URL ?? "";
if (bancoTeste ? !/\/[^/?]*_teste(\?|$)/.test(url) : !url.includes(IP_ORACLE)) {
  console.error(
    bancoTeste
      ? "ABORTADO: --banco-teste exige DATABASE_URL de um banco terminado em _teste."
      : `ABORTADO: DATABASE_URL não aponta para o Oracle (${IP_ORACLE}). Rode na raiz do projeto, com o .env.`,
  );
  process.exit(1);
}
const pool = new Pool({ connectionString: url });

type InsumoBanco = { id: number; nome: string; unidade: string; preco: number | null; fator: number | null };

async function carregarReferencias(c: PoolClient | Pool) {
  const insumos = (
    await c.query<{ id: number; nome: string; unidade: string; preco: string | null; fator: string | null }>(
      `SELECT id, nome, unidade::text, preco, fator_correcao AS fator FROM insumos ORDER BY nome`,
    )
  ).rows.map((r): InsumoBanco => ({ ...r, preco: r.preco == null ? null : Number(r.preco), fator: r.fator == null ? null : Number(r.fator) }));
  const headers = (
    await c.query<{ id: number; nome: string; macro: string; teto: string; unidade: string }>(
      `SELECT h.id, h.nome_exibicao AS nome, m.nome_macro AS macro, m.capacidade_teto AS teto, m.unidade::text
         FROM headers_ui h JOIN macro_categorias m ON m.id = h.macro_categoria_id ORDER BY m.nome_macro, h.nome_exibicao`,
    )
  ).rows;
  const preparos = (await c.query<{ id: number; nome: string }>(`SELECT id, nome_preparo AS nome FROM preparos`)).rows;
  let variacoes: Map<number, number> | null = null;
  try {
    variacoes = new Map(
      (await c.query<{ p: number; b: number }>(`SELECT preparo_id AS p, base_preparo_id AS b FROM preparo_variacoes`)).rows.map((r) => [r.p, r.b]),
    );
  } catch (e) {
    if ((e as { code?: string }).code !== "42P01") throw e; // 0012 ainda não aplicada
  }
  let fornecedores: { id: number; nome: string }[] | null = null;
  try {
    fornecedores = (await c.query<{ id: number; nome: string }>(`SELECT id, nome FROM fornecedores WHERE ativo ORDER BY nome`)).rows;
  } catch (e) {
    if ((e as { code?: string }).code !== "42P01") throw e; // 0011 ainda não aplicada
  }
  return { insumos, headers, preparos, fornecedores, variacoes };
}

async function mostrarReferencia() {
  const { insumos, headers, fornecedores } = await carregarReferencias(pool);
  const preparos = (
    await pool.query<{ id: number; nome: string; categoria: string; headers: string | null }>(
      `SELECT p.id, p.nome_preparo AS nome, p.categoria::text, string_agg(h.nome_exibicao, ', ') AS headers
         FROM preparos p
         LEFT JOIN header_preparo hp ON hp.preparo_id = p.id
         LEFT JOIN headers_ui h ON h.id = hp.header_ui_id
        GROUP BY p.id ORDER BY p.categoria, p.nome_preparo`,
    )
  ).rows;
  const { variacoes } = await carregarReferencias(pool);
  const nomePorId = new Map(preparos.map((p) => [p.id, p.nome]));
  console.log(`PREPAROS JÁ CADASTRADOS (${preparos.length}) — não recadastre; nome | categoria | header [| versão de]:`);
  for (const p of preparos) {
    const base = variacoes?.get(p.id);
    console.log(`  ${p.nome} | ${p.categoria} | ${p.headers ?? "SEM HEADER (fora do cálculo)"}${base ? ` | versão de ${nomePorId.get(base)}` : ""}`);
  }
  if (!variacoes) console.log("  (versões de preparo: migração 0012 ainda não aplicada; 'variacaoDe' não pode ser usado)");
  console.log("");
  console.log("HEADERS_UI (use o nome exato em 'header'):");
  for (const h of headers) console.log(`  ${h.nome}  [macro ${h.macro}, teto ${Number(h.teto)} ${h.unidade}/pessoa]`);
  console.log(`\nINSUMOS (${insumos.length}) — nome | unidade | preço cadastrado (já com margem) | fator:`);
  for (const i of insumos) console.log(`  ${i.nome} | ${i.unidade} | ${i.preco ?? "—"} | ${i.fator ?? "—"}`);
  console.log(
    fornecedores
      ? `\nFORNECEDORES ATIVOS: ${fornecedores.map((f) => f.nome).join(", ") || "(nenhum)"}`
      : "\nFORNECEDORES: migração 0011 ainda não aplicada (insumo novo não pode ter 'fornecedor' nem entrar no histórico).",
  );
}

type Plano = {
  ficha: Ficha;
  /** Id do base quando ele já está no banco (se vier do mesmo arquivo, resolve na gravação). */
  baseExistenteId: number | null;
  headerId: number;
  headerNome: string;
  reaproveitados: { nome: string; unidade: string; preco: number | null; fator: number | null; quantidade: number; id: number }[];
  /** `dados` vazio = insumo criado por outra ficha do mesmo arquivo. */
  novos: { nome: string; quantidade: number; dados?: NonNullable<Ficha["composicao"][number]["novo"]>; fornecedorId: number | null }[];
  avisos: string[];
  custo: number;
};

type NovoNoArquivo = { ficha: string; preco: number; fator: number };

/**
 * `basesNoArquivo`: nome normalizado de cada ficha já planejada → true se ela mesma é versão
 * (versão de versão não existe).
 */
function planejar(
  bruto: unknown,
  ref: Awaited<ReturnType<typeof carregarReferencias>>,
  novosNoArquivo: Map<string, NovoNoArquivo>,
  basesNoArquivo: Map<string, boolean>,
) {
  const erros: string[] = [];
  const r = fichaSchema.safeParse(bruto);
  const nomeBruto = (bruto as { nome?: string })?.nome ?? "(sem nome)";
  if (!r.success) return { erros: errosLegiveis(r.error).map((e) => `${nomeBruto}: ${e}`) };
  const ficha = r.data;
  const prefixo = `${ficha.nome}: `;

  if (ref.preparos.some((p) => normalizarNome(p.nome) === normalizarNome(ficha.nome))) {
    erros.push(`${prefixo}já existe um preparo com esse nome (não é atualizado por aqui)`);
  }
  const header = ref.headers.find((h) => normalizarNome(h.nome) === normalizarNome(ficha.header));
  if (!header) erros.push(`${prefixo}header "${ficha.header}" não existe (veja --referencia)`);
  if (header && ficha.unidadeRendimento !== "Unidade" && header.unidade.toLowerCase() !== ficha.unidadeRendimento.toLowerCase()) {
    erros.push(`${prefixo}rendimento em ${ficha.unidadeRendimento}, mas o header "${header.nome}" mede em ${header.unidade}`);
  }

  let baseExistenteId: number | null = null;
  if (ficha.variacaoDe) {
    const alvo = normalizarNome(ficha.variacaoDe);
    const noBanco = ref.preparos.find((p) => normalizarNome(p.nome) === alvo);
    if (!ref.variacoes) erros.push(`${prefixo}'variacaoDe' exige a migração 0012 aplicada`);
    else if (noBanco) {
      if (ref.variacoes.has(noBanco.id)) erros.push(`${prefixo}"${noBanco.nome}" já é versão de outro preparo; use o preparo base`);
      else baseExistenteId = noBanco.id;
    } else if (!basesNoArquivo.has(alvo)) {
      erros.push(`${prefixo}preparo base "${ficha.variacaoDe}" não existe (cadastre o base antes, no banco ou mais acima no arquivo)`);
    } else if (basesNoArquivo.get(alvo)) {
      erros.push(`${prefixo}"${ficha.variacaoDe}" é versão de outro preparo neste arquivo; use o preparo base`);
    }
  }
  basesNoArquivo.set(normalizarNome(ficha.nome), Boolean(ficha.variacaoDe));

  const plano: Plano = { ficha, baseExistenteId, headerId: header?.id ?? 0, headerNome: header?.nome ?? "", reaproveitados: [], novos: [], avisos: [], custo: 0 };
  for (const c of ficha.composicao) {
    const existente = ref.insumos.find((i) => normalizarNome(i.nome) === normalizarNome(c.insumo));
    if (existente) {
      if (c.novo) plano.avisos.push(`"${c.insumo}" já existe como "${existente.nome}": dados de 'novo' ignorados, nada é alterado nele`);
      plano.reaproveitados.push({ ...existente, quantidade: c.quantidade });
      plano.custo += custoLinha(c.quantidade, existente.preco, existente.fator);
      continue;
    }
    const nome = tituloInsumo(c.insumo);
    const jaPlanejado = novosNoArquivo.get(normalizarNome(nome));
    if (!c.novo) {
      if (!jaPlanejado) {
        erros.push(`${prefixo}insumo "${c.insumo}" não existe; informe 'novo' com unidade, preço do fornecedor e fator`);
        continue;
      }
      // Criado por outra ficha deste mesmo arquivo: reaproveita aquele.
      plano.avisos.push(`"${nome}" é criado por outra ficha deste arquivo (${jaPlanejado.ficha}) e reaproveitado aqui`);
      plano.novos.push({ nome, quantidade: c.quantidade, dados: undefined, fornecedorId: null });
      plano.custo += custoLinha(c.quantidade, jaPlanejado.preco, jaPlanejado.fator);
      continue;
    }
    let fornecedorId: number | null = null;
    if (c.novo.fornecedor) {
      if (!ref.fornecedores) erros.push(`${prefixo}'fornecedor' exige a migração 0011 aplicada`);
      else {
        const f = ref.fornecedores.find((x) => normalizarNome(x.nome) === normalizarNome(c.novo!.fornecedor!));
        if (!f) erros.push(`${prefixo}fornecedor "${c.novo.fornecedor}" não cadastrado (cadastre em /fornecedores ou omita)`);
        else fornecedorId = f.id;
      }
    }
    if (!ref.fornecedores && !c.novo.estimado) {
      erros.push(`${prefixo}preço pesquisado de "${nome}" precisa da migração 0011 (histórico). Aplique a 0011 antes.`);
    }
    if (jaPlanejado) erros.push(`${prefixo}"${nome}" já é criado por "${jaPlanejado.ficha}" neste arquivo; aqui use só nome e quantidade`);
    else novosNoArquivo.set(normalizarNome(nome), { ficha: ficha.nome, preco: precoComMargem(c.novo.precoFornecedor), fator: c.novo.fatorCorrecao });
    plano.novos.push({ nome, quantidade: c.quantidade, dados: c.novo, fornecedorId });
    plano.custo += custoLinha(c.quantidade, precoComMargem(c.novo.precoFornecedor), c.novo.fatorCorrecao);
  }
  return erros.length ? { erros } : { plano };
}

function imprimirResumo(planos: Plano[]) {
  for (const p of planos) {
    const f = p.ficha;
    console.log(`\n=== ${f.nome} (${f.categoria} · header ${p.headerNome}${f.variacaoDe ? ` · versão de ${f.variacaoDe}` : ""}) ===`);
    console.log(
      `Rendimento ${f.rendimento} ${f.unidadeRendimento}` +
        (f.pesoMedioUnidadeG ? ` · peso médio ${f.pesoMedioUnidadeG} g/unidade` : "") +
        (f.categoria === "Carnes" ? ` · ${f.subcategoriaProteina}` : ` · peso de atratividade ${f.pesoAtratividade}`) +
        (f.porcaoMaximaIndividual ? ` · porção máxima ${f.porcaoMaximaIndividual}` : "") +
        (f.tempoPreparoMinutos ? ` · ${f.tempoPreparoMinutos} min` : "") +
        (f.tags.length ? ` · ${f.tags.join(", ")}` : "") +
        (f.apresentacaoUtensilio ? ` · ${f.apresentacaoUtensilio}` : ""),
    );
    console.log("Insumos REAPROVEITADOS (nada muda neles):");
    for (const r of p.reaproveitados) console.log(`  - ${r.nome}: ${r.quantidade} ${r.unidade} (cadastro ${formatarReais(r.preco)}, fator ${r.fator ?? "—"})`);
    if (!p.reaproveitados.length) console.log("  (nenhum)");
    console.log("Insumos NOVOS:");
    for (const n of p.novos) {
      if (!n.dados) {
        console.log(`  - ${n.nome}: ${n.quantidade} (criado por outra ficha deste arquivo)`);
        continue;
      }
      const d = n.dados;
      console.log(
        `  - ${n.nome}: ${n.quantidade} ${d.unidade} · fornecedor ${formatarReais(d.precoFornecedor)} → cadastro ${formatarReais(precoComMargem(d.precoFornecedor))} (+10%) · fator ${d.fatorCorrecao} · ` +
          (d.estimado ? "ESTIMADO (entra sem data, conferir)" : `${d.fonte}, ${d.observadoEm}${d.url ? `, ${d.url}` : ""}`) +
          (d.fornecedor ? ` · ${d.fornecedor}` : ""),
      );
    }
    if (!p.novos.length) console.log("  (nenhum)");
    console.log("Passos:");
    for (const passo of [...f.passos].sort((a, b) => a.ordem - b.ordem)) console.log(`  ${passo.ordem}. ${passo.descricao}`);
    console.log(`Custo do rendimento (preços de cadastro ÷ fator): ${formatarReais(Math.round(p.custo * 100) / 100)}`);
    for (const a of p.avisos) console.log(`  AVISO: ${a}`);
  }
}

async function gravarPlanos(c: PoolClient, planos: Plano[]) {
  const novosIds = new Map<string, number>();
  const preparosCriados = new Map<string, number>();
  for (const p of planos) {
    for (const n of p.novos) {
      if (!n.dados || novosIds.has(normalizarNome(n.nome))) continue;
      const d = n.dados;
      const temOrigem = !d.estimado;
      const { rows } = await c.query<{ id: number }>(
        temOrigem
          ? `INSERT INTO insumos (nome, unidade, preco, fator_correcao, fornecedor_principal_id, canal, fonte_preco, preco_atualizado_em)
             VALUES ($1, $2, $3, $4, $5, $6, $7, ($8::date)::timestamp AT TIME ZONE 'America/Sao_Paulo') RETURNING id`
          : `INSERT INTO insumos (nome, unidade, preco, fator_correcao) VALUES ($1, $2, $3, $4) RETURNING id`,
        temOrigem
          ? [n.nome, d.unidade, precoComMargem(d.precoFornecedor), d.fatorCorrecao, n.fornecedorId, d.canal ?? null, d.fonte, d.observadoEm]
          : [n.nome, d.unidade, precoComMargem(d.precoFornecedor), d.fatorCorrecao],
      );
      novosIds.set(normalizarNome(n.nome), rows[0].id);
      if (temOrigem) {
        await c.query(
          `INSERT INTO historico_precos (insumo_id, fornecedor_id, nome_no_fornecedor, preco, fonte, observado_em, url_fonte, observacao)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'cadastro de ficha técnica (/cadastrar-preparo)')`,
          [rows[0].id, n.fornecedorId, d.nomeNoFornecedor ?? null, d.precoFornecedor, d.fonte, d.observadoEm, d.url ?? null],
        );
      }
    }
    const f = p.ficha;
    const { rows } = await c.query<{ id: number }>(
      `INSERT INTO preparos (nome_preparo, categoria, rendimento, unidade_rendimento, apresentacao_utensilio, tags, modo_preparo,
                             passos, tempo_preparo_minutos, peso_atratividade, subcategoria_proteina, porcao_maxima_individual, peso_medio_unidade_g)
       VALUES ($1, $2, $3, $4, $5, $6::restricao_alimentar[], $7, $8::jsonb, $9, $10, $11, $12, $13) RETURNING id`,
      [
        f.nome,
        f.categoria,
        f.rendimento,
        f.unidadeRendimento,
        f.apresentacaoUtensilio,
        f.tags.length ? f.tags : null,
        modoPreparoDosPassos(f.passos),
        JSON.stringify([...f.passos].sort((a, b) => a.ordem - b.ordem)),
        f.tempoPreparoMinutos,
        f.categoria === "Carnes" ? null : f.pesoAtratividade,
        f.categoria === "Carnes" ? f.subcategoriaProteina : null,
        f.porcaoMaximaIndividual,
        f.unidadeRendimento === "Unidade" ? f.pesoMedioUnidadeG : null,
      ],
    );
    const preparoId = rows[0].id;
    for (const r of p.reaproveitados) {
      await c.query(`INSERT INTO composicao (preparo_id, insumo_id, quantidade) VALUES ($1, $2, $3)`, [preparoId, r.id, r.quantidade]);
    }
    for (const n of p.novos) {
      await c.query(`INSERT INTO composicao (preparo_id, insumo_id, quantidade) VALUES ($1, $2, $3)`, [
        preparoId,
        novosIds.get(normalizarNome(n.nome)),
        n.quantidade,
      ]);
    }
    await c.query(`INSERT INTO header_preparo (header_ui_id, preparo_id) VALUES ($1, $2)`, [p.headerId, preparoId]);
    preparosCriados.set(normalizarNome(f.nome), preparoId);
    if (f.variacaoDe) {
      const baseId = p.baseExistenteId ?? preparosCriados.get(normalizarNome(f.variacaoDe));
      if (!baseId) throw new Error(`base "${f.variacaoDe}" não resolvido para ${f.nome}`);
      await c.query(`INSERT INTO preparo_variacoes (preparo_id, base_preparo_id) VALUES ($1, $2)`, [preparoId, baseId]);
    }
    console.log(`GRAVADO: ${f.nome} (preparo id ${preparoId})`);
  }
}

/** Ficha de um preparo existente, no formato do arquivo (base para montar as versões dele). */
async function mostrarPreparo(nome: string) {
  const { rows } = await pool.query<{ id: number; nome: string }>(`SELECT id, nome_preparo AS nome FROM preparos`);
  const p = rows.find((r) => normalizarNome(r.nome) === normalizarNome(nome));
  if (!p) {
    console.error(`Preparo "${nome}" não encontrado.`);
    process.exitCode = 1;
    return;
  }
  const [prep, comp, hdr] = await Promise.all([
    pool.query(
      `SELECT nome_preparo AS nome, categoria::text, rendimento, unidade_rendimento::text AS "unidadeRendimento", tags::text[] AS tags,
              passos, tempo_preparo_minutos AS "tempoPreparoMinutos", apresentacao_utensilio AS "apresentacaoUtensilio",
              peso_atratividade AS "pesoAtratividade", subcategoria_proteina::text AS "subcategoriaProteina",
              porcao_maxima_individual AS "porcaoMaximaIndividual", peso_medio_unidade_g AS "pesoMedioUnidadeG"
         FROM preparos WHERE id = $1`,
      [p.id],
    ),
    pool.query(
      `SELECT i.nome AS insumo, c.quantidade::float AS quantidade FROM composicao c JOIN insumos i ON i.id = c.insumo_id
        WHERE c.preparo_id = $1 ORDER BY c.id`,
      [p.id],
    ),
    pool.query(`SELECT h.nome_exibicao AS nome FROM header_preparo hp JOIN headers_ui h ON h.id = hp.header_ui_id WHERE hp.preparo_id = $1`, [p.id]),
  ]);
  const r = prep.rows[0];
  const num = (v: string | null) => (v == null ? null : Number(v));
  const ficha = {
    ...r,
    header: hdr.rows[0]?.nome ?? null,
    rendimento: num(r.rendimento),
    pesoAtratividade: num(r.pesoAtratividade),
    porcaoMaximaIndividual: num(r.porcaoMaximaIndividual),
    pesoMedioUnidadeG: num(r.pesoMedioUnidadeG),
    tags: r.tags ?? [],
    passos: r.passos ?? [],
    composicao: comp.rows,
  };
  console.log(JSON.stringify(ficha, null, 2));
}

async function principal() {
  if (referencia) return mostrarReferencia();
  if (nomePreparo) return mostrarPreparo(nomePreparo);
  if (!arquivo) {
    console.error("Uso: npx tsx scripts/cadastrar-preparo.ts <arquivo.json> [--gravar] | --referencia");
    process.exitCode = 1;
    return;
  }
  const conteudo = JSON.parse(readFileSync(arquivo, "utf8"));
  const fichas: unknown[] = Array.isArray(conteudo) ? conteudo : [conteudo];

  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    // Trava entre execuções concorrentes (duas abas do Claude Code não criam o mesmo preparo duas vezes).
    await c.query("SELECT pg_advisory_xact_lock(hashtext('cadastrar-preparo'))");
    const ref = await carregarReferencias(c);
    const novosNoArquivo = new Map<string, NovoNoArquivo>();
    const basesNoArquivo = new Map<string, boolean>();
    const nomesNoArquivo = new Set<string>();
    const planos: Plano[] = [];
    const erros: string[] = [];
    for (const f of fichas) {
      const nome = normalizarNome((f as { nome?: string })?.nome ?? "");
      if (nomesNoArquivo.has(nome)) erros.push(`${(f as { nome?: string }).nome}: aparece duas vezes no arquivo`);
      nomesNoArquivo.add(nome);
      const r = planejar(f, ref, novosNoArquivo, basesNoArquivo);
      if ("erros" in r) erros.push(...(r.erros ?? []));
      else planos.push(r.plano);
    }
    if (erros.length) {
      await c.query("ROLLBACK");
      console.error(`NADA GRAVADO. ${erros.length} problema(s):`);
      for (const e of erros) console.error(`  - ${e}`);
      process.exitCode = 1;
      return;
    }
    imprimirResumo(planos);
    if (!gravar) {
      await c.query("ROLLBACK");
      console.log(`\nSIMULAÇÃO: ${planos.length} ficha(s) válida(s), nada gravado. Depois da aprovação do Pedro, rode de novo com --gravar.`);
      return;
    }
    await gravarPlanos(c, planos);
    await c.query("COMMIT");
    console.log(`\nOK: ${planos.length} ficha(s) gravada(s) numa transação.`);
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    console.error(`ERRO, nada gravado: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    c.release();
  }
}

principal().finally(() => pool.end());
