import "server-only";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import type { DadosLead } from "@/lib/prospeccao-dados";
import type { IdentidadeLead } from "@/lib/prospeccao-normalizacao";
import type { DimensaoAvaliada, ResultadoQualificacao, Prioridade } from "@/lib/prospeccao-pontuacao";
import type { FatoUsado } from "@/lib/prospeccao-mensagem";
import type { FonteImportada } from "@/lib/prospeccao-csv";
import { tipoEvidenciaPorUrl } from "@/lib/prospeccao-csv";
import {
  ORIGENS_ACAO_MENSAGEM,
  STATUS_MANUAIS,
  statusAposInteracao,
  statusAposQualificacao,
  type AcaoMensagem,
  type Canal,
  type CategoriaLead,
  type CampoEvidencia,
  type Confianca,
  type EstadoMensagem,
  type NaturezaEvidencia,
  type StatusLead,
  type TipoEvidencia,
  type TipoInteracao,
  type Verificacao,
} from "@/lib/prospeccao-opcoes";

/**
 * Acesso a dados da prospecção (tabelas da migration 0008).
 * Transições de estado de mensagem e de status do lead são checadas no próprio
 * UPDATE (WHERE estado = ANY(...)): duas abas abertas não burlam o fluxo.
 */

export type Resultado = { ok: true } | { erro: string };

export type LeadResumo = {
  id: number;
  nomeComercial: string;
  categoria: CategoriaLead;
  segmento: string | null;
  municipio: string | null;
  status: StatusLead;
  naoContatar: boolean;
  site: string | null;
  telefone: string | null;
  instagram: string | null;
  email: string | null;
  origem: "manual" | "csv";
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  sinaisDemanda: string | null;
  compatibilidadeParrilla: string | null;
  updatedAt: Date;
  prioridade: Prioridade | null;
  pontuacao: number | null;
  pontuacaoMaxima: number | null;
  provisoria: boolean | null;
  completude: number | null;
  confianca: Confianca | null;
  evidencias: number;
  evidenciasVerificadas: number;
  contatado: boolean;
  respondeu: boolean;
  reuniao: boolean;
  proposta: boolean;
  convertido: boolean;
};

export type Lead = LeadResumo & {
  nomeLegal: string | null;
  endereco: string | null;
  outrosPerfis: string | null;
  responsavelComercial: string | null;
  limitacoes: string | null;
  observacoes: string | null;
  naoContatarMotivo: string | null;
  responsavelUsuarioId: number | null;
  responsavelNome: string | null;
  createdAt: Date;
};

const SELECT_LEAD = `
  SELECT l.id, l.nome_comercial AS "nomeComercial", l.categoria, l.segmento, l.municipio, l.status,
         l.nao_contatar AS "naoContatar", l.site, l.telefone, l.instagram, l.email, l.origem,
         l.proxima_acao AS "proximaAcao", l.proxima_acao_em::text AS "proximaAcaoEm",
         l.sinais_demanda AS "sinaisDemanda", l.compatibilidade_parrilla AS "compatibilidadeParrilla",
         l.updated_at AS "updatedAt",
         l.nome_legal AS "nomeLegal", l.endereco, l.outros_perfis AS "outrosPerfis",
         l.responsavel_comercial AS "responsavelComercial", l.limitacoes, l.observacoes,
         l.nao_contatar_motivo AS "naoContatarMotivo", l.responsavel_usuario_id AS "responsavelUsuarioId",
         u.nome AS "responsavelNome", l.created_at AS "createdAt",
         q.prioridade, q.pontuacao, q.pontuacao_maxima AS "pontuacaoMaxima", q.provisoria,
         q.completude, q.confianca,
         COALESCE(e.total, 0)::int AS evidencias,
         COALESCE(e.verificadas, 0)::int AS "evidenciasVerificadas",
         COALESCE(i.contatado, false) AS contatado, COALESCE(i.respondeu, false) AS respondeu,
         COALESCE(i.reuniao, false) AS reuniao, COALESCE(i.proposta, false) AS proposta,
         COALESCE(i.convertido, false) AS convertido
    FROM leads l
    LEFT JOIN usuarios u ON u.id = l.responsavel_usuario_id
    LEFT JOIN LATERAL (
      SELECT prioridade, pontuacao, pontuacao_maxima, provisoria, completude, confianca
        FROM lead_qualificacoes WHERE lead_id = l.id
       ORDER BY created_at DESC, id DESC LIMIT 1
    ) q ON true
    LEFT JOIN (
      SELECT lead_id, count(*) AS total,
             count(*) FILTER (WHERE verificacao = 'verificado' AND natureza = 'fato') AS verificadas
        FROM lead_evidencias GROUP BY lead_id
    ) e ON e.lead_id = l.id
    LEFT JOIN (
      SELECT lead_id,
             bool_or(tipo = 'envio_confirmado') AS contatado, bool_or(tipo = 'resposta') AS respondeu,
             bool_or(tipo = 'reuniao') AS reuniao, bool_or(tipo = 'proposta') AS proposta,
             bool_or(tipo = 'conversao') AS convertido
        FROM lead_interacoes GROUP BY lead_id
    ) i ON i.lead_id = l.id`;

