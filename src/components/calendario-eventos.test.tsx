import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Evento } from "@/lib/eventos";
import { CalendarioEventos } from "./calendario-eventos";

const evento = (id: number, cliente: string, local: string, empresa = "Buffet Senhor Churrasco"): Evento =>
  ({ id, cliente, data_evento: new Date(local).toISOString(), empresa_nome: empresa, status: "confirmado" }) as Evento;

const eventos = [
  evento(1, "Oi", "2026-10-29T09:11:00"),
  evento(2, "cliente1", "2026-10-10T12:00:00"),
  evento(3, "Casamento", "2026-10-29T18:00:00", "Anjos Cerimonial"),
];

describe("CalendarioEventos — celular", () => {
  it("mostra a grade mensal (links por dia com rótulo acessível) e a lista do mês sem dia escolhido", () => {
    const html = renderToStaticMarkup(<CalendarioEventos eventos={eventos} mesParam="2026-10" />);
    expect(html).toContain('aria-label="29 de outubro, 2 eventos"');
    expect(html).toContain('aria-label="10 de outubro, 1 evento"');
    expect(html).toContain('aria-label="5 de outubro, sem eventos"');
    expect(html).toContain("/agenda?visao=agenda&amp;mes=2026-10&amp;dia=29#eventos-do-dia");
    expect(html).toContain("cliente1");
  });

  it("com dia escolhido mostra só os eventos daquele dia, por horário, e o link para o mês inteiro", () => {
    const html = renderToStaticMarkup(<CalendarioEventos eventos={eventos} mesParam="2026-10" diaParam="29" />);
    const aposInicio = html.slice(html.indexOf('id="eventos-do-dia"'));
    const secao = aposInicio.slice(0, aposInicio.indexOf("</section>"));
    expect(secao.indexOf("Oi")).toBeLessThan(secao.indexOf("Casamento"));
    expect(secao).not.toContain("cliente1");
    expect(secao).toContain("Ver o mês inteiro");
    expect(html).toContain('aria-current="date"');
  });

  it("dia sem evento avisa; mês inválido cai no mês atual sem quebrar", () => {
    expect(renderToStaticMarkup(<CalendarioEventos eventos={eventos} mesParam="2026-10" diaParam="5" />)).toContain(
      "Nenhum evento neste dia.",
    );
    expect(() => renderToStaticMarkup(<CalendarioEventos eventos={eventos} mesParam="lixo" />)).not.toThrow();
  });

  it("os links de mês não carregam o dia escolhido", () => {
    const html = renderToStaticMarkup(<CalendarioEventos eventos={eventos} mesParam="2026-10" diaParam="29" />);
    expect(html).toContain('href="/agenda?visao=agenda&amp;mes=2026-09"');
    expect(html).toContain('href="/agenda?visao=agenda&amp;mes=2026-11"');
  });
});
