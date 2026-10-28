import { describe, expect, it } from "vitest";
import { parseCsv, analisarCsv, linhaImportavel, gerarCsv, tipoEvidenciaPorUrl } from "./prospeccao-csv";
import type { IdentidadeLead } from "./prospeccao-normalizacao";

describe("parseCsv", () => {
  it("vírgula, aspas, aspas escapadas e quebra de linha dentro de aspas", () => {
    expect(parseCsv('a,b\n"x, y","diz ""oi""\nlinha 2"\n')).toEqual([
      ["a", "b"],
      ["x, y", 'diz "oi"\nlinha 2'],
    ]);
  });

  it("ponto e vírgula (Excel pt-BR), BOM, CRLF e linhas vazias", () => {
    expect(parseCsv("﻿a;b\r\n1;2\r\n;\r\n\r\n3;4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });
});

const existentes: IdentidadeLead[] = [
  {
    id: 7,
    nomeComercial: "Cervejaria Bodoque",
    municipio: "Curitiba",
    site: "https://bodoque.com.br",
    telefone: null,
    instagram: null,
    email: null,
  },
];

describe("analisarCsv", () => {
  it("exige cabeçalho mínimo", () => {
    expect(analisarCsv("nome;cidade\nA;B", []).erroGeral).toMatch(/nome_comercial e categoria/);
    expect(analisarCsv("nome_comercial;categoria", []).erroGeral).toMatch(/vazio/);
  });

  it("valida linhas, normaliza, marca duplicatas (banco e arquivo) e colunas ignoradas", () => {
    const csv = [
      "nome_comercial;categoria;municipio;site;telefone;coluna_x;fonte_url;fonte_consultada_em;fonte_fato;fonte_verificada",
      "Bar Novo;bar;Pinhais;;(41) 3333-4444;?;https://barnovo.com.br;28/10/2026;Faz noites temáticas;sim",
      "Outro Nome;cervejaria;Curitiba;www.bodoque.com.br;;;;;;",
      "Bodoque;cervejaria;Curitiba;;;;;;;",
      ";espaco_eventos;;;;;;;;",
      "Bar Novo Filial;bar;Curitiba;;41 3333-4444;;;;;",
      "Sem data;outro;;;;;https://x.com;;Fato;",
    ].join("\n");
    const r = analisarCsv(csv, existentes);
    expect(r.erroGeral).toBeNull();
    expect(r.colunasIgnoradas).toEqual(["coluna_x"]);

    const [novo, siteRepetido, nomeParecido, semNome, telRepetido, semData] = r.linhas;

    expect(novo.erros).toEqual([]);
    expect(novo.dados).toMatchObject({ categoria: "bar_restaurante", telefone: "554133334444" });
    expect(novo.fonte).toEqual({
      fonte: "https://barnovo.com.br",
      url: "https://barnovo.com.br",
      consultadoEm: "2026-10-28",
      fato: "Faz noites temáticas",
      verificado: true,
    });
    expect(linhaImportavel(novo, new Set())).toBe(true);

    expect(siteRepetido.duplicatas[0]).toMatchObject({ id: 7, nivel: "forte" });
    expect(linhaImportavel(siteRepetido, new Set([siteRepetido.linha]))).toBe(false);

    expect(nomeParecido.duplicatas[0]).toMatchObject({ id: 7, nivel: "possivel" });
    expect(linhaImportavel(nomeParecido, new Set())).toBe(false);
    expect(linhaImportavel(nomeParecido, new Set([nomeParecido.linha]))).toBe(true);

    expect(semNome.erros).toContain("nome comercial é obrigatório");
    expect(linhaImportavel(semNome, new Set())).toBe(false);

    expect(telRepetido.duplicadaNoArquivo).toBe(2);
    expect(linhaImportavel(telRepetido, new Set([telRepetido.linha]))).toBe(false);

    expect(semData.erros[0]).toMatch(/fonte_consultada_em/);
  });
});

describe("tipoEvidenciaPorUrl", () => {
  it("site do lead, rede social ou outra", () => {
    expect(tipoEvidenciaPorUrl("https://www.x.com.br/eventos", "x.com.br")).toBe("site_oficial");
    expect(tipoEvidenciaPorUrl("https://www.instagram.com/x/", "x.com.br")).toBe("rede_social");
    expect(tipoEvidenciaPorUrl("https://guia.com/x", "x.com.br")).toBe("outro");
    expect(tipoEvidenciaPorUrl(null, null)).toBe("outro");
  });
});

describe("gerarCsv", () => {
  it("usa ;, BOM e escapa o necessário", () => {
    expect(gerarCsv(["a", "b"], [["x;y", 'diz "oi"'], [null, 3]])).toBe(
      '﻿a;b\r\n"x;y";"diz ""oi"""\r\n;3\r\n',
    );
  });
});
