import { beforeEach, describe, expect, it, vi } from "vitest";

// Banco simulado: cada `await` em uma cadeia select/update consome o próximo resultado da fila.
const fila = vi.hoisted(() => ({ resultados: [] as unknown[], updates: [] as unknown[] }));

function cadeia(registrarSet = false) {
  const c: Record<string, unknown> = {};
  for (const metodo of ["from", "innerJoin", "where"]) c[metodo] = () => c;
  c.set = (valores: unknown) => {
    if (registrarSet) fila.updates.push(valores);
    return c;
  };
  c.returning = () => c;
  c.then = (resolve: (v: unknown) => unknown, rejeitar: (e: unknown) => unknown) =>
    Promise.resolve(fila.resultados.shift()).then(resolve, rejeitar);
  return c;
}

vi.mock("@/db/client", () => ({
  db: { select: () => cadeia(), update: () => cadeia(true) },
}));

import { aprovarEConfirmarEvento, erroTransicaoOrcamento, recusarOrcamento } from "@/lib/orcamentos";

const linhaOrcamento = (status: string) => ({
  id: 7,
  empresaId: 1,
  empresaNome: "Buffet Senhor Churrasco",
  clienteNome: "Cliente Teste",
  numConvidados: 10,
  qtdAdultos: 10,
  qtdCriancasAte5: 0,
  qtdCriancas5a10: 0,
  status,
  eventoId: null,
  valorNegociado: null,
  precoPessoa: "85.00",
  usarPrecoFixoModelo: false,
  qtdGarcons: 1,
  valorGarcom: "230.00",
  regiaoMetropolitanaCuritiba: false,
});

// obterOrcamento faz 2 consultas: a linha do orçamento e os itens.
const enfileirarOrcamento = (status: string) => fila.resultados.push([linhaOrcamento(status)], []);

describe("erroTransicaoOrcamento", () => {
  it("Simulação pode ser recusada e confirmada", () => {
    expect(erroTransicaoOrcamento("Simulação", "recusar")).toBeNull();
    expect(erroTransicaoOrcamento("Simulação", "confirmar")).toBeNull();
  });

  it.each(["Enviado", "Aceito", "Recusado", "qualquer-coisa"])("recusar com status %s é erro", (status) => {
    expect(erroTransicaoOrcamento(status, "recusar")).toContain(`"${status}"`);
  });

  it("Recusado não pode ser confirmado", () => {
    expect(erroTransicaoOrcamento("Recusado", "confirmar")).toContain('"Recusado"');
  });
});

describe("recusarOrcamento", () => {
  beforeEach(() => {
    fila.resultados.length = 0;
    fila.updates.length = 0;
  });

  it("recusa um orçamento em Simulação (UPDATE para Recusado)", async () => {
    enfileirarOrcamento("Simulação");
    fila.resultados.push([{ id: 7 }]);
    expect(await recusarOrcamento(7)).toBeNull();
    expect(fila.updates).toHaveLength(1);
    expect(fila.updates[0]).toMatchObject({ status: "Recusado" });
  });

  it.each(["Aceito", "Recusado", "Enviado"])("com status %s devolve erro e não faz UPDATE", async (status) => {
    enfileirarOrcamento(status);
    const resultado = await recusarOrcamento(7);
    expect(resultado?.erro).toContain(status);
    expect(fila.updates).toHaveLength(0);
  });

  it("orçamento inexistente devolve erro", async () => {
    fila.resultados.push([]);
    expect(await recusarOrcamento(999)).toEqual({ erro: "Orçamento não encontrado." });
    expect(fila.updates).toHaveLength(0);
  });

  it("status mudou entre a leitura e o UPDATE (0 linhas) devolve erro", async () => {
    enfileirarOrcamento("Simulação");
    fila.resultados.push([]);
    expect((await recusarOrcamento(7))?.erro).toContain("mudou de status");
  });
});

describe("aprovarEConfirmarEvento depois de recusado", () => {
  beforeEach(() => {
    fila.resultados.length = 0;
    fila.updates.length = 0;
  });

  it("bloqueia a aprovação sem criar evento nem alterar nada", async () => {
    enfileirarOrcamento("Recusado");
    const resultado = await aprovarEConfirmarEvento(7, {} as never);
    expect(resultado).toEqual({ erro: expect.stringContaining('"Recusado"') });
    expect(fila.updates).toHaveLength(0);
  });
});
