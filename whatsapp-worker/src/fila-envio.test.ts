import { describe, expect, it } from "vitest";
import { FilaEnvio } from "./fila-envio.js";

function relogioFalso() {
  let t = 0;
  const esperas: number[] = [];
  return {
    esperas,
    agora: () => t,
    dormir: async (ms: number) => {
      esperas.push(ms);
      t += ms;
    },
    avancar: (ms: number) => {
      t += ms;
    },
  };
}

describe("FilaEnvio", () => {
  it("executa em ordem, um por vez, com 3s entre envios", async () => {
    const r = relogioFalso();
    const fila = new FilaEnvio(3000, 50, r.dormir, r.agora);
    let emAndamento = 0;
    let maxSimultaneos = 0;
    const ordem: number[] = [];
    const tarefa = (n: number) => async () => {
      emAndamento++;
      maxSimultaneos = Math.max(maxSimultaneos, emAndamento);
      await Promise.resolve();
      ordem.push(n);
      emAndamento--;
      return n;
    };
    const resultados = await Promise.all([1, 2, 3].map((n) => fila.enfileirar(tarefa(n))));
    expect(resultados).toEqual([1, 2, 3]);
    expect(ordem).toEqual([1, 2, 3]);
    expect(maxSimultaneos).toBe(1);
    expect(r.esperas).toEqual([3000, 3000]); // nenhuma espera antes do primeiro
  });

  it("só espera o que falta do intervalo", async () => {
    const r = relogioFalso();
    const fila = new FilaEnvio(3000, 50, r.dormir, r.agora);
    await fila.enfileirar(async () => 1);
    r.avancar(2000);
    await fila.enfileirar(async () => 2);
    expect(r.esperas).toEqual([1000]);
  });

  it("uma falha não trava a fila", async () => {
    const r = relogioFalso();
    const fila = new FilaEnvio(3000, 50, r.dormir, r.agora);
    const falha = fila.enfileirar(async () => {
      throw new Error("x");
    });
    const ok = fila.enfileirar(async () => "ok");
    await expect(falha).rejects.toThrow("x");
    await expect(ok).resolves.toBe("ok");
  });

  it("rejeita quando a fila está cheia", async () => {
    const r = relogioFalso();
    const fila = new FilaEnvio(0, 1, r.dormir, r.agora);
    const a = fila.enfileirar(async () => 1);
    await expect(fila.enfileirar(async () => 2)).rejects.toThrow("cheia");
    await a;
  });
});
