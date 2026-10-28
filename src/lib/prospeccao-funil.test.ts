import { describe, expect, it } from "vitest";
import { statusAposInteracao, statusAposQualificacao, acaoPermitida } from "./prospeccao-opcoes";

describe("statusAposQualificacao", () => {
  it("só move leads na fase de pesquisa", () => {
    expect(statusAposQualificacao("novo", "B")).toBe("qualificado");
    expect(statusAposQualificacao("a_verificar", "baixa")).toBe("prioridade_baixa");
    expect(statusAposQualificacao("novo", "indefinida")).toBe("em_pesquisa");
    expect(statusAposQualificacao("em_pesquisa", "indefinida")).toBeNull();
    expect(statusAposQualificacao("em_conversa", "A")).toBeNull();
    expect(statusAposQualificacao("nao_contatar", "A")).toBeNull();
  });
});

describe("ciclo da mensagem", () => {
  it("gerar ≠ aprovar ≠ enviar: só aprovada (ou com canal aberto) pode ser confirmada como enviada", () => {
    expect(acaoPermitida("confirmar_envio", "aguardando_revisao")).toBe(false);
    expect(acaoPermitida("confirmar_envio", "aprovada")).toBe(true);
    expect(acaoPermitida("confirmar_envio", "envio_iniciado")).toBe(true);
    expect(acaoPermitida("abrir_canal", "aguardando_revisao")).toBe(false);
  });

  it("enviada, respondida e descartada são finais", () => {
    for (const estado of ["enviada", "respondida", "descartada"] as const) {
      for (const acao of ["editar", "aprovar", "descartar", "abrir_canal", "confirmar_envio"] as const) {
        expect(acaoPermitida(acao, estado)).toBe(false);
      }
    }
  });
});
import { taxa, formatarTaxa, resultadosPorSegmento } from "./prospeccao-metricas";
import { canaisDisponiveis, linkDoCanal, linkWhatsapp } from "./prospeccao-canais";
import { gerarMensagemModelo, fatosPersonalizaveis } from "./prospeccao-mensagem";

describe("statusAposInteracao", () => {
  it("envio confirmado leva a contatado, mas não faz o funil voltar", () => {
    expect(statusAposInteracao("pronto_para_contato", "envio_confirmado")).toBe("contatado");
    expect(statusAposInteracao("em_conversa", "envio_confirmado")).toBeNull();
  });

  it("resposta → em conversa; reunião/proposta → reunião", () => {
    expect(statusAposInteracao("contatado", "resposta")).toBe("em_conversa");
    expect(statusAposInteracao("contatado", "proposta")).toBe("reuniao_proposta");
    expect(statusAposInteracao("reuniao_proposta", "resposta")).toBeNull();
  });

  it("nunca tira um lead de não contatar por interação comum", () => {
    expect(statusAposInteracao("nao_contatar", "resposta")).toBeNull();
    expect(statusAposInteracao("nao_contatar", "envio_confirmado")).toBeNull();
  });

  it("nota não muda status", () => {
    expect(statusAposInteracao("novo", "nota")).toBeNull();
  });
});

describe("métricas", () => {
  it("taxa sem denominador é nula; amostra pequena é sinalizada", () => {
    expect(taxa(0, 0)).toEqual({ valor: null, amostraPequena: false, numerador: 0, denominador: 0 });
    expect(taxa(2, 5).amostraPequena).toBe(true);
    expect(taxa(5, 20).amostraPequena).toBe(false);
    expect(formatarTaxa(taxa(1, 4))).toBe("25% (1/4)");
    expect(formatarTaxa(taxa(0, 0))).toBe("—");
  });

  it("por segmento: resposta só conta sobre contatos confirmados", () => {
    const leads = [
      { cat: "cervejaria", contatado: true, respondeu: true, reuniao: true, proposta: false, convertido: false },
      { cat: "cervejaria", contatado: true, respondeu: false, reuniao: false, proposta: false, convertido: false },
      // Respondeu sem envio confirmado (veio por conta própria): fora da taxa.
      { cat: "cervejaria", contatado: false, respondeu: true, reuniao: false, proposta: false, convertido: false },
      { cat: "bar", contatado: false, respondeu: false, reuniao: false, proposta: false, convertido: false },
    ];
    const [cerv, bar] = resultadosPorSegmento(leads, (l) => l.cat);
    expect(cerv).toMatchObject({ segmento: "cervejaria", leads: 3, contatados: 2, responderam: 1, reunioes: 1 });
    expect(cerv.taxaResposta.valor).toBe(0.5);
    expect(bar.taxaResposta.valor).toBeNull();
  });
});

describe("canais", () => {
  const contato = { telefone: "5541999998888", instagram: "casa.x", email: "a@x.com" };

  it("lista só os canais com contato", () => {
    expect(canaisDisponiveis(contato)).toEqual(["whatsapp", "instagram", "email"]);
    expect(canaisDisponiveis({ telefone: null, instagram: null, email: null })).toEqual([]);
  });

  it("wa.me com texto codificado", () => {
    expect(linkWhatsapp("55 41 99999-8888", "Oi, tudo bem?\nSou X & Y")).toBe(
      "https://wa.me/5541999998888?text=Oi%2C%20tudo%20bem%3F%0ASou%20X%20%26%20Y",
    );
  });

  it("e-mail com assunto e corpo; sem contato → null", () => {
    expect(linkDoCanal("email", contato, "Corpo", "Assunto")).toBe("mailto:a@x.com?subject=Assunto&body=Corpo");
    expect(linkDoCanal("instagram", contato, "x", null)).toBe("https://www.instagram.com/casa.x/");
    expect(linkDoCanal("whatsapp", { ...contato, telefone: null }, "x", null)).toBeNull();
  });
});

describe("mensagem modelo (sem IA)", () => {
  it("não afirma nada sobre o lead além do nome; e-mail ganha assunto", () => {
    const m = gerarMensagemModelo({ canal: "email", categoria: "cervejaria", nomeLead: "Casa X", nomeRemetente: "Pedro" });
    expect(m.assunto).toContain("Casa X");
    expect(m.conteudo).toContain("Aqui é Pedro, da Anjos Eventos.");
    const w = gerarMensagemModelo({ canal: "whatsapp", categoria: "espaco_eventos", nomeLead: "Casa X", nomeRemetente: "Pedro" });
    expect(w.assunto).toBeNull();
    expect(w.conteudo).not.toContain("Casa X");
  });

  it("só fato verificado pode personalizar", () => {
    const evs = [
      { id: 1, fato: "a", url: null, natureza: "fato", verificacao: "verificado" },
      { id: 2, fato: "b", url: null, natureza: "inferencia", verificacao: "verificado" },
      { id: 3, fato: "c", url: null, natureza: "fato", verificacao: "a_verificar" },
    ] as const;
    expect(fatosPersonalizaveis([...evs]).map((e) => e.id)).toEqual([1]);
  });
});
