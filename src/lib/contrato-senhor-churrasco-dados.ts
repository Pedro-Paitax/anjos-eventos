import type { Evento } from "@/lib/eventos";
import { formatarHora, formatarValor, paraInputTime } from "@/lib/formatacao";

export type PreparoContrato = { preparoNome: string; categoria?: string | null };
type Campo = [rotulo: string, valor: string, principal?: boolean];
type ItemValor = [descricao: string, quantidade: number | null, unitario: number | null, subtotal: number | null];

const CATEGORIAS = [
  ["Aperitivos", ["Entrada"], "cardapio_entrada"],
  ["Carnes", ["Carnes"], "cardapio_carnes"],
  ["Saladas e acompanhamentos", ["Saladas", "Guarnições", "Massas", "Molhos"], null],
  ["Sobremesa", ["Sobremesa"], "cardapio_sobremesa"],
  ["Bebidas", ["Bebidas"], "cardapio_bebidas"],
] as const;

function numero(valor: string | null): number | null {
  if (!valor?.trim()) return null;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

function dataCurta(data: string | Date): string {
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data.split("-").reverse().join("/");
  }
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

function montarCardapio(evento: Evento, preparos: readonly PreparoContrato[]): Campo[] {
  const porCategoria: Campo[] = [];
  const outros = new Set(preparos.map((p) => p.preparoNome));
  for (const [rotulo, categorias, legado] of CATEGORIAS) {
    const nomes = preparos.filter((p) => categorias.some((c) => c === p.categoria)).map((p) => p.preparoNome);
    for (const nome of nomes) outros.delete(nome);
    const textoLegado = legado ? evento[legado] : [evento.cardapio_saladas, evento.cardapio_acompanhamentos].filter(Boolean).join("; ");
    const valor = nomes.length ? [...new Set(nomes)].join(", ") : textoLegado?.trim();
    if (valor) porCategoria.push([rotulo, valor]);
  }
  if (outros.size) porCategoria.push(["Outros itens", [...outros].join(", ")]);
  return porCategoria;
}

export function montarDadosContratoSenhorChurrasco(evento: Evento, preparos: readonly PreparoContrato[]) {
  const convidados: Array<[string, number | null, number | null]> = [
    ["Adultos", evento.qtd_adultos, numero(evento.preco_pessoa)],
    ["Crianças de 5 a 10 anos", evento.qtd_criancas_5_a_10, numero(evento.preco_crianca_meia)],
    // A precificação atual usa meia nas duas faixas. Registros manuais legados
    // podem ter gratuidade para a faixa menor, sem um preço separado no cadastro.
    ["Crianças de 0 a 5 anos", evento.qtd_criancas_ate_5, preparos.length ? numero(evento.preco_crianca_meia) : null],
  ];
  const quantidadeSalva = convidados.some(([, qtd]) => qtd != null);
  const totalConvidados = convidados.reduce((total, [, qtd]) => total + (qtd ?? 0), 0);
  const itens: ItemValor[] = [];
  for (const [descricao, qtd, unitario] of [...convidados, ["Garçons", evento.qtd_garcons, numero(evento.valor_garcom)] as const]) {
    if (qtd != null && qtd > 0) itens.push([descricao, qtd, unitario, unitario == null ? null : qtd * unitario]);
  }
  const taxa = numero(evento.taxa_deslocamento);
  if (taxa != null && taxa !== 0) itens.push(["Taxa de deslocamento", null, null, taxa]);

  const total = numero(evento.valor);
  const itensComValor = itens.length > 0 && itens.every((item) => item[3] !== null);
  const subtotalEmCentavos = itens.reduce((soma, item) => soma + Math.round((item[3] ?? 0) * 100), 0);
  const detalhamentoDiverge = total !== null && itensComValor && Math.round(total * 100) !== subtotalEmCentavos;

  const equipe: Campo[] = [];
  const equipeSalva = [
    ["Garçom", "Garçons", evento.qtd_garcons],
    ["Churrasqueiro", "Churrasqueiros", evento.qtd_churrasqueiros],
    ["Copeira", "Copeiras", evento.qtd_copeiras],
  ] as const;
  for (const [singular, plural, quantidade] of equipeSalva) {
    if (quantidade != null && quantidade > 0) equipe.push([quantidade === 1 ? singular : plural, String(quantidade)]);
  }

  const pagamento: Campo[] = [];
  if (evento.chave_pix?.trim()) pagamento.push(["Chave PIX", evento.chave_pix.trim()]);
  if (evento.prazo_pagamento) pagamento.push(["Vencimento", dataCurta(evento.prazo_pagamento)]);

  const principais: Campo[] = [
    ["Cliente", evento.cliente, true],
    ["Data e hora do evento", dataCurta(evento.data_evento) + " às " + formatarHora(evento.data_evento), true],
  ];
  if (quantidadeSalva) principais.push(["Convidados", totalConvidados + (totalConvidados === 1 ? " pessoa" : " pessoas"), true]);
  const detalhes: Campo[] = [];
  if (evento.contato?.trim()) detalhes.push(["Contato", evento.contato]);
  if (evento.telefone?.trim()) detalhes.push(["Telefone", evento.telefone]);
  if (evento.tipo_evento?.trim()) detalhes.push(["Tipo de evento", evento.tipo_evento]);

  const horarios: Campo[] = [];
  const horariosSalvos = [
    ["Chegada da equipe", evento.hora_chegada_equipe],
    ["Aperitivos", evento.hora_aperitivo],
    ["Refeição", evento.hora_almoco],
    ["Limpeza e finalização", evento.hora_encerramento],
  ] as const;
  for (const [rotulo, horario] of horariosSalvos) {
    if (horario) horarios.push([rotulo, paraInputTime(horario).replace(":", "h")]);
  }

  return {
    principais,
    local: evento.endereco_evento?.trim() || "A preencher",
    detalhes,
    horarios,
    cardapio: montarCardapio(evento, preparos),
    equipe,
    itens,
    total: total == null ? "A preencher" : (formatarValor(String(total)) ?? "A preencher"),
    detalhamentoDiverge,
    pagamento,
    referencia: "Evento nº " + evento.id + " · " + dataCurta(evento.data_evento) + " · Senhor Churrasco",
  };
}
