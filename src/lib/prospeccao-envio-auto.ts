import "server-only";
import { pool } from "@/lib/db";
import {
  emTransacao,
  listarEvidencias,
  listarLeads,
  obterLead,
  travarLead,
  type Resultado,
} from "@/lib/prospeccao";
import { configuracaoGemini, gerarMensagemGemini } from "@/lib/prospeccao-ia";
import { OBJETIVO_PADRAO, fatosPersonalizaveis } from "@/lib/prospeccao-mensagem";
import { statusAposInteracao, type StatusLead } from "@/lib/prospeccao-opcoes";
import {
  LIMITE_DIARIO_MAXIMO,
  MAX_TENTATIVAS,
  classificarFalhaWorker,
  decidirRodada,
  liberacaoValida,
  motivoLeadNaoElegivel,
  telefoneParaEnvio,
  type ConfigEnvio,
} from "@/lib/prospeccao-envio";
import { ErroWorker, enviarTexto, statusWorker } from "@/lib/whatsapp-worker";

/**
 * Envio automático de WhatsApp da prospecção (migration 0010; regras puras em
 * prospeccao-envio.ts). Decisão do Pedro em 2026-10-29: o Gemini escreve a
 * mensagem de cada lead, só a primeira (a "mensagem-modelo") passa por validação
 * humana, sem frase de saída, no máximo 10 envios por dia.
 *
 * Garantias:
 *  - Nasce desligado e só liga com uma mensagem do Gemini aprovada por uma pessoa.
 *  - No máximo UM envio por chamada do cron; teto diário contado dentro de um lock.
 *  - Nunca reenvia sozinho: falha incerta (timeout/502) vai para "conferir".
 *  - Nada de telefone, texto ou chave em log ou em `motivo`.
 */

export type ItemFila = {
  id: number;
  leadId: number;
  leadNome: string;
  estado: "pendente" | "enviando" | "enviada" | "falhou" | "cancelada" | "conferir";
  tentativas: number;
  motivo: string | null;
  mensagemId: number | null;
  createdAt: Date;
  concluidoEm: Date | null;
};

const SQL_DIA_SP = `(now() AT TIME ZONE 'America/Sao_Paulo')::date`;

type LinhaConfig = {
  ativo: boolean;
  limiteDiario: number;
  nomeRemetente: string | null;
  mensagemModeloId: number | null;
  gerador: string | null;
  canal: string | null;
  estado: string | null;
  aprovadaPor: number | null;
};

export type ConfigEnvioCompleta = ConfigEnvio & { mensagemModeloId: number | null };

export async function obterConfigEnvio(): Promise<ConfigEnvioCompleta | null> {
  const { rows } = await pool.query<LinhaConfig>(
    `SELECT c.ativo, c.limite_diario AS "limiteDiario", c.nome_remetente AS "nomeRemetente",
            c.mensagem_modelo_id AS "mensagemModeloId", m.gerador, m.canal, m.estado, m.aprovada_por AS "aprovadaPor"
       FROM prospeccao_envio_config c
       LEFT JOIN lead_mensagens m ON m.id = c.mensagem_modelo_id
      WHERE c.id = 1`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ativo: r.ativo,
    limiteDiario: r.limiteDiario,
    nomeRemetente: r.nomeRemetente,
    mensagemModeloId: r.mensagemModeloId,
    // "Aprovada" = uma pessoa aprovou (aprovada_por) e a mensagem não foi descartada depois.
    modelo: r.gerador
      ? { gerador: r.gerador, canal: r.canal ?? "", aprovada: r.aprovadaPor !== null && r.estado !== "descartada" }
      : null,
  };
}

