import "server-only";
import { pool } from "@/lib/db";
import { enviarDocumento } from "@/lib/whatsapp-worker";
import { numerosFamilia, workerConectado } from "@/lib/automacao-whatsapp";
import { hojeNaEquipe } from "@/lib/precos-opcoes";
import {
  consolidarAlteracoes,
  diaDaEquipe,
  gerarResumoPrecosPdf,
  legendaResumoPrecos,
  type AlteracaoPendente,
  type InsumoTabela,
} from "@/lib/precos-resumo-pdf";

/**
 * Resumo diário de preços pelo WhatsApp (decisão do Pedro, 2026-11-04): uma vez por dia, se algum
 * preço de insumo mudou desde o último resumo, sai um PDF (o que mudou + tabela completa) para cada
 * número da família (FAMILIA_WHATSAPP_NUMEROS). Disparado pelo crontab via /api/cron/precos-resumo.
 *
 * As mudanças vêm de alteracoes_preco_insumo (gatilho da migration 0013). As linhas só são marcadas
 * como enviadas se pelo menos um envio der certo; se todos falharem, entram no resumo do dia seguinte.
 */

export type ResultadoResumoPrecos =
  | { ok: true; mudancas: 0 }
  | { ok: true; mudancas: number; enviados: number; falhas: number }
  | { ok: false; motivo: "destinatarios_nao_configurados" | "worker_desconectado" | "migracao_pendente" | "todos_os_envios_falharam" };

async function alteracoesPendentes(): Promise<AlteracaoPendente[]> {
  const { rows } = await pool.query<Omit<AlteracaoPendente, "alteradoEm"> & { alteradoEm: Date }>(
    `SELECT a.id, a.insumo_id AS "insumoId", i.nome, i.unidade::text AS unidade,
            a.preco_anterior::float AS "precoAnterior", a.preco_novo::float AS "precoNovo",
            a.alterado_em AS "alteradoEm"
       FROM alteracoes_preco_insumo a JOIN insumos i ON i.id = a.insumo_id
      WHERE a.enviado_em IS NULL
      ORDER BY a.alterado_em, a.id`,
  );
  return rows.map((r) => ({ ...r, alteradoEm: new Date(r.alteradoEm).toISOString() }));
}

/**
 * Todos os insumos com o preço atual e a origem. Fornecedor = o da linha do histórico que gerou o preço
 * atual (mesmo dia e bruto + 10 % = preço de cadastro); linhas só de referência (ex.: CEASA) não batem.
 */
async function tabelaCompleta(): Promise<InsumoTabela[]> {
  const { rows } = await pool.query<InsumoTabela>(
    `SELECT i.id AS "insumoId", i.nome, i.unidade::text AS unidade, i.preco::float AS preco, i.fonte_preco AS fonte,
            to_char(i.preco_atualizado_em AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS "atualizadoEm",
            u.fornecedor
       FROM insumos i
       LEFT JOIN LATERAL (
         SELECT f.nome AS fornecedor
           FROM historico_precos h
           JOIN fornecedores f ON f.id = h.fornecedor_id
           LEFT JOIN cotacoes c ON c.id = h.cotacao_id
          WHERE h.insumo_id = i.id
            AND (h.cotacao_id IS NULL OR c.status = 'aprovada')
            AND h.observado_em = (i.preco_atualizado_em AT TIME ZONE 'America/Sao_Paulo')::date
            AND round(h.preco * 1.1, 2) = i.preco
          ORDER BY h.id DESC
          LIMIT 1
       ) u ON true
      ORDER BY lower(i.nome)`,
  );
  return rows;
}

async function marcarEnviadas(ids: number[]): Promise<void> {
  await pool.query(
    `UPDATE alteracoes_preco_insumo SET enviado_em = now() WHERE id = ANY($1::int[]) AND enviado_em IS NULL`,
    [ids],
  );
}

function nomeArquivo(hoje: string): string {
  return `precos-insumos-${hoje}.pdf`;
}

export async function executarResumoPrecos(agora: Date = new Date()): Promise<ResultadoResumoPrecos> {
  const numeros = numerosFamilia();
  if (numeros.length === 0) {
    console.error("[precos-resumo] FAMILIA_WHATSAPP_NUMEROS não configurado.");
    return { ok: false, motivo: "destinatarios_nao_configurados" };
  }

  let pendentes: AlteracaoPendente[];
  try {
    pendentes = await alteracoesPendentes();
  } catch (erro) {
    const codigo = (erro as { code?: string }).code;
    if (codigo === "42P01" || codigo === "42703") return { ok: false, motivo: "migracao_pendente" };
    throw erro;
  }
  const { mudancas, idsConsumidos } = consolidarAlteracoes(pendentes);
  if (mudancas.length === 0) {
    // Só idas e voltas ao mesmo preço: nada a contar, mas não voltam amanhã.
    if (idsConsumidos.length) await marcarEnviadas(idsConsumidos);
    return { ok: true, mudancas: 0 };
  }

  if (!(await workerConectado("resumo de preços"))) return { ok: false, motivo: "worker_desconectado" };

  const hoje = hojeNaEquipe(agora);
  const datas = pendentes.map((p) => diaDaEquipe(p.alteradoEm)).sort();
  const dados = {
    mudancas,
    tabela: await tabelaCompleta(),
    periodo: { de: datas[0], ate: datas[datas.length - 1] },
    hoje,
    geradoEm: new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(agora),
  };
  const pdf = await gerarResumoPrecosPdf(dados);
  const legenda = legendaResumoPrecos(dados);

  // Um de cada vez: a fila do worker espaça os envios (src/lib/whatsapp-worker.ts).
  let enviados = 0;
  let falhas = 0;
  for (const numero of numeros) {
    try {
      await enviarDocumento(numero, nomeArquivo(hoje), pdf, legenda);
      enviados++;
    } catch (erro) {
      falhas++;
      // Nunca o número: só o texto do erro.
      console.error(`[precos-resumo] falha ao enviar: ${(erro as Error).message}`);
    }
  }
  if (enviados === 0) return { ok: false, motivo: "todos_os_envios_falharam" };
  await marcarEnviadas(idsConsumidos);
  return { ok: true, mudancas: mudancas.length, enviados, falhas };
}
