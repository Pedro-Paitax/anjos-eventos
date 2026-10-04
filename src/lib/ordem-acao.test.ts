import { describe, expect, it } from "vitest";
import {
  gerarOrdemAcaoPdf,
  montarSecoesOrdemAcao,
  type DadosOrdemAcao,
} from "@/lib/ordem-acao";

const base: DadosOrdemAcao = {
  papel: "assador",
  nomeColaborador: "Fulano",
  cliente: "Cliente Teste",
  dataHora: "sáb., 03 de outubro de 2026, 12:00",
  tipoEvento: "Casamento",
  endereco: "Rua X, 1",
  horaInicio: "12:00",
  qtdAdultos: 80,
  qtdCriancasAte5: 5,
  qtdCriancas5a10: 10,
  qtdFornecedores: 4,
  horaChegadaEquipe: "09:00:00",
  horaAperitivo: null,
  horaAlmoco: "12:30:00",
  horaEncerramento: null,
  cardapioCarnes: "Picanha, Fraldinha",
  cardapioBebidas: "Refrigerante",
  veiculo: "Kombi",
  modeloPrato: "Raso branco",
  sousplat: true,
  tipoBebidaRecipiente: "Copo americano",
  tacaFurtaCor: false,
  tacaChampanhe: true,
  tipoTalher: "Inox",
};

const texto = (d: DadosOrdemAcao) =>
  montarSecoesOrdemAcao(d).flatMap((s) => [s.titulo, ...s.linhas]).join("\n");

describe("montarSecoesOrdemAcao", () => {
  it("assador vê carnes e prato, não sousplat/talher", () => {
    const t = texto(base);
    expect(t).toContain("Carnes: Picanha, Fraldinha");
    expect(t).toContain("Modelo de prato: Raso branco");
    expect(t).not.toContain("Sousplat");
    expect(t).not.toContain("Talher");
  });

  it("copeira vê sousplat, copo/taça, talher e bebidas, não carnes", () => {
    const t = texto({ ...base, papel: "copeira" });
    expect(t).toContain("Sousplat: Sim");
    expect(t).toContain("Copo / taça: Copo americano");
    expect(t).toContain("Taça de champanhe: Sim");
    expect(t).toContain("Talher: Inox");
    expect(t).toContain("Bebidas: Refrigerante");
    expect(t).not.toContain("Carnes");
  });

  it("garçom não recebe bebidas nem carnes", () => {
    const t = texto({ ...base, papel: "garcom" });
    expect(t).not.toContain("Bebidas");
    expect(t).not.toContain("Carnes");
    expect(t).toContain("Talher: Inox");
  });

  it("todos os papéis recebem convidados (com total), início, horários e endereço completo", () => {
    for (const papel of ["assador", "copeira", "garcom"] as const) {
      const t = texto({ ...base, papel });
      expect(t).toContain("Adultos: 80");
      expect(t).toContain("Crianças até 5 anos: 5");
      expect(t).toContain("Crianças de 5 a 10 anos: 10");
      expect(t).toContain("Total de convidados: 95");
      expect(t).toContain("Fornecedores: 4");
      expect(t).toContain("Início do evento: 12:00");
      expect(t).toContain("Endereço: Rua X, 1");
    }
  });

  it("omite a seção de convidados quando nenhuma quantidade foi informada", () => {
    const t = texto({ ...base, qtdAdultos: null, qtdCriancasAte5: null, qtdCriancas5a10: null, qtdFornecedores: null });
    expect(t).not.toContain("Convidados");
  });

  it("horários omitem os vazios e cortam os segundos", () => {
    const t = texto(base);
    expect(t).toContain("Chegada da equipe: 09:00");
    expect(t).toContain("Almoço: 12:30");
    expect(t).not.toContain("Aperitivo");
  });
});

describe("gerarOrdemAcaoPdf", () => {
  it("gera um PDF válido, mesmo com caracteres fora do WinAnsi", async () => {
    const pdf = await gerarOrdemAcaoPdf({ ...base, cliente: "Cliente 🎉 Açaí" });
    expect(Buffer.from(pdf.subarray(0, 4)).toString("latin1")).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(500);
  });
});