/** Envios do dia (São Paulo): em andamento, concluídos e a conferir. */
export async function contarEnviosHoje(db: Pick<typeof pool, "query"> = pool): Promise<number> {
  const { rows } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM prospeccao_fila_envio
      WHERE estado IN ('enviando', 'enviada', 'conferir')
        AND (iniciado_em AT TIME ZONE 'America/Sao_Paulo')::date = ${SQL_DIA_SP}`,
  );
  return rows[0].n;
}

// ---------- Ações do usuário ----------

/** Liga o envio automático a partir de uma mensagem do Gemini já aprovada por uma pessoa. */
export async function ligarEnvio(
  usuarioId: number,
  mensagemId: number,
  nomeRemetente: string,
  limiteDiario: number,
): Promise<Resultado> {
  const nome = nomeRemetente.trim();
  if (!nome || nome.length > 60) return { erro: "Informe o nome que assina as mensagens (até 60 caracteres)." };
  if (!Number.isInteger(limiteDiario) || limiteDiario < 1 || limiteDiario > LIMITE_DIARIO_MAXIMO) {
    return { erro: `O limite diário vai de 1 a ${LIMITE_DIARIO_MAXIMO}.` };
  }
  const { rows } = await pool.query<{ gerador: string; canal: string; estado: string; aprovadaPor: number | null }>(
    `SELECT gerador, canal, estado, aprovada_por AS "aprovadaPor" FROM lead_mensagens WHERE id = $1`,
    [mensagemId],
  );
  const m = rows[0];
  if (!m) return { erro: "Mensagem não encontrada." };
  if (m.gerador !== "gemini" || m.canal !== "whatsapp") return { erro: "Use uma mensagem de WhatsApp gerada pelo Gemini." };
  if (m.aprovadaPor === null || m.estado === "descartada" || m.estado === "aguardando_revisao") {
    return { erro: "Essa mensagem ainda não foi aprovada por uma pessoa." };
  }
  await pool.query(
    `INSERT INTO prospeccao_envio_config (id, ativo, limite_diario, nome_remetente, mensagem_modelo_id, ligado_por, ligado_em, updated_at)
     VALUES (1, true, $1, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET ativo = true, limite_diario = $1, nome_remetente = $2,
       mensagem_modelo_id = $3, ligado_por = $4, ligado_em = now(), updated_at = now()`,
    [limiteDiario, nome, mensagemId, usuarioId],
  );
  return { ok: true };
}

export type MensagemModelo = {
  id: number;
  leadNome: string;
  conteudo: string;
  aprovadaEm: Date;
  aprovadaPorNome: string | null;
};

/** Mensagens do Gemini (WhatsApp) já aprovadas por uma pessoa: candidatas a "mensagem validada". */
export async function listarMensagensModelo(): Promise<MensagemModelo[]> {
  const { rows } = await pool.query<MensagemModelo>(
    `SELECT m.id, l.nome_comercial AS "leadNome", m.conteudo, m.aprovada_em AS "aprovadaEm", u.nome AS "aprovadaPorNome"
       FROM lead_mensagens m
       JOIN leads l ON l.id = m.lead_id
       LEFT JOIN usuarios u ON u.id = m.aprovada_por
      WHERE m.gerador = 'gemini' AND m.canal = 'whatsapp' AND m.aprovada_por IS NOT NULL AND m.estado <> 'descartada'
      ORDER BY m.aprovada_em DESC LIMIT 20`,
  );
  return rows;
}

export async function desligarEnvio(): Promise<void> {
  await pool.query(`UPDATE prospeccao_envio_config SET ativo = false, updated_at = now() WHERE id = 1`);
}

/** Candidatos: leads elegíveis que ainda não estão na fila em aberto. */
export async function listarCandidatos(): Promise<{ id: number; nomeComercial: string; municipio: string | null }[]> {
  const todos = await listarLeads();
  const { rows } = await pool.query<{ leadId: number }>(
    `SELECT lead_id AS "leadId" FROM prospeccao_fila_envio WHERE estado IN ('pendente', 'enviando', 'conferir')`,
  );
  const naFila = new Set(rows.map((r) => r.leadId));
  return todos
    .filter(
      (l) =>
        !naFila.has(l.id) &&
        !motivoLeadNaoElegivel({
          status: l.status,
          naoContatar: l.naoContatar,
          telefone: l.telefone,
          jaContatado: l.contatado,
        }),
    )
    .map((l) => ({ id: l.id, nomeComercial: l.nomeComercial, municipio: l.municipio }));
}

export async function enfileirarLead(leadId: number, usuarioId: number): Promise<Resultado> {
  const lead = await obterLead(leadId);
  if (!lead) return { erro: "Lead não encontrado." };
  const motivo = motivoLeadNaoElegivel({
    status: lead.status,
    naoContatar: lead.naoContatar,
    telefone: lead.telefone,
    jaContatado: lead.contatado,
  });
  if (motivo) return { erro: motivo };
  try {
    await pool.query(`INSERT INTO prospeccao_fila_envio (lead_id, enfileirado_por) VALUES ($1, $2)`, [leadId, usuarioId]);
  } catch (erro) {
    if ((erro as { code?: string }).code === "23505") return { erro: "Esse lead já está na fila." };
    throw erro;
  }
  return { ok: true };
}

export async function cancelarItemFila(itemId: number): Promise<Resultado> {
  const { rowCount } = await pool.query(
    `UPDATE prospeccao_fila_envio SET estado = 'cancelada', motivo = 'Cancelado por uma pessoa.', concluido_em = now()
      WHERE id = $1 AND estado = 'pendente'`,
    [itemId],
  );
  return rowCount ? { ok: true } : { erro: "Só itens pendentes podem ser cancelados." };
}

export async function listarFila(limite = 100): Promise<ItemFila[]> {
  const { rows } = await pool.query<ItemFila>(
    `SELECT f.id, f.lead_id AS "leadId", l.nome_comercial AS "leadNome", f.estado, f.tentativas, f.motivo,
            f.mensagem_id AS "mensagemId", f.created_at AS "createdAt", f.concluido_em AS "concluidoEm"
       FROM prospeccao_fila_envio f JOIN leads l ON l.id = f.lead_id
      ORDER BY f.id DESC LIMIT $1`,
    [limite],
  );
  return rows;
}

/**
 * Item "conferir": o envio pode ter acontecido. A pessoa olha o WhatsApp e informa.
 * Se enviou, o registro segue o caminho manual existente (confirmarEnvio).
 */
export async function resolverConferencia(itemId: number, enviou: boolean): Promise<{ leadId: number; mensagemId: number } | { erro: string }> {
  const { rows } = await pool.query<{ leadId: number; mensagemId: number | null }>(
    `SELECT lead_id AS "leadId", mensagem_id AS "mensagemId" FROM prospeccao_fila_envio WHERE id = $1 AND estado = 'conferir'`,
    [itemId],
  );
  const item = rows[0];
  if (!item || item.mensagemId === null) return { erro: "Item não está aguardando conferência." };
  await pool.query(
    `UPDATE prospeccao_fila_envio SET estado = $2, motivo = $3, concluido_em = now() WHERE id = $1`,
    [itemId, enviou ? "enviada" : "falhou", enviou ? "Conferido por uma pessoa: enviado." : "Conferido por uma pessoa: não enviado."],
  );
  return { leadId: item.leadId, mensagemId: item.mensagemId };
}

// ---------- Rodada do cron ----------

export type RelatorioRodada =
  | { processou: false; motivo: string }
  | { processou: true; resultado: "enviada" | "cancelada" | "adiada" | "falhou" | "conferir"; itemId: number; motivo?: string };

/** Item preso em "enviando" (processo caiu no meio) vira "conferir": pode ter sido enviado. */
async function recuperarTravados(): Promise<void> {
  await pool.query(
    `UPDATE prospeccao_fila_envio SET estado = 'conferir', motivo = 'Processo interrompido durante o envio; confira no WhatsApp.'
      WHERE estado = 'enviando' AND iniciado_em < now() - interval '15 minutes'`,
  );
}

async function reservarProximo(limite: number): Promise<{ id: number; leadId: number; tentativas: number } | null> {
  return emTransacao(async (client) => {
    // Serializa rodadas concorrentes: a contagem do dia e a reserva acontecem sob o mesmo lock.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('prospeccao_envio'))`);
    if ((await contarEnviosHoje(client)) >= limite) return null;
    const { rows } = await client.query<{ id: number; leadId: number; tentativas: number }>(
      `UPDATE prospeccao_fila_envio SET estado = 'enviando', iniciado_em = now(), tentativas = tentativas + 1
        WHERE id = (SELECT id FROM prospeccao_fila_envio WHERE estado = 'pendente' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
        RETURNING id, lead_id AS "leadId", tentativas`,
    );
    return rows[0] ?? null;
  });
}

