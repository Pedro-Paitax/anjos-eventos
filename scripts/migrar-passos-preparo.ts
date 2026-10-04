/**
 * Migração de dados: estrutura `preparos.modo_preparo` (texto livre) em
 * `preparos.passos` (JSONB), sem alterar `modo_preparo`.
 *
 * Regra (Pedro, 2026-09-27):
 * - Se o texto tem numeração explícita ("1.", "2.", "1)"...) no início de
 *   cada linha, quebra em um elemento do array por marcador numerado.
 * - Se for texto em bloco único (sem numeração), gera um único elemento.
 * - Se vazio/nulo, gera array vazio — nunca inventa um passo.
 * - `tempo_estimado_min` sempre null nesta migração automática (o texto
 *   original não tem tempo por passo isolado — não haveria como derivar
 *   isso sem inventar).
 *
 * Amostragem real dos 54 preparos (feita antes de escrever este script,
 * via SELECT direto) confirmou: 0 vazios, 40 numerados (padrão
 * consistente "N. texto" por linha, `\n` ou `\r\n`), 14 em bloco único.
 * Um caso (id 11) usa numeração para FASES, não passos atômicos — fica
 * marcado como atípico no relatório em vez de tratado com lógica
 * especial não pedida.
 */
import { Pool } from "pg";
import { writeFileSync } from "fs";
import { passosPreparoSchema, type PassosPreparo } from "../src/lib/passos-preparo";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function splitPassos(modoPreparo: string | null): PassosPreparo {
  const texto = (modoPreparo ?? "").replace(/\r\n/g, "\n").trim();
  if (!texto) return [];

  const temNumeracao = /^\d+[.)]\s/.test(texto);
  if (!temNumeracao) {
    return [{ ordem: 1, descricao: texto, tempo_estimado_min: null }];
  }

  const partes = texto.split(/\n(?=\d+[.)]\s)/);
  return partes.map((parte, i) => ({
    ordem: i + 1,
    descricao: parte.replace(/^\d+[.)]\s*/, "").trim(),
    tempo_estimado_min: null,
  }));
}

type LinhaPreparo = { id: number; nome_preparo: string; modo_preparo: string | null };

function ehAtipico(linha: LinhaPreparo, passos: PassosPreparo): string | null {
  const texto = (linha.modo_preparo ?? "").trim();
  if (!texto) return "modo_preparo vazio — passos gerado como array vazio.";
  if (passos.length === 1 && texto.split(/\s+/).length <= 2) {
    return `modo_preparo parece um rótulo/categoria ("${texto}"), não instruções de preparo reais.`;
  }
  if (passos.length >= 2 && passos.some((p) => p.descricao.length > 600)) {
    return "numeração encontrada marca FASES longas (cada uma com múltiplos sub-passos em texto corrido), não passos atômicos — revisar granularidade manualmente.";
  }
  return null;
}

async function main() {
  const { rows } = await pool.query<LinhaPreparo>(
    "SELECT id, nome_preparo, modo_preparo FROM preparos ORDER BY id"
  );

  const relatorioLinhas: string[] = [];
  const atipicos: string[] = [];
  relatorioLinhas.push("# Relatório de migração — modo_preparo → passos JSONB");
  relatorioLinhas.push("");
  relatorioLinhas.push(`Gerado em ${new Date().toISOString()}. Total de preparos: ${rows.length}.`);
  relatorioLinhas.push("");
  relatorioLinhas.push(
    "Revisão pendente do Pedro: nenhuma aprovação item a item foi feita antes de gravar — os dados abaixo já foram escritos em `passos`. `modo_preparo` continua sendo a fonte oficial até 100% dos preparos serem aprovados."
  );
  relatorioLinhas.push("");

  const client = await pool.connect();
  let migrados = 0;
  try {
    await client.query("BEGIN");
    for (const linha of rows) {
      const passos = splitPassos(linha.modo_preparo);
      passosPreparoSchema.parse(passos); // fail-fast se o schema não bater

      await client.query("UPDATE preparos SET passos = $1 WHERE id = $2", [
        JSON.stringify(passos),
        linha.id,
      ]);
      migrados++;

      const atipico = ehAtipico(linha, passos);
      if (atipico) atipicos.push(`- **#${linha.id} ${linha.nome_preparo}** — ${atipico}`);

      relatorioLinhas.push(`## #${linha.id} — ${linha.nome_preparo}`);
      relatorioLinhas.push("");
      relatorioLinhas.push("**modo_preparo original:**");
      relatorioLinhas.push("");
      relatorioLinhas.push("```");
      relatorioLinhas.push(linha.modo_preparo ?? "(vazio)");
      relatorioLinhas.push("```");
      relatorioLinhas.push("");
      relatorioLinhas.push("**passos gerado:**");
      relatorioLinhas.push("");
      relatorioLinhas.push("```json");
      relatorioLinhas.push(JSON.stringify(passos, null, 2));
      relatorioLinhas.push("```");
      relatorioLinhas.push("");
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const cabecalhoAtipicos = [
    "## Casos atípicos — revisar primeiro",
    "",
    atipicos.length > 0 ? atipicos.join("\n") : "Nenhum caso atípico adicional identificado.",
    "",
    "---",
    "",
  ];
  relatorioLinhas.splice(5, 0, ...cabecalhoAtipicos);

  writeFileSync("scripts/relatorio-migracao-passos.md", relatorioLinhas.join("\n"), "utf8");
  console.log(`Migrados: ${migrados}/${rows.length}. Atípicos: ${atipicos.length}.`);
  console.log("Relatório: scripts/relatorio-migracao-passos.md");
  await pool.end();
}

main().catch((e) => {
  console.error("ERRO na migração de dados:", e);
  process.exit(1);
});
