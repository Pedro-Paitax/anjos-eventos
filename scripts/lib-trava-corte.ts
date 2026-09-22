/**
 * Travas do modo truncate+reload do ETL (docs/CHECKLIST_CORTE_PRODUCAO.md,
 * Fase B, passo 4). Lógica PURA (sem I/O, sem conexão) pra poder ser testada
 * — quem chama passa os fatos (argv, env, data, estado do backup).
 *
 * O modo é "só Dia do Corte": apaga e recarrega o catálogo no Oracle. Só
 * escreve se TODAS as travas passarem; qualquer uma faltando recusa.
 */

/**
 * Tabelas que o truncate+reload esvazia e recarrega — exatamente as carregadas
 * por scripts/etl-nocodb-para-postgres.ts e scripts/etl-tabelas-complementares.ts.
 * NUNCA inclui: usuarios, contratos, eventos (copiados à parte no Dia do
 * Corte) nem empresas (só lida como referência). O TRUNCATE não usa CASCADE:
 * se alguma tabela fora desta lista referenciar uma daqui, o Postgres recusa
 * e a transação inteira volta atrás.
 */
export const TABELAS_TRUNCATE_RELOAD = [
  "insumos",
  "macro_categorias",
  "headers_ui",
  "preparos",
  "composicao",
  "header_preparo",
  "orcamentos",
  "itens_orcamento",
  "itens_evento_confirmados",
  "hierarquia_proteina",
  "configuracoes_globais",
  "cardapios_modelo",
  "cardapio_modelo_itens",
  "orcamento_itens_adicionais",
] as const;

export const TABELAS_PROIBIDAS_NO_TRUNCATE = ["usuarios", "contratos", "eventos", "empresas"] as const;

/** Idade máxima do último backup OK pra permitir o truncate (backup diário 03:30 + folga). */
export const IDADE_MAXIMA_BACKUP_HORAS = 26;

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo — o "dia do corte" é o dia do Pedro, não UTC. */
export function dataHojeSaoPaulo(agora: Date): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

export type EntradaTrava = {
  argv: string[];
  env: Record<string, string | undefined>;
  agora: Date;
  ipOracle: string;
  /** Conteúdo de ultimo-status.txt do backup (null = arquivo ausente). */
  backupStatus: string | null;
  /** Idade do arquivo de status em horas (null = desconhecida). */
  backupIdadeHoras: number | null;
};

export type ResultadoTrava = { ok: true } | { ok: false; motivos: string[] };

/** Só decide sobre ESCREVER (--write). O dry-run do modo nunca chega aqui: só lê. */
export function avaliarTravasTruncateReload(e: EntradaTrava): ResultadoTrava {
  const motivos: string[] = [];
  const hoje = dataHojeSaoPaulo(e.agora);

  if (!e.argv.includes("--confirmo-producao")) {
    motivos.push("falta a flag explícita --confirmo-producao");
  }
  if (!e.env.DIA_DO_CORTE) {
    motivos.push(`falta a variável de ambiente DIA_DO_CORTE=${hoje} (a data de hoje)`);
  } else if (e.env.DIA_DO_CORTE !== hoje) {
    motivos.push(`DIA_DO_CORTE="${e.env.DIA_DO_CORTE}" não é hoje (${hoje}) — esta trava só abre no Dia do Corte real`);
  }
  if (!e.argv.includes(`--confirmo-banco=${e.ipOracle}`)) {
    motivos.push(`falta digitar o banco alvo: --confirmo-banco=${e.ipOracle}`);
  }
  if (e.backupStatus === null) {
    motivos.push("sem registro de backup (ultimo-status.txt ausente) — o ponto de retorno é pré-requisito do truncate");
  } else if (!e.backupStatus.trimStart().startsWith("OK")) {
    motivos.push("o último backup registrado NÃO está OK — corrija o backup antes de truncar");
  } else if (e.backupIdadeHoras === null || e.backupIdadeHoras > IDADE_MAXIMA_BACKUP_HORAS) {
    motivos.push(`o último backup OK tem mais de ${IDADE_MAXIMA_BACKUP_HORAS}h (ou idade desconhecida) — rode o backup de novo antes de truncar`);
  }

  return motivos.length === 0 ? { ok: true } : { ok: false, motivos };
}
