import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheMensagens } from "./cache-mensagens.js";
import { ConfirmacaoEntrega, EntregaFalhouError, SemConfirmacaoError } from "./entrega.js";

describe("ConfirmacaoEntrega", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("resolve quando o status chega a 2 (servidor)", async () => {
    const c = new ConfirmacaoEntrega();
    const espera = c.aguardar("A", 5000);
    c.registrar("A", 2);
    await expect(espera).resolves.toBeUndefined();
  });

  it("resolve também com 3 (entregue) e 4 (lida)", async () => {
    const c = new ConfirmacaoEntrega();
    const e1 = c.aguardar("A", 5000);
    c.registrar("A", 3);
    await expect(e1).resolves.toBeUndefined();
    const e2 = c.aguardar("B", 5000);
    c.registrar("B", 4);
    await expect(e2).resolves.toBeUndefined();
  });

  it("status 1 (pendente) não confirma: estoura o tempo limite", async () => {
    const c = new ConfirmacaoEntrega();
    const espera = c.aguardar("A", 5000);
    const resultado = expect(espera).rejects.toBeInstanceOf(SemConfirmacaoError);
    c.registrar("A", 1);
    await vi.advanceTimersByTimeAsync(5001);
    await resultado;
  });

  it("sem nenhum evento, estoura o tempo limite", async () => {
    const c = new ConfirmacaoEntrega();
    const espera = c.aguardar("A", 1000);
    const resultado = expect(espera).rejects.toBeInstanceOf(SemConfirmacaoError);
    await vi.advanceTimersByTimeAsync(1001);
    await resultado;
  });

  it("status 0 (erro) rejeita na hora", async () => {
    const c = new ConfirmacaoEntrega();
    const espera = c.aguardar("A", 5000);
    c.registrar("A", 0);
    await expect(espera).rejects.toBeInstanceOf(EntregaFalhouError);
  });

  it("o evento que chega ANTES de alguém aguardar não se perde", async () => {
    const c = new ConfirmacaoEntrega();
    c.registrar("A", 2);
    await expect(c.aguardar("A", 5000)).resolves.toBeUndefined();
    c.registrar("B", 0);
    await expect(c.aguardar("B", 5000)).rejects.toBeInstanceOf(EntregaFalhouError);
  });

  it("status menor não rebaixa um status já confirmado", async () => {
    const c = new ConfirmacaoEntrega();
    c.registrar("A", 3);
    c.registrar("A", 1);
    await expect(c.aguardar("A", 5000)).resolves.toBeUndefined();
  });

  it("limita a memória dos ids vistos", async () => {
    const c = new ConfirmacaoEntrega(2);
    c.registrar("A", 2);
    c.registrar("B", 2);
    c.registrar("C", 2);
    const espera = c.aguardar("A", 100);
    const resultado = expect(espera).rejects.toBeInstanceOf(SemConfirmacaoError);
    await vi.advanceTimersByTimeAsync(101);
    await resultado;
    await expect(c.aguardar("C", 100)).resolves.toBeUndefined();
  });
});

describe("CacheMensagens", () => {
  it("devolve o que foi guardado", () => {
    const c = new CacheMensagens<string>();
    c.guardar("A", "conversa");
    expect(c.obter("A")).toBe("conversa");
    expect(c.obter("X")).toBeUndefined();
  });

  it("descarta o mais antigo ao passar do máximo", () => {
    const c = new CacheMensagens<string>(2);
    c.guardar("A", "a");
    c.guardar("B", "b");
    c.guardar("C", "c");
    expect(c.obter("A")).toBeUndefined();
    expect(c.obter("B")).toBe("b");
    expect(c.obter("C")).toBe("c");
    expect(c.tamanho).toBe(2);
  });

  it("expira depois do TTL", () => {
    let agora = 1000;
    const c = new CacheMensagens<string>(10, 500, () => agora);
    c.guardar("A", "a");
    agora = 1400;
    expect(c.obter("A")).toBe("a");
    agora = 1501;
    expect(c.obter("A")).toBeUndefined();
    expect(c.tamanho).toBe(0);
  });
});