export async function listarLeads(): Promise<Lead[]> {
  const { rows } = await pool.query<Lead>(`${SELECT_LEAD} ORDER BY l.updated_at DESC, l.id DESC`);
  return rows;
}

export async function obterLead(id: number): Promise<Lead | null> {
  const { rows } = await pool.query<Lead>(`${SELECT_LEAD} WHERE l.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function identidadesLeads(): Promise<(IdentidadeLead & { id: number })[]> {
  const { rows } = await pool.query<IdentidadeLead & { id: number }>(
    `SELECT id, nome_comercial AS "nomeComercial", municipio, site, telefone, instagram, email FROM leads`,
  );
  return rows;
}

const COLUNAS_DADOS = `nome_comercial, nome_legal, categoria, segmento, municipio, endereco, site, instagram,
  outros_perfis, telefone, email, responsavel_comercial, sinais_demanda, compatibilidade_parrilla,
  limitacoes, observacoes, nome_normalizado, dominio`;

function valoresDados(d: DadosLead) {
  return [
    d.nomeComercial, d.nomeLegal, d.categoria, d.segmento, d.municipio, d.endereco, d.site, d.instagram,
    d.outrosPerfis, d.telefone, d.email, d.responsavelComercial, d.sinaisDemanda, d.compatibilidadeParrilla,
    d.limitacoes, d.observacoes, d.nomeNormalizado, d.dominio,
  ];
}

async function inserirLead(
  db: PoolClient | typeof pool,
  dados: DadosLead,
  origem: "manual" | "csv",
  responsavelUsuarioId: number | null,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO leads (${COLUNAS_DADOS}, origem, responsavel_usuario_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
    [...valoresDados(dados), origem, responsavelUsuarioId],
  );
  return rows[0].id;
}

export async function criarLead(dados: DadosLead, responsavelUsuarioId: number | null): Promise<number> {
  return inserirLead(pool, dados, "manual", responsavelUsuarioId);
}

export async function atualizarLead(id: number, dados: DadosLead, responsavelUsuarioId: number | null): Promise<void> {
  await pool.query(
    `UPDATE leads SET (${COLUNAS_DADOS}, responsavel_usuario_id, updated_at)
       = ($2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
     WHERE id = $1`,
    [id, ...valoresDados(dados), responsavelUsuarioId],
  );
}

async function emTransacao<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}

/** Importação CSV: tudo ou nada. Linhas já validadas e deduplicadas pelo chamador. */
export async function importarLeads(
  linhas: { dados: DadosLead; fonte: FonteImportada | null }[],
  usuarioId: number,
): Promise<number> {
  return emTransacao(async (client) => {
    for (const { dados, fonte } of linhas) {
      const id = await inserirLead(client, dados, "csv", null);
      if (fonte) {
        await client.query(
          `INSERT INTO lead_evidencias (lead_id, fonte, url, consultado_em, tipo, natureza, fato, confianca, verificacao, registrado_por)
           VALUES ($1, $2, $3, $4, $5, 'fato', $6, 'media', $7, $8)`,
          [
            id, fonte.fonte, fonte.url, fonte.consultadoEm, tipoEvidenciaPorUrl(fonte.url, dados.dominio),
            fonte.fato, fonte.verificado ? "verificado" : "a_verificar", usuarioId,
          ],
        );
      }
    }
    return linhas.length;
  });
}

/** Lê o lead com trava de linha (serializa mudanças de status concorrentes). */
async function travarLead(client: PoolClient, leadId: number) {
  const { rows } = await client.query<{ status: StatusLead; naoContatar: boolean }>(
    `SELECT status, nao_contatar AS "naoContatar" FROM leads WHERE id = $1 FOR UPDATE`,
    [leadId],
  );
  return rows[0] ?? null;
}

export async function alterarStatus(leadId: number, status: StatusLead): Promise<Resultado> {
  if (!STATUS_MANUAIS.includes(status)) return { erro: "Status não pode ser escolhido manualmente." };
  const { rowCount } = await pool.query(
    `UPDATE leads SET status = $2, updated_at = now() WHERE id = $1 AND NOT nao_contatar`,
    [leadId, status],
  );
  return rowCount ? { ok: true } : { erro: "Lead marcado como não contatar: remova o bloqueio antes." };
}

export async function definirProximaAcao(leadId: number, texto: string | null, data: string | null): Promise<void> {
  await pool.query(
    `UPDATE leads SET proxima_acao = $2, proxima_acao_em = $3, updated_at = now() WHERE id = $1`,
    [leadId, texto, data],
  );
}

export async function marcarNaoContatar(leadId: number, motivo: string, usuarioId: number): Promise<void> {
  await emTransacao(async (client) => {
    await client.query(
      `UPDATE leads SET nao_contatar = true, nao_contatar_motivo = $2, status = 'nao_contatar',
              proxima_acao = NULL, proxima_acao_em = NULL, updated_at = now()
        WHERE id = $1`,
      [leadId, motivo],
    );
    await client.query(
      `INSERT INTO lead_interacoes (lead_id, tipo, resumo, usuario_id) VALUES ($1, 'nao_contatar', $2, $3)`,
      [leadId, motivo, usuarioId],
    );
    // Nenhuma mensagem pendente pode ser enviada depois do pedido.
    await client.query(
      `UPDATE lead_mensagens SET estado = 'descartada'
        WHERE lead_id = $1 AND estado IN ('aguardando_revisao', 'aprovada', 'envio_iniciado')`,
      [leadId],
    );
  });
}

export async function reativarContato(leadId: number, justificativa: string, usuarioId: number): Promise<void> {
  await emTransacao(async (client) => {
    await client.query(
      `UPDATE leads SET nao_contatar = false, status = 'em_pesquisa', updated_at = now()
        WHERE id = $1 AND nao_contatar`,
      [leadId],
    );
    await client.query(
      `INSERT INTO lead_interacoes (lead_id, tipo, resumo, usuario_id) VALUES ($1, 'reativado', $2, $3)`,
      [leadId, justificativa, usuarioId],
    );
  });
}

// ---------- Evidências ----------

export type Evidencia = {
  id: number;
  fonte: string;
  url: string | null;
  consultadoEm: string;
  tipo: TipoEvidencia;
  natureza: NaturezaEvidencia;
  campo: CampoEvidencia | null;
  fato: string;
  trecho: string | null;
  confianca: Confianca;
  verificacao: Verificacao;
  registradoPorNome: string | null;
  createdAt: Date;
};

export type DadosEvidencia = Omit<Evidencia, "id" | "registradoPorNome" | "createdAt">;

export async function listarEvidencias(leadId: number): Promise<Evidencia[]> {
  const { rows } = await pool.query<Evidencia>(
    `SELECT e.id, e.fonte, e.url, e.consultado_em::text AS "consultadoEm", e.tipo, e.natureza, e.campo,
            e.fato, e.trecho, e.confianca, e.verificacao, u.nome AS "registradoPorNome", e.created_at AS "createdAt"
       FROM lead_evidencias e LEFT JOIN usuarios u ON u.id = e.registrado_por
      WHERE e.lead_id = $1 ORDER BY e.created_at DESC, e.id DESC`,
    [leadId],
  );
  return rows;
}

export async function criarEvidencia(leadId: number, d: DadosEvidencia, usuarioId: number): Promise<void> {
  await pool.query(
    `INSERT INTO lead_evidencias (lead_id, fonte, url, consultado_em, tipo, natureza, campo, fato, trecho, confianca, verificacao, registrado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [leadId, d.fonte, d.url, d.consultadoEm, d.tipo, d.natureza, d.campo, d.fato, d.trecho, d.confianca, d.verificacao, usuarioId],
  );
  await pool.query(`UPDATE leads SET updated_at = now() WHERE id = $1`, [leadId]);
}

export async function alterarVerificacaoEvidencia(
  leadId: number,
  evidenciaId: number,
  verificacao: Verificacao,
): Promise<void> {
  await pool.query(`UPDATE lead_evidencias SET verificacao = $3 WHERE id = $2 AND lead_id = $1`, [
    leadId, evidenciaId, verificacao,
  ]);
}

// ---------- Qualificação ----------

export type Qualificacao = ResultadoQualificacao & {
  id: number;
  dimensoes: DimensaoAvaliada[];
  observacoes: string | null;
  avaliadoPorNome: string | null;
  createdAt: Date;
};

export async function listarQualificacoes(leadId: number): Promise<Qualificacao[]> {
  const { rows } = await pool.query<Qualificacao>(
    `SELECT q.id, q.dimensoes, q.pontuacao, q.pontuacao_maxima AS "pontuacaoMaxima", q.completude,
            q.prioridade, q.provisoria, q.confianca, q.observacoes, u.nome AS "avaliadoPorNome", q.created_at AS "createdAt"
       FROM lead_qualificacoes q LEFT JOIN usuarios u ON u.id = q.avaliado_por
      WHERE q.lead_id = $1 ORDER BY q.created_at DESC, q.id DESC`,
    [leadId],
  );
  return rows;
}

export async function registrarQualificacao(
  leadId: number,
  dimensoes: DimensaoAvaliada[],
  r: ResultadoQualificacao,
  observacoes: string | null,
  usuarioId: number,
): Promise<void> {
  await emTransacao(async (client) => {
    const lead = await travarLead(client, leadId);
    if (!lead) throw new Error("Lead não encontrado.");
    await client.query(
      `INSERT INTO lead_qualificacoes (lead_id, dimensoes, pontuacao, pontuacao_maxima, completude, prioridade, provisoria, confianca, observacoes, avaliado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [leadId, JSON.stringify(dimensoes), r.pontuacao, r.pontuacaoMaxima, r.completude, r.prioridade, r.provisoria, r.confianca, observacoes, usuarioId],
    );
    const novo = statusAposQualificacao(lead.status, r.prioridade);
    await client.query(`UPDATE leads SET status = COALESCE($2, status), updated_at = now() WHERE id = $1`, [
      leadId, novo,
    ]);
  });
}

// ---------- Mensagens ----------

export type Mensagem = {
  id: number;
  canal: Canal;
  objetivo: string;
  assunto: string | null;
  conteudo: string;
  estado: EstadoMensagem;
  versao: number;
  evidenciaIds: number[];
  fatosUsados: FatoUsado[];
  gerador: "modelo_local" | "manual" | "anthropic" | "gemini";
  modelo: string | null;
  criadaPorNome: string | null;
  editadaPorNome: string | null;
  editadaEm: Date | null;
  aprovadaPorNome: string | null;
  aprovadaEm: Date | null;
  envioIniciadoEm: Date | null;
  enviadaPorNome: string | null;
  enviadaEm: Date | null;
  createdAt: Date;
};

export async function listarMensagens(leadId: number): Promise<Mensagem[]> {
  const { rows } = await pool.query<Mensagem>(
    `SELECT m.id, m.canal, m.objetivo, m.assunto, m.conteudo, m.estado, m.versao,
            m.evidencia_ids AS "evidenciaIds", m.fatos_usados AS "fatosUsados", m.gerador, m.modelo,
            uc.nome AS "criadaPorNome", ue.nome AS "editadaPorNome", m.editada_em AS "editadaEm",
            ua.nome AS "aprovadaPorNome", m.aprovada_em AS "aprovadaEm", m.envio_iniciado_em AS "envioIniciadoEm",
            un.nome AS "enviadaPorNome", m.enviada_em AS "enviadaEm", m.created_at AS "createdAt"
       FROM lead_mensagens m
       LEFT JOIN usuarios uc ON uc.id = m.criada_por
       LEFT JOIN usuarios ue ON ue.id = m.editada_por
       LEFT JOIN usuarios ua ON ua.id = m.aprovada_por
       LEFT JOIN usuarios un ON un.id = m.enviada_por
      WHERE m.lead_id = $1 ORDER BY m.versao DESC`,
    [leadId],
  );
  return rows;
}

export async function criarMensagem(m: {
  leadId: number;
  canal: Canal;
  objetivo: string;
  assunto: string | null;
  conteudo: string;
  fatosUsados: FatoUsado[];
  gerador: Mensagem["gerador"];
  modelo: string | null;
  usuarioId: number;
}): Promise<Resultado> {
  return emTransacao(async (client) => {
    const lead = await travarLead(client, m.leadId);
    if (!lead) return { erro: "Lead não encontrado." };
    if (lead.naoContatar) return { erro: "Lead marcado como não contatar." };
    await client.query(
      `INSERT INTO lead_mensagens (lead_id, canal, objetivo, assunto, conteudo, estado, versao, evidencia_ids, fatos_usados, gerador, modelo, criada_por)
       VALUES ($1, $2, $3, $4, $5, 'aguardando_revisao',
               (SELECT COALESCE(max(versao), 0) + 1 FROM lead_mensagens WHERE lead_id = $1),
               $6, $7, $8, $9, $10)`,
      [
        m.leadId, m.canal, m.objetivo, m.assunto, m.conteudo, m.fatosUsados.map((f) => f.evidenciaId),
        JSON.stringify(m.fatosUsados), m.gerador, m.modelo, m.usuarioId,
      ],
    );
    return { ok: true } as const;
  });
}

/** UPDATE condicionado ao estado de origem da ação e (exceto editar/descartar) ao lead não bloqueado. */
async function transicionar(
  db: PoolClient | typeof pool,
  leadId: number,
  mensagemId: number,
  acao: AcaoMensagem,
  sets: string,
  params: unknown[],
): Promise<boolean> {
  const exigeLiberado = acao !== "editar" && acao !== "descartar";
  const { rowCount } = await db.query(
    `UPDATE lead_mensagens SET ${sets}
      WHERE id = $1 AND lead_id = $2 AND estado = ANY($3::text[])
        ${exigeLiberado ? "AND NOT (SELECT nao_contatar FROM leads WHERE id = $2)" : ""}`,
    [mensagemId, leadId, ORIGENS_ACAO_MENSAGEM[acao], ...params],
  );
  return (rowCount ?? 0) > 0;
}

const ESTADO_INVALIDO: Resultado = {
  erro: "A mensagem mudou de estado (ou o lead foi bloqueado). Recarregue a página.",
};

export async function editarMensagem(
  leadId: number,
  mensagemId: number,
  conteudo: string,
  assunto: string | null,
  fatosUsados: FatoUsado[],
  usuarioId: number,
): Promise<Resultado> {
  const ok = await transicionar(
    pool, leadId, mensagemId, "editar",
    `conteudo = $4, assunto = $5, evidencia_ids = $6, fatos_usados = $7, editada_por = $8, editada_em = now(),
     estado = 'aguardando_revisao', aprovada_por = NULL, aprovada_em = NULL`,
    [conteudo, assunto, fatosUsados.map((f) => f.evidenciaId), JSON.stringify(fatosUsados), usuarioId],
  );
  return ok ? { ok: true } : ESTADO_INVALIDO;
}

export async function aprovarMensagem(leadId: number, mensagemId: number, usuarioId: number): Promise<Resultado> {
  const ok = await transicionar(pool, leadId, mensagemId, "aprovar",
    `estado = 'aprovada', aprovada_por = $4, aprovada_em = now()`, [usuarioId]);
  return ok ? { ok: true } : ESTADO_INVALIDO;
}

export async function descartarMensagem(leadId: number, mensagemId: number): Promise<Resultado> {
  const ok = await transicionar(pool, leadId, mensagemId, "descartar", `estado = 'descartada'`, []);
  return ok ? { ok: true } : ESTADO_INVALIDO;
}

/** Usuário clicou para abrir o canal. NÃO é envio. */
export async function registrarEnvioIniciado(leadId: number, mensagemId: number): Promise<Resultado> {
  const ok = await transicionar(pool, leadId, mensagemId, "abrir_canal",
    `estado = 'envio_iniciado', envio_iniciado_em = COALESCE(envio_iniciado_em, now())`, []);
  return ok ? { ok: true } : ESTADO_INVALIDO;
}

/** Usuário confirmou explicitamente que enviou. Único caminho para "enviada". */
export async function confirmarEnvio(leadId: number, mensagemId: number, usuarioId: number): Promise<Resultado> {
  return emTransacao(async (client) => {
    const lead = await travarLead(client, leadId);
    if (!lead) return { erro: "Lead não encontrado." };
    const ok = await transicionar(client, leadId, mensagemId, "confirmar_envio",
      `estado = 'enviada', enviada_por = $4, enviada_em = now()`, [usuarioId]);
    if (!ok) return ESTADO_INVALIDO;
    await client.query(
      `INSERT INTO lead_interacoes (lead_id, mensagem_id, tipo, canal, usuario_id)
       SELECT $1, id, 'envio_confirmado', canal, $3 FROM lead_mensagens WHERE id = $2`,
      [leadId, mensagemId, usuarioId],
    );
    await client.query(`UPDATE leads SET status = COALESCE($2, status), updated_at = now() WHERE id = $1`, [
      leadId, statusAposInteracao(lead.status, "envio_confirmado"),
    ]);
    return { ok: true } as const;
  });
}

// ---------- Interações ----------

export type Interacao = {
  id: number;
  tipo: TipoInteracao;
  canal: Canal | null;
  resumo: string | null;
  mensagemVersao: number | null;
  ocorridaEm: Date;
  usuarioNome: string | null;
};

export async function listarInteracoes(leadId: number): Promise<Interacao[]> {
  const { rows } = await pool.query<Interacao>(
    `SELECT i.id, i.tipo, i.canal, i.resumo, m.versao AS "mensagemVersao", i.ocorrida_em AS "ocorridaEm", u.nome AS "usuarioNome"
       FROM lead_interacoes i
       LEFT JOIN lead_mensagens m ON m.id = i.mensagem_id
       LEFT JOIN usuarios u ON u.id = i.usuario_id
      WHERE i.lead_id = $1 ORDER BY i.ocorrida_em DESC, i.id DESC`,
    [leadId],
  );
  return rows;
}

export async function registrarInteracao(r: {
  leadId: number;
  tipo: TipoInteracao;
  resumo: string | null;
  ocorridaEm: string | null;
  proximaAcao: string | null;
  proximaAcaoEm: string | null;
  usuarioId: number;
}): Promise<Resultado> {
  return emTransacao(async (client) => {
    const lead = await travarLead(client, r.leadId);
    if (!lead) return { erro: "Lead não encontrado." };
    await client.query(
      `INSERT INTO lead_interacoes (lead_id, tipo, resumo, ocorrida_em, usuario_id)
       VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5)`,
      [r.leadId, r.tipo, r.resumo, r.ocorridaEm, r.usuarioId],
    );
    if (r.tipo === "resposta") {
      await client.query(`UPDATE lead_mensagens SET estado = 'respondida' WHERE lead_id = $1 AND estado = 'enviada'`, [
        r.leadId,
      ]);
    }
    await client.query(
      `UPDATE leads SET status = COALESCE($2, status), proxima_acao = $3, proxima_acao_em = $4, updated_at = now()
        WHERE id = $1`,
      [r.leadId, statusAposInteracao(lead.status, r.tipo), r.proximaAcao, r.proximaAcaoEm],
    );
    return { ok: true } as const;
  });
}

// ---------- Indicadores ----------

export type ContagemMensagens = { geradas: number; aprovadas: number; enviadas: number; responderam: number };

/** Contagem por critério de evento ocorrido (aprovada_em/enviada_em), não pelo estado atual. */
export async function contarMensagens(): Promise<ContagemMensagens> {
  const { rows } = await pool.query<ContagemMensagens>(
    `SELECT count(*)::int AS geradas,
            count(aprovada_em)::int AS aprovadas,
            count(enviada_em)::int AS enviadas,
            count(*) FILTER (WHERE estado = 'respondida')::int AS responderam
       FROM lead_mensagens`,
  );
  return rows[0];
}