async function finalizarItem(
  itemId: number,
  estado: ItemFila["estado"],
  motivo: string | null,
  extra: { devolver?: boolean } = {},
): Promise<void> {
  if (extra.devolver) {
    await pool.query(
      `UPDATE prospeccao_fila_envio SET estado = 'pendente', motivo = $2, iniciado_em = NULL, tentativas = GREATEST(tentativas - 1, 0)
        WHERE id = $1`,
      [itemId, motivo],
    );
    return;
  }
  await pool.query(`UPDATE prospeccao_fila_envio SET estado = $2, motivo = $3, concluido_em = now() WHERE id = $1`, [
    itemId, estado, motivo,
  ]);
}

/** Uma rodada do cron: no máximo UM lead por chamada (o espaçamento vem do crontab). */
export async function executarRodadaEnvio(agora: Date = new Date()): Promise<RelatorioRodada> {
  await recuperarTravados();

  const config = await obterConfigEnvio();
  const worker = liberacaoValida(config) ? await statusWorker() : null;
  const decisao = decidirRodada({
    config,
    workerConectado: worker?.status === "connected",
    enviadosHoje: await contarEnviosHoje(),
    agora,
  });
  if (!decisao.processar) return { processou: false, motivo: decisao.motivo };
  if (!config || !config.nomeRemetente) return { processou: false, motivo: "Envio automático sem remetente." };

  const item = await reservarProximo(Math.min(config.limiteDiario, LIMITE_DIARIO_MAXIMO));
  if (!item) return { processou: false, motivo: "Fila vazia ou limite diário atingido." };

  const lead = await obterLead(item.leadId);
  const naoElegivel = lead
    ? motivoLeadNaoElegivel({
        status: lead.status,
        naoContatar: lead.naoContatar,
        telefone: lead.telefone,
        jaContatado: lead.contatado,
      })
    : "Lead não encontrado.";
  if (!lead || naoElegivel) {
    await finalizarItem(item.id, "cancelada", naoElegivel);
    return { processou: true, resultado: "cancelada", itemId: item.id, motivo: naoElegivel ?? undefined };
  }
  const telefone = telefoneParaEnvio(lead.telefone)!;

  // 1) Gemini escreve a mensagem deste lead (só fatos verificados; sem telefone).
  const gemini = configuracaoGemini();
  if (!gemini) {
    await finalizarItem(item.id, "pendente", "IA não configurada no servidor.", { devolver: true });
    return { processou: true, resultado: "adiada", itemId: item.id, motivo: "IA não configurada." };
  }
  const fatos = fatosPersonalizaveis(await listarEvidencias(lead.id));
  const objetivo = OBJETIVO_PADRAO[lead.categoria];
  const ia = await gerarMensagemGemini(
    {
      canal: "whatsapp",
      categoria: lead.categoria,
      nomeLead: lead.nomeComercial,
      segmento: lead.segmento,
      municipio: lead.municipio,
      objetivo,
      fatos: fatos.map((f) => ({ id: f.id, fato: f.fato })),
    },
    config.nomeRemetente,
    gemini,
  );
  if ("erro" in ia) {
    if (item.tentativas >= MAX_TENTATIVAS) {
      await finalizarItem(item.id, "falhou", ia.erro);
      return { processou: true, resultado: "falhou", itemId: item.id, motivo: ia.erro };
    }
    // Mantém a tentativa gasta (conta para o limite de 3), mas libera o item para a próxima rodada.
    await pool.query(
      `UPDATE prospeccao_fila_envio SET estado = 'pendente', motivo = $2, iniciado_em = NULL WHERE id = $1`,
      [item.id, ia.erro],
    );
    return { processou: true, resultado: "adiada", itemId: item.id, motivo: ia.erro };
  }

  // 2) Grava a mensagem como "envio iniciado" ANTES de chamar o worker (rastro de auditoria).
  const mensagemId = await registrarMensagemAutomatica({
    leadId: lead.id,
    objetivo,
    conteudo: ia.conteudo,
    modelo: ia.modelo,
    fatosUsados: fatos
      .filter((f) => ia.evidenciaIds.includes(f.id))
      .map((f) => ({ evidenciaId: f.id, fato: f.fato, url: f.url })),
    itemId: item.id,
  });
  if (mensagemId === null) {
    await finalizarItem(item.id, "cancelada", "Lead foi bloqueado durante o envio.");
    return { processou: true, resultado: "cancelada", itemId: item.id, motivo: "Lead bloqueado." };
  }

  // 3) Envia pelo worker.
  try {
    await enviarTexto(telefone, ia.conteudo);
  } catch (erro) {
    const destino = classificarFalhaWorker(erro instanceof ErroWorker ? erro.status : null);
    if (destino === "tentar_depois") {
      await descartarMensagemAutomatica(mensagemId);
      await finalizarItem(item.id, "pendente", "WhatsApp desconectado; tentará de novo.", { devolver: true });
      return { processou: true, resultado: "adiada", itemId: item.id, motivo: "WhatsApp desconectado." };
    }
    if (destino === "descartar_lead") {
      await descartarMensagemAutomatica(mensagemId);
      await registrarNotaAutomatica(lead.id, "Envio automático: número sem WhatsApp.");
      await finalizarItem(item.id, "falhou", "Número sem WhatsApp.");
      return { processou: true, resultado: "falhou", itemId: item.id, motivo: "Número sem WhatsApp." };
    }
    await finalizarItem(item.id, "conferir", "Resposta incerta do WhatsApp; confira se a mensagem saiu.");
    return { processou: true, resultado: "conferir", itemId: item.id };
  }

  // 4) Enviou: registra como envio confirmado (sem pessoa: enviada_por nulo).
  await confirmarEnvioAutomatico(lead.id, lead.status, mensagemId, item.id);
  return { processou: true, resultado: "enviada", itemId: item.id };
}

