import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integração com Postgres REAL e DESCARTÁVEL (migrações 0008–0010 aplicadas).
 * Só roda com TEST_DATABASE_URL apontando para um banco cujo nome termina em "_teste";
 * nunca use o banco de desenvolvimento ou de produção. Gemini e worker são simulados.
 */
const URL_TESTE = process.env.TEST_DATABASE_URL ?? "";
const seguro = /\/[^/?]*_teste(\?|$)/.test(URL_TESTE) && URL_TESTE === process.env.DATABASE_URL;

const gemini = vi.hoisted(() => ({ erro: null as string | null }));
const worker = vi.hoisted(() => ({
  chamadas: [] as { para: string; texto: string }[],
  falha: null as null | { status: number | null },
  status: "connected" as "connected" | "disconnected",
}));

vi.mock("@/lib/prospeccao-ia", () => ({
  configuracaoGemini: () => ({ chave: "x", modelo: "gemini-teste" }),
  gerarMensagemGemini: async () =>
    gemini.erro ? { erro: gemini.erro } : { assunto: null, conteudo: "Oi! Aqui é Pedro, da Anjos Eventos.", evidenciaIds: [], modelo: "gemini-teste" },
}));
vi.mock("@/lib/whatsapp-worker", () => {
  class ErroWorker extends Error {
    constructor(
      m: string,
      readonly status: number | null,
    ) {
      super(m);
    }
  }
  return {
    ErroWorker,
    statusWorker: async () => ({ status: worker.status, qr_code: null }),
    enviarTexto: async (para: string, texto: string) => {
      if (worker.falha) throw new ErroWorker("falha", worker.falha.status);
      worker.chamadas.push({ para, texto });
    },
  };
});

const QUARTA_10H = new Date("2026-10-28T13:00:00Z");

