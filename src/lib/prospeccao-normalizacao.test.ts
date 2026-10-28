import { describe, expect, it } from "vitest";
import {
  normalizarNome,
  extrairDominio,
  normalizarTelefone,
  normalizarInstagram,
  normalizarEmail,
  compararLeads,
  encontrarDuplicatas,
  paresDuplicados,
  type IdentidadeLead,
} from "./prospeccao-normalizacao";

const base: IdentidadeLead = {
  nomeComercial: "X",
  municipio: null,
  site: null,
  telefone: null,
  instagram: null,
  email: null,
};

describe("normalização", () => {
  it("nome: sem acento, caixa, pontuação e palavras jurídicas", () => {
    expect(normalizarNome("Cervejaria São Bento Ltda.")).toBe("cervejaria sao bento");
    expect(normalizarNome("Bar & Grill do Zé")).toBe("bar grill ze");
  });

  it("domínio: tira www e ignora redes sociais e agregadores", () => {
    expect(extrairDominio("https://www.Exemplo.com.br/contato")).toBe("exemplo.com.br");
    expect(extrairDominio("exemplo.com.br")).toBe("exemplo.com.br");
    expect(extrairDominio("https://instagram.com/exemplo")).toBeNull();
    expect(extrairDominio("https://linktr.ee/exemplo")).toBeNull();
    expect(extrairDominio("")).toBeNull();
    expect(extrairDominio("nao e site")).toBeNull();
  });

  it("telefone: completa DDI 55, aceita zero de longa distância, recusa o resto", () => {
    expect(normalizarTelefone("(41) 3333-4444")).toBe("554133334444");
    expect(normalizarTelefone("+55 41 99999-8888")).toBe("5541999998888");
    expect(normalizarTelefone("041 3333-4444")).toBe("554133334444");
    expect(normalizarTelefone("041 99999-8888")).toBe("5541999998888");
    expect(normalizarTelefone("")).toBeNull();
    expect(normalizarTelefone("3333-4444")).toBe("invalido");
    expect(normalizarTelefone("41 89999-8888")).toBe("invalido"); // 11 dígitos sem o 9 de celular
    expect(normalizarTelefone("1 555 123 4567")).toBe("invalido"); // não presume outro país
  });

  it("Instagram: @, link ou usuário puro", () => {
    expect(normalizarInstagram("@Cervejaria.X")).toBe("cervejaria.x");
    expect(normalizarInstagram("https://www.instagram.com/cervejaria_x/?hl=pt")).toBe("cervejaria_x");
    expect(normalizarInstagram("tem espaço")).toBe("invalido");
    expect(normalizarInstagram(" ")).toBeNull();
  });

  it("e-mail", () => {
    expect(normalizarEmail(" Contato@Exemplo.com ")).toBe("contato@exemplo.com");
    expect(normalizarEmail("contato@")).toBe("invalido");
  });
});

describe("deduplicação", () => {
  it("identificador inequívoco igual → forte, com o motivo", () => {
    const c = compararLeads(
      { ...base, nomeComercial: "Bar A", site: "https://www.a.com.br" },
      { ...base, id: 1, nomeComercial: "Outro nome", site: "a.com.br/menu" },
    );
    expect(c).toMatchObject({ id: 1, nivel: "forte", motivos: ["mesmo site (a.com.br)"] });

    expect(
      compararLeads({ ...base, telefone: "554133334444" }, { ...base, nomeComercial: "Y", telefone: "554133334444" })
        ?.nivel,
    ).toBe("forte");
    expect(compararLeads({ ...base, instagram: "x" }, { ...base, instagram: "x" })?.nivel).toBe("forte");
  });

  it("nome igual no mesmo município → só possível (nunca une sozinho)", () => {
    const c = compararLeads(
      { ...base, nomeComercial: "Cervejaria Bodoque", municipio: "Curitiba" },
      { ...base, nomeComercial: "CERVEJARIA BODOQUE", municipio: "curitiba" },
    );
    expect(c?.nivel).toBe("possivel");
  });

  it("nome igual em municípios diferentes → não é duplicata", () => {
    expect(
      compararLeads(
        { ...base, nomeComercial: "Bar do Centro", municipio: "Curitiba" },
        { ...base, nomeComercial: "Bar do Centro", municipio: "Pinhais" },
      ),
    ).toBeNull();
  });

  it("nome contido no outro, mesmo município → possível", () => {
    expect(
      compararLeads(
        { ...base, nomeComercial: "Bodoque", municipio: "Curitiba" },
        { ...base, nomeComercial: "Cervejaria Bodoque", municipio: "Curitiba" },
      )?.nivel,
    ).toBe("possivel");
  });

  it("encontrarDuplicatas ignora o próprio registro e ordena fortes primeiro", () => {
    const candidato = { ...base, id: 1, nomeComercial: "Casa X", municipio: "Curitiba", email: "a@x.com" };
    const r = encontrarDuplicatas(candidato, [
      candidato,
      { ...base, id: 2, nomeComercial: "Casa X", municipio: "Curitiba" },
      { ...base, id: 3, nomeComercial: "Z", email: "a@x.com" },
    ]);
    expect(r.map((d) => [d.id, d.nivel])).toEqual([
      [3, "forte"],
      [2, "possivel"],
    ]);
  });

  it("paresDuplicados acha pares dentro da base", () => {
    const pares = paresDuplicados([
      { ...base, id: 1, nomeComercial: "A", telefone: "554133334444" },
      { ...base, id: 2, nomeComercial: "B", telefone: "554133334444" },
      { ...base, id: 3, nomeComercial: "C" },
    ]);
    expect(pares).toHaveLength(1);
    expect([pares[0].a.id, pares[0].b.id]).toEqual([1, 2]);
  });
});