async function registrarMensagemAutomatica(m: {
  leadId: number;
  objetivo: string;
  conteudo: string;
  modelo: string;
  fatosUsados: { evidenciaId: number; fato: string; url: string | null }[];
  itemId: number;
}): Promise<number | null> {
  return emTransacao(async (client) => {
    const lead = await travarLead(client, m.leadId);
    if (!lead || lead.naoContatar) return null;
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO lead_mensagens (lead_id, canal, objetivo, assunto, conteudo, estado, versao, evidencia_ids, fatos_usados, gerador, modelo, envio_iniciado_em)
       VALUES ($1, 'whatsapp', $2, NULL, $3, 'envio_iniciado',
               (SELECT COALESCE(max(versao), 0) + 1 FROM lead_mensagens WHERE lead_id = $1),
               $4, $5, 'gemini', $6, now())
       RETURNING id`,
      [m.leadId, m.objetivo, m.conteudo, m.fatosUsados.map((f) => f.evidenciaId), JSON.stringify(m.fatosUsados), m.modelo],
    );
    await client.query(`UPDATE prospeccao_fila_envio SET mensagem_id = $2 WHERE id = $1`, [m.itemId, rows[0].id]);
    return rows[0].id;
  });
}

async function descartarMensagemAutomatica(mensagemId: number): Promise<void> {
  await pool.query(`UPDATE lead_mensagens SET estado = 'descartada' WHERE id = $1 AND estado = 'envio_iniciado'`, [
    mensagemId,
  ]);
}

async function registrarNotaAutomatica(leadId: number, resumo: string): Promise<void> {
  await pool.query(`INSERT INTO lead_interacoes (lead_id, tipo, resumo) VALUES ($1, 'nota', $2)`, [leadId, resumo]);
}

/** Único caminho "sem pessoa" para `enviada`: só depois de o worker aceitar o envio. */
async function confirmarEnvioAutomatico(
  leadId: number,
  statusAntes: StatusLead,
  mensagemId: number,
  itemId: number,
): Promise<void> {
  await emTransacao(async (client) => {
    const lead = await travarLead(client, leadId);
    await client.query(`UPDATE lead_mensagens SET estado = 'enviada', enviada_em = now() WHERE id = $1`, [mensagemId]);
    await client.query(
      `INSERT INTO lead_interacoes (lead_id, mensagem_id, tipo, canal, resumo)
       VALUES ($1, $2, 'envio_confirmado', 'whatsapp', 'Envio automático pelo WhatsApp (texto do Gemini).')`,
      [leadId, mensagemId],
    );
    await client.query(`UPDATE leads SET status = COALESCE($2, status), updated_at = now() WHERE id = $1`, [
      leadId, statusAposInteracao(lead?.status ?? statusAntes, "envio_confirmado"),
    ]);
    await client.query(`UPDATE prospeccao_fila_envio SET estado = 'enviada', concluido_em = now(), motivo = NULL WHERE id = $1`, [
      itemId,
    ]);
  });
}
