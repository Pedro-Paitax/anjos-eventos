import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MARCADOR_REMETENTE,
  MODELO_GEMINI_PADRAO,
  configuracaoGemini,
  gerarMensagemGemini,
  interpretarRespostaGemini,
  montarPedidoGemini,
  type EntradaMensagemIA,
} from "./prospeccao-ia";

const CHAVE_FALSA = "chave-de-teste-nao-real";

const entrada: EntradaMensagemIA = {
  canal: "whatsapp",
  categoria: "cervejaria",
  nomeLead: "Cervejaria Exemplo",
  segmento: "brewpub",
  municipio: "Curitiba",
  objetivo: "Propor experiência com parrilla",
  fatos: [
    { id: 7, fato: "Realiza festival de inverno anual" },
    { id: 9, fato: "Tem área externa com mesas" },
  ],
};

/** Corpo no formato da Interactions API (docs, 2026-10). */
function respostaApi(json: unknown, status = "completed") {
  return {
    status,
    steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(json) }] }],
  };
}

describe("configuracaoGemini", () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("sem chave (ou só espaços): IA desligada", () => {
    expect(configuracaoGemini()).toBeNull();
    process.env.GEMINI_API_KEY = "   ";
    expect(configuracaoGemini()).toBeNull();
  });

  it("modelo padrão e sobrescrita por GEMINI_MODEL", () => {
    process.env.GEMINI_API_KEY = CHAVE_FALSA;
    expect(configuracaoGemini()).toEqual({ chave: CHAVE_FALSA, modelo: MODELO_GEMINI_PADRAO });
    process.env.GEMINI_MODEL = "outro-modelo";
    expect(configuracaoGemini()?.modelo).toBe("outro-modelo");
  });
});

describe("montarPedidoGemini", () => {
  const pedido = montarPedidoGemini(entrada, "m");

  it("não guarda a interação e pede JSON com esquema", () => {
    expect(pedido.store).toBe(false);
    expect(pedido.model).toBe("m");
    expect(pedido.response_format).toMatchObject({ type: "text", mime_type: "application/json" });
    expect(pedido.response_format.schema.required).toEqual(["assunto", "conteudo", "evidencia_ids"]);
  });

  it("leva os fatos com id e as regras contra invenção e o marcador do remetente", () => {
    expect(pedido.input).toContain("[id 7] Realiza festival de inverno anual");
    expect(pedido.input).toContain("ESTABELECIMENTO: Cervejaria Exemplo");
    expect(pedido.system_instruction).toMatch(/SOMENTE os fatos/);
    expect(pedido.system_instruction).toContain(MARCADOR_REMETENTE);
  });

  it("sem fatos: diz explicitamente que não há", () => {
    expect(montarPedidoGemini({ ...entrada, fatos: [] }, "m").input).toContain("FATOS VERIFICADOS:\n(nenhum)");
  });
});

describe("interpretarRespostaGemini", () => {
  const ok = { assunto: "", conteudo: `Oi! Aqui é ${MARCADOR_REMETENTE}, da Anjos Eventos. Vi o festival de inverno. Topam conversar?`, evidencia_ids: [7] };

  it("troca o marcador pelo remetente e devolve os ids usados", () => {
    expect(interpretarRespostaGemini(respostaApi(ok), "whatsapp", [7, 9], "Pedro")).toEqual({
      assunto: null,
      conteudo: "Oi! Aqui é Pedro, da Anjos Eventos. Vi o festival de inverno. Topam conversar?",
      evidenciaIds: [7],
    });
  });

  it("recusa resposta que cita fato não enviado", () => {
    const r = interpretarRespostaGemini(respostaApi({ ...ok, evidencia_ids: [7, 99] }), "whatsapp", [7, 9], "Pedro");
    expect(r).toEqual({ erro: expect.stringMatching(/fato que não foi informado/) });
  });

  it("recusa status não concluído, JSON inválido, campos faltando, vazio e longo demais", () => {
    expect(interpretarRespostaGemini(respostaApi(ok, "incomplete"), "whatsapp", [7], "P")).toHaveProperty("erro");
    expect(
      interpretarRespostaGemini({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: "não é json" }] }] }, "whatsapp", [], "P"),
    ).toHaveProperty("erro");
    expect(interpretarRespostaGemini(respostaApi({ conteudo: "x" }), "whatsapp", [], "P")).toHaveProperty("erro");
    expect(interpretarRespostaGemini(respostaApi({ ...ok, conteudo: "  " }), "whatsapp", [7], "P")).toHaveProperty("erro");
    expect(interpretarRespostaGemini(respostaApi({ ...ok, conteudo: "a".repeat(1100) }), "whatsapp", [7], "P")).toHaveProperty("erro");
  });

  it("e-mail exige assunto; outros canais descartam o assunto", () => {
    expect(interpretarRespostaGemini(respostaApi(ok), "email", [7], "P")).toHaveProperty("erro");
    const email = interpretarRespostaGemini(respostaApi({ ...ok, assunto: "Parceria" }), "email", [7], "P");
    expect(email).toMatchObject({ assunto: "Parceria" });
    expect(interpretarRespostaGemini(respostaApi({ ...ok, assunto: "X" }), "whatsapp", [7], "P")).toMatchObject({ assunto: null });
  });
});

describe("gerarMensagemGemini (fetch simulado)", () => {
  const fetchMock = vi.fn();
  const config = { chave: CHAVE_FALSA, modelo: "gemini-3.5-flash-lite" };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("chave só no header, nunca na URL; corpo sem contatos do lead", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(respostaApi({ assunto: "", conteudo: "Oi, tudo bem?", evidencia_ids: [] })), { status: 200 }),
    );
    const r = await gerarMensagemGemini(entrada, "Pedro", config);
    expect(r).toEqual({ assunto: null, conteudo: "Oi, tudo bem?", evidenciaIds: [], modelo: "gemini-3.5-flash-lite" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect(String(url)).not.toContain(CHAVE_FALSA);
    expect(init.headers["x-goog-api-key"]).toBe(CHAVE_FALSA);
    expect(init.body).not.toContain(CHAVE_FALSA);
    expect(init.body).not.toContain("Pedro"); // remetente fica fora do pedido
  });

  it.each([
    [429, /Limite gratuito/],
    [403, /Chave do Gemini/],
    [404, /Modelo do Gemini indisponível/],
    [503, /indisponível no momento/],
  ])("HTTP %i vira mensagem clara, sem corpo bruto nem chave", async (status, padrao) => {
    fetchMock.mockResolvedValue(new Response(`{"error":{"message":"detalhe ${CHAVE_FALSA}"}}`, { status }));
    const r = await gerarMensagemGemini(entrada, "Pedro", config);
    expect("erro" in r && r.erro).toMatch(padrao);
    expect(JSON.stringify(r)).not.toContain(CHAVE_FALSA);
  });

  it("timeout e falha de rede", async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error("t"), { name: "TimeoutError" }));
    expect(await gerarMensagemGemini(entrada, "P", config)).toEqual({ erro: expect.stringMatching(/não respondeu a tempo/) });
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await gerarMensagemGemini(entrada, "P", config)).toEqual({ erro: expect.stringMatching(/Falha de rede/) });
  });
});
