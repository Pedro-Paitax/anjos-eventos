/**
 * ETL do DIA DO CORTE — modo truncate + reload (docs/CHECKLIST_CORTE_PRODUCAO.md,
 * Fase B, passo 4). Esvazia e recarrega, numa TRANSAÇÃO ÚNICA, todas as tabelas
 * de catálogo carregadas pelos dois ETLs (lista em scripts/lib-trava-corte.ts).
 * NÃO toca em usuarios, contratos, eventos nem empresas.
 *
 * SÓ PARA O DIA DO CORTE REAL. Nunca rodar em sessão de dev/teste. O dry-run
 * (padrão) só lê e mostra o que truncaria/recarregaria. Para escrever exige
 * TODAS estas travas (senão recusa e sai com código != 0 ANTES de conectar
 * em qualquer coisa que escreva):
 *   1. --write --confirmo-producao
 *   2. DIA_DO_CORTE=<YYYY-MM-DD de hoje, fuso São Paulo> no ambiente
 *   3. --confirmo-banco=100.121.229.81 (digitar o alvo)
 *   4. backup recente: ultimo-status.txt (scripts/backup-pg-oracle.sh) = OK e
 *      com menos de 26h (ponto de retorno é pré-requisito do truncate)
 *
 * Uso (dry-run, seguro em qualquer dia):
 *   npx tsx scripts/etl-corte-producao.ts
 * Uso (Dia do Corte, após o checklist até o passo 3):
 *   DIA_DO_CORTE=2026-10-05 npx tsx scripts/etl-corte-producao.ts \
 *     --write --confirmo-producao --confirmo-banco=100.121.229.81
 *
 * Ordem: valida tudo (NocoDB só leitura) → TRUNCATE (sem CASCADE: se alguma
 * tabela fora da lista referenciar uma da lista, o Postgres recusa e tudo
 * volta atrás) → recarga → COMMIT → setval das sequences (não transacional,
 * por isso depois do commit).
 */
import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  TABELAS_TRUNCATE_RELOAD,
  avaliarTravasTruncateReload,
} from "./lib-trava-corte";

const IP_ORACLE = "100.121.229.81";
const ESCREVER = process.argv.includes("--write");

function lerStatusBackup(): { status: string | null; idadeHoras: number | null } {
  const arquivo = process.env.BACKUP_STATUS_FILE ?? join(homedir(), "backups-anjos-eventos", "ultimo-status.txt");
  try {
    const status = readFileSync(arquivo, "utf8");
    const idadeHoras = (Date.now() - statSync(arquivo).mtimeMs) / 3_600_000;
    return { status, idadeHoras };
  } catch {
    return { status: null, idadeHoras: null };
  }
}

async function main() {
  console.log(
    ESCREVER
      ? "MODO: TRUNCATE + RELOAD (escrita real) — só Dia do Corte"
      : "MODO: dry-run do truncate+reload (nada é truncado nem escrito)"
  );

  // Travas ANTES de importar os ETLs (que criam o pool) e de qualquer consulta.
  if (ESCREVER) {
    const backup = lerStatusBackup();
    const veredito = avaliarTravasTruncateReload({
      argv: process.argv.slice(2),
      env: process.env,
      agora: new Date(),
      ipOracle: IP_ORACLE,
      backupStatus: backup.status,
      backupIdadeHoras: backup.idadeHoras,
    });
    if (!veredito.ok) {
      console.error("RECUSADO: o truncate+reload só roda no Dia do Corte real, com todas as travas. Nada foi tocado.");
      for (const m of veredito.motivos) console.error(`  - ${m}`);
      process.exit(2);
    }
  }

  const etl1 = await import("./etl-nocodb-para-postgres");
  const etl2 = await import("./etl-tabelas-complementares");

  try {
    const p1 = await etl1.preparar();
    const p2 = await etl2.preparar({
      ignorarNaoVazias: true,
      preparoIds: new Set(p1.preparoIds),
      orcamentoIds: new Set(p1.orcamentoIds),
    });

    const erros = [...p1.erros, ...p2.erros];
    const avisos = [...p1.avisos, ...p2.avisos];
    const linhas: Record<string, number> = { ...p1.linhas, ...p2.linhas };

    console.log("\n=== TRUNCATE + RELOAD — por tabela (linhas hoje no Oracle -> linhas após a recarga) ===");
    for (const t of TABELAS_TRUNCATE_RELOAD) {
      const { rows } = await etl1.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
      console.log(`  ${t.padEnd(28)} ${String(rows[0].n).padStart(5)} -> ${String(linhas[t] ?? "?").padStart(5)}`);
    }
    if (avisos.length) {
      console.log("\n=== AVISOS (registros pulados, não bloqueiam) ===");
      for (const a of avisos) console.log(`  [${a.tabela} #${a.registroId}] ${a.motivo}`);
    }
    if (erros.length) {
      console.log("\n=== ERROS (bloqueiam a escrita) ===");
      for (const e of erros) console.log(`  [${e.tabela} #${e.registroId}] ${e.motivo}`);
    }

    if (!ESCREVER) {
      console.log("\nDry-run — nada truncado, nada escrito. Para o Dia do Corte, veja o cabeçalho deste arquivo.");
      return;
    }
    if (erros.length > 0) {
      console.log(`\nABORTADO: ${erros.length} erro(s). Nada foi truncado nem escrito.`);
      process.exitCode = 1;
      return;
    }

    console.log("\nIniciando TRUNCATE + recarga em transação única...");
    const { sql } = await import("drizzle-orm");
    await etl1.db.transaction(async (tx) => {
      await tx.execute(sql.raw(`TRUNCATE TABLE ${TABELAS_TRUNCATE_RELOAD.join(", ")} RESTART IDENTITY`));
      await p1.gravar(tx);
      await p2.gravar(tx as unknown as Parameters<typeof p2.gravar>[0]);
    });
    console.log("Transação commitada.");

    for (const t of [...p1.tabelasComSerial, ...p2.tabelasComSerial]) {
      await etl1.pool.query(
        `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1), (SELECT MAX(id) FROM ${t}) IS NOT NULL)`
      );
    }
    console.log("Sequences resincronizadas.");

    let divergiu = false;
    for (const t of TABELAS_TRUNCATE_RELOAD) {
      const { rows } = await etl1.pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${t}`);
      if (rows[0].n !== linhas[t]) {
        console.error(`DIVERGÊNCIA pós-carga em ${t}: esperado ${linhas[t]}, encontrado ${rows[0].n}`);
        divergiu = true;
      }
    }
    if (divergiu) process.exitCode = 1;
    else console.log("Contagens pós-carga conferem com o esperado.");
  } finally {
    await etl1.pool.end();
    await etl2.pool.end();
  }
}

main().catch((e) => {
  console.error("ERRO FATAL:", e?.cause?.message ?? e?.message ?? e);
  process.exit(1);
});