describe.skipIf(!seguro)("envio automático — integração", () => {
  let lib: typeof import("./prospeccao-envio-auto");
  let pool: typeof import("@/lib/db").pool;
  let proximoTelefone = 1;

  async function criarLead(extra: { telefone?: string | null; status?: string; naoContatar?: boolean } = {}) {
    const n = proximoTelefone++;
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO leads (nome_comercial, categoria, nome_normalizado, telefone, status, nao_contatar)
       VALUES ($1, 'cervejaria', $1, $2, $3, $4) RETURNING id`,
      [`Lead ${n}`, extra.telefone === undefined ? `55009000000${String(n).padStart(2, "0")}` : extra.telefone, extra.status ?? "pronto_para_contato", extra.naoContatar ?? false],
    );
    return rows[0].id;
  }

  async function ligar(limite = 10) {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO lead_mensagens (lead_id, canal, objetivo, conteudo, estado, versao, gerador, modelo, aprovada_por, aprovada_em)
       VALUES ($1, 'whatsapp', 'x', 'modelo aprovado', 'aprovada', 1, 'gemini', 'gemini-teste', 1, now()) RETURNING id`,
      [await criarLead({ telefone: null })],
    );
    return lib.ligarEnvio(1, rows[0].id, "Pedro", limite);
  }

  beforeEach(async () => {
    lib ??= await import("./prospeccao-envio-auto");
    pool ??= (await import("@/lib/db")).pool;
    await pool.query(
      `TRUNCATE prospeccao_fila_envio, prospeccao_envio_config, lead_interacoes, lead_mensagens, leads RESTART IDENTITY CASCADE`,
    );
    worker.chamadas.length = 0;
    worker.falha = null;
    worker.status = "connected";
    gemini.erro = null;
    proximoTelefone = 1;
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("desligado por padrão: nada é processado", async () => {
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ processou: false });
    expect(worker.chamadas).toHaveLength(0);
  });

  it("só liga com mensagem do Gemini aprovada por uma pessoa", async () => {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO lead_mensagens (lead_id, canal, objetivo, conteudo, estado, versao, gerador)
       VALUES ($1, 'whatsapp', 'x', 'sem aprovação', 'aguardando_revisao', 1, 'gemini') RETURNING id`,
      [await criarLead({ telefone: null })],
    );
    expect(await lib.ligarEnvio(1, rows[0].id, "Pedro", 10)).toHaveProperty("erro");
    expect(await lib.ligarEnvio(1, rows[0].id, "Pedro", 11)).toHaveProperty("erro");
    expect(await lib.obterConfigEnvio()).toBeNull();
  });

  it("envia um lead por rodada, registra tudo e marca o lead como contatado", async () => {
    expect(await ligar()).toEqual({ ok: true });
    const a = await criarLead();
    const b = await criarLead();
    expect(await lib.enfileirarLead(a, 1)).toEqual({ ok: true });
    expect(await lib.enfileirarLead(b, 1)).toEqual({ ok: true });
    expect(await lib.enfileirarLead(a, 1)).toEqual({ erro: "Esse lead já está na fila." });

    const r = await lib.executarRodadaEnvio(QUARTA_10H);
    expect(r).toMatchObject({ processou: true, resultado: "enviada" });
    expect(worker.chamadas).toHaveLength(1);
    expect(worker.chamadas[0].para).toBe("5500900000002");

    const lead = await pool.query(`SELECT status FROM leads WHERE id = $1`, [a]);
    expect(lead.rows[0].status).toBe("contatado");
    const msg = await pool.query(`SELECT estado, enviada_por, gerador FROM lead_mensagens WHERE lead_id = $1`, [a]);
    expect(msg.rows[0]).toMatchObject({ estado: "enviada", enviada_por: null, gerador: "gemini" });
    const inter = await pool.query(`SELECT tipo FROM lead_interacoes WHERE lead_id = $1`, [a]);
    expect(inter.rows.map((i) => i.tipo)).toEqual(["envio_confirmado"]);
    expect(await lib.contarEnviosHoje()).toBe(1);
  });

  it("respeita o limite diário", async () => {
    await ligar(1);
    await lib.enfileirarLead(await criarLead(), 1);
    await lib.enfileirarLead(await criarLead(), 1);
    expect((await lib.executarRodadaEnvio(QUARTA_10H)).processou).toBe(true);
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ processou: false, motivo: "Limite diário atingido." });
    expect(worker.chamadas).toHaveLength(1);
  });

  it("não envia fora do horário nem com WhatsApp desconectado", async () => {
    await ligar();
    await lib.enfileirarLead(await criarLead(), 1);
    expect((await lib.executarRodadaEnvio(new Date("2026-10-31T13:00:00Z"))).processou).toBe(false);
    worker.status = "disconnected";
    expect((await lib.executarRodadaEnvio(QUARTA_10H)).processou).toBe(false);
    expect(worker.chamadas).toHaveLength(0);
  });

  it("lead marcado como não contatar depois de entrar na fila é cancelado, sem envio", async () => {
    await ligar();
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    await pool.query(`UPDATE leads SET nao_contatar = true, status = 'nao_contatar' WHERE id = $1`, [id]);
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "cancelada" });
    expect(worker.chamadas).toHaveLength(0);
  });

  it("503 devolve o item à fila sem gastar tentativa e descarta a mensagem", async () => {
    await ligar();
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    worker.falha = { status: 503 };
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "adiada" });
    const f = await pool.query(`SELECT estado, tentativas FROM prospeccao_fila_envio`);
    expect(f.rows[0]).toEqual({ estado: "pendente", tentativas: 0 });
    const m = await pool.query(`SELECT estado FROM lead_mensagens WHERE lead_id = $1`, [id]);
    expect(m.rows[0].estado).toBe("descartada");
    expect(await lib.contarEnviosHoje()).toBe(0);
  });

  it("422 (sem WhatsApp) encerra o item e deixa uma nota no lead", async () => {
    await ligar();
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    worker.falha = { status: 422 };
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "falhou" });
    const n = await pool.query(`SELECT tipo FROM lead_interacoes WHERE lead_id = $1`, [id]);
    expect(n.rows[0].tipo).toBe("nota");
  });

  it("resposta incerta (timeout) vai para 'conferir' e nunca é reenviada sozinha", async () => {
    await ligar();
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    worker.falha = { status: null };
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "conferir" });
    worker.falha = null;
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ processou: false });
    expect(worker.chamadas).toHaveLength(0);
    expect(await lib.contarEnviosHoje()).toBe(1); // conta no teto: pode ter saído
    const f = await pool.query(`SELECT id, mensagem_id FROM prospeccao_fila_envio`);
    expect(await lib.resolverConferencia(f.rows[0].id, false)).toEqual({ leadId: id, mensagemId: f.rows[0].mensagem_id });
  });

  it("erro do Gemini devolve o item à fila e, na 3ª tentativa, marca como falhou", async () => {
    await ligar();
    await lib.enfileirarLead(await criarLead(), 1);
    gemini.erro = "Limite gratuito do Gemini atingido.";
    for (let i = 0; i < 2; i++) {
      expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "adiada" });
    }
    expect(await lib.executarRodadaEnvio(QUARTA_10H)).toMatchObject({ resultado: "falhou" });
    expect(worker.chamadas).toHaveLength(0);
  });

  it("item preso em 'enviando' vira 'conferir' depois de 15 minutos", async () => {
    await ligar();
    const id = await criarLead();
    await lib.enfileirarLead(id, 1);
    await pool.query(`UPDATE prospeccao_fila_envio SET estado = 'enviando', iniciado_em = now() - interval '20 minutes'`);
    await lib.executarRodadaEnvio(QUARTA_10H);
    const f = await pool.query(`SELECT estado FROM prospeccao_fila_envio`);
    expect(f.rows[0].estado).toBe("conferir");
  });
});
