import { describe, expect, it } from "vitest";
import {
  TABELAS_PROIBIDAS_NO_TRUNCATE,
  TABELAS_TRUNCATE_RELOAD,
  avaliarTravasTruncateReload,
  dataHojeSaoPaulo,
  type EntradaTrava,
} from "./lib-trava-corte";

const IP = "100.121.229.81";
const AGORA = new Date("2026-10-05T15:00:00Z"); // 12:00 em São Paulo
const HOJE = "2026-10-05";

function entradaValida(sobrescrever: Partial<EntradaTrava> = {}): EntradaTrava {
  return {
    argv: ["--write", "--confirmo-producao", `--confirmo-banco=${IP}`],
    env: { DIA_DO_CORTE: HOJE },
    agora: AGORA,
    ipOracle: IP,
    backupStatus: "OK 2026-10-05T03:30:00-03:00 anjos-eventos-2026-10-05.dump",
    backupIdadeHoras: 9,
    ...sobrescrever,
  };
}

describe("avaliarTravasTruncateReload", () => {
  it("abre só com todas as travas corretas", () => {
    expect(avaliarTravasTruncateReload(entradaValida())).toEqual({ ok: true });
  });

  it("sem nenhuma flag/variável: recusa e lista todos os motivos", () => {
    const r = avaliarTravasTruncateReload(entradaValida({ argv: ["--write"], env: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivos.length).toBeGreaterThanOrEqual(3);
  });

  it("recusa sem --confirmo-producao", () => {
    const r = avaliarTravasTruncateReload(entradaValida({ argv: ["--write", `--confirmo-banco=${IP}`] }));
    expect(r).toMatchObject({ ok: false });
  });

  it("recusa DIA_DO_CORTE de outro dia (ontem/amanhã)", () => {
    for (const dia of ["2026-10-04", "2026-10-06"]) {
      const r = avaliarTravasTruncateReload(entradaValida({ env: { DIA_DO_CORTE: dia } }));
      expect(r.ok).toBe(false);
    }
  });

  it("recusa sem DIA_DO_CORTE", () => {
    expect(avaliarTravasTruncateReload(entradaValida({ env: {} })).ok).toBe(false);
  });

  it("recusa banco digitado errado", () => {
    const r = avaliarTravasTruncateReload(entradaValida({ argv: ["--write", "--confirmo-producao", "--confirmo-banco=localhost"] }));
    expect(r.ok).toBe(false);
  });

  it("recusa sem backup registrado, com backup em FALHA ou com backup velho", () => {
    expect(avaliarTravasTruncateReload(entradaValida({ backupStatus: null, backupIdadeHoras: null })).ok).toBe(false);
    expect(avaliarTravasTruncateReload(entradaValida({ backupStatus: "FALHA 2026-10-05: pg_dump falhou" })).ok).toBe(false);
    expect(avaliarTravasTruncateReload(entradaValida({ backupIdadeHoras: 40 })).ok).toBe(false);
    expect(avaliarTravasTruncateReload(entradaValida({ backupIdadeHoras: null })).ok).toBe(false);
  });
});

describe("dataHojeSaoPaulo", () => {
  it("usa o fuso de São Paulo, não UTC", () => {
    // 01:30 UTC de 06/10 ainda é 22:30 de 05/10 em São Paulo.
    expect(dataHojeSaoPaulo(new Date("2026-10-06T01:30:00Z"))).toBe("2026-10-05");
  });
});

describe("TABELAS_TRUNCATE_RELOAD", () => {
  it("nunca inclui usuarios, contratos, eventos nem empresas", () => {
    for (const proibida of TABELAS_PROIBIDAS_NO_TRUNCATE) {
      expect(TABELAS_TRUNCATE_RELOAD as readonly string[]).not.toContain(proibida);
    }
  });

  it("não tem duplicadas", () => {
    expect(new Set(TABELAS_TRUNCATE_RELOAD).size).toBe(TABELAS_TRUNCATE_RELOAD.length);
  });
});
