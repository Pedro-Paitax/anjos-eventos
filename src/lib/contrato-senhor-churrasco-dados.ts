import type { Evento } from "@/lib/eventos";
import { formatarHora, formatarValor, paraInputTime } from "@/lib/formatacao";
import { inteiroPorExtenso, valorPorExtenso } from "@/lib/valor-por-extenso";

/**
 * Contrato de Prestação de Serviços de Buffet do Senhor Churrasco.
 * Texto adaptado do contrato em Word que o Pedro usava (decisões de 2026-11-24 em
 * docs/REGRAS_NEGOCIO.md, seção "Contrato do Senhor Churrasco"). O resumo do evento
 * vira o Anexo I.
 */

export type PreparoContrato = { preparoNome: string; categoria?: string | null };
type Campo = [rotulo: string, valor: string, principal?: boolean];
type ItemValor = [descricao: string, quantidade: number | null, unitario: number | null, subtotal: number | null];
export type BlocoContrato = { tipo: "clausula" | "item"; rotulo: string; texto: string };
export type SecaoContrato = { titulo: string; blocos: BlocoContrato[] };

/** Dados fixos da contratada (do contrato em Word do Pedro). */
export const CONTRATADA = {
  nomeFantasia: "Senhor Churrasco",
  responsavel: "Pedro Paitax",
  cnpj: "12.693.950/0001-28",
  endereco: "Rua Henrique Correia, nº 1399, Bairro Alto, CEP 82.840-270, Curitiba – PR",
} as const;

export const PERCENTUAL_SINAL = 25;
const DIAS_PRAZO_RESTANTE = 7;
const LACUNA = "____________________";

const CATEGORIAS = [
  ["Entradas", ["Entrada"], "cardapio_entrada"],
  ["Carnes", ["Carnes"], "cardapio_carnes"],
  ["Saladas e acompanhamentos", ["Saladas", "Guarnições", "Massas", "Molhos"], null],
  ["Sobremesa", ["Sobremesa"], "cardapio_sobremesa"],
  ["Bebidas", ["Bebidas"], "cardapio_bebidas"],
] as const;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function numero(valor: string | null): number | null {
  if (!valor?.trim()) return null;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

const moeda = (valor: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
const valorTexto = (valor: number | null) => (valor == null ? "R$ " + LACUNA : `${moeda(valor)} (${valorPorExtenso(valor)})`);
const ordinal = (n: number) => n + "ª";
const doisDigitos = (n: number) => String(n).padStart(2, "0");
const dataCurtaDe = (d: Date) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;

/** Lê o dia do evento com os getters locais, como o resto do app (chaveDiaEvento). */
function diaDoEvento(data: string | Date): Date {
  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [a, m, d] = data.split("-").map(Number);
    return new Date(a, m - 1, d);
  }
  return new Date(data);
}

function lista(itens: string[]): string {
  return itens.length <= 1 ? (itens[0] ?? "") : itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
}

function quantidade(n: number, singular: string, plural: string, feminino = false): string {
  return `${n} (${inteiroPorExtenso(n, feminino)}) ${n === 1 ? singular : plural}`;
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

/** Itens da tabela de valores. Crianças até 5 anos não pagam e de 5 a 10 pagam meia (cláusula de crianças). */
function montarItens(evento: Evento): ItemValor[] {
  const linhas: Array<[string, number | null, number | null]> = [
    ["Adultos", evento.qtd_adultos, numero(evento.preco_pessoa)],
    ["Crianças de 5 a 10 anos (meia)", evento.qtd_criancas_5_a_10, numero(evento.preco_crianca_meia)],
    ["Crianças até 5 anos", evento.qtd_criancas_ate_5, 0],
    ["Garçons", evento.qtd_garcons, numero(evento.valor_garcom)],
  ];
  const itens: ItemValor[] = [];
  for (const [descricao, qtd, unitario] of linhas) {
    if (qtd != null && qtd > 0) itens.push([descricao, qtd, unitario, unitario == null ? null : qtd * unitario]);
  }
  const taxa = numero(evento.taxa_deslocamento);
  if (taxa != null && taxa !== 0) itens.push(["Taxa de deslocamento", null, null, taxa]);
  return itens;
}

/**
 * Indica se o total do evento difere da soma dos itens do contrato. Aparece só
 * na tela do evento, nunca no documento do cliente.
 */
export function contratoDivergeDoTotal(evento: Evento): boolean {
  const total = numero(evento.valor);
  const itens = montarItens(evento);
  if (total === null || itens.length === 0 || itens.some((item) => item[3] === null)) return false;
  const soma = itens.reduce((s, item) => s + Math.round((item[3] ?? 0) * 100), 0);
  return Math.round(total * 100) !== soma;
}

export function montarDadosContratoSenhorChurrasco(evento: Evento, preparos: readonly PreparoContrato[]) {
  const cardapio = montarCardapio(evento, preparos);
  // Sem cardápio = só a taxa de serviço: pagamento integral no dia, sem sinal (decisão de 2026-11-24).
  const servicoCompleto = cardapio.length > 0;
  const itens = montarItens(evento);
  const total = numero(evento.valor);
  const taxa = numero(evento.taxa_deslocamento);
  const precoPessoa = numero(evento.preco_pessoa);
  const pix = evento.chave_pix?.trim() || null;
  const local = evento.endereco_evento?.trim() || null;

  const dia = diaDoEvento(evento.data_evento);
  const hora = formatarHora(evento.data_evento).replace(":", "h");
  const dataExtenso = `${dia.getDate()} de ${MESES[dia.getMonth()]} de ${dia.getFullYear()}`;
  const prazoRestante = dataCurtaDe(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() - DIAS_PRAZO_RESTANTE));

  const sinal = servicoCompleto && total !== null ? Math.round(total * PERCENTUAL_SINAL) / 100 : null;
  const restante = sinal !== null && total !== null ? Math.round((total - sinal) * 100) / 100 : null;

  const faixas: string[] = [];
  if (evento.qtd_adultos) faixas.push(`${evento.qtd_adultos} ${evento.qtd_adultos === 1 ? "adulto" : "adultos"}`);
  if (evento.qtd_criancas_5_a_10) faixas.push(`${evento.qtd_criancas_5_a_10} ${evento.qtd_criancas_5_a_10 === 1 ? "criança" : "crianças"} de 5 a 10 anos`);
  if (evento.qtd_criancas_ate_5) faixas.push(`${evento.qtd_criancas_ate_5} ${evento.qtd_criancas_ate_5 === 1 ? "criança" : "crianças"} até 5 anos`);
  const totalConvidados = (evento.qtd_adultos ?? 0) + (evento.qtd_criancas_5_a_10 ?? 0) + (evento.qtd_criancas_ate_5 ?? 0);

  // Cláusulas numeradas na ordem em que aparecem; referências entre elas usam a chave.
  const secoes: Array<{ titulo: string; blocos: Array<BlocoContrato & { chave?: string }> }> = [];
  const secao = (titulo: string) => {
    const nova = { titulo, blocos: [] as Array<BlocoContrato & { chave?: string }> };
    secoes.push(nova);
    return (texto: string, chave?: string) => nova.blocos.push({ tipo: "clausula", rotulo: "", texto, chave });
  };

  let clausula = secao("Do objeto do contrato");
  clausula(
    "É objeto do presente contrato a prestação, pela CONTRATADA à CONTRATANTE, de serviços de buffet de churrasco " +
      `no evento que se realizará em ${dataExtenso}, às ${hora}, ${local ? "em " + local : "no endereço " + LACUNA + LACUNA}.`,
  );
  clausula(
    (totalConvidados > 0
      ? `O evento${evento.tipo_evento?.trim() ? " (" + evento.tipo_evento.trim() + ")" : ""} contará com ${totalConvidados} ${totalConvidados === 1 ? "convidado" : "convidados"}: ${lista(faixas)}.`
      : `O evento${evento.tipo_evento?.trim() ? " (" + evento.tipo_evento.trim() + ")" : ""} contará com ${LACUNA} convidados.`) +
      (evento.qtd_fornecedores ? ` Também estarão presentes ${quantidade(evento.qtd_fornecedores, "profissional", "profissionais")} de outros fornecedores.` : ""),
    "convidados",
  );

  if (servicoCompleto) {
    const cardapioSecao = secao("Do cardápio");
    cardapioSecao(
      `A CONTRATADA se compromete a fornecer o cardápio escolhido pela CONTRATANTE${precoPessoa !== null ? ", ao valor de " + valorTexto(precoPessoa) + " por pessoa" : ""}:`,
    );
    const blocosCardapio = secoes[secoes.length - 1].blocos;
    for (const [rotulo, valor] of cardapio) blocosCardapio.push({ tipo: "item", rotulo: rotulo + ":", texto: valor + "." });
  }

  clausula = secao("Obrigações da contratante");
  clausula(
    "A CONTRATANTE deverá fornecer à CONTRATADA todas as informações necessárias à realização adequada do serviço de buffet, " +
      "especificando os detalhes do evento e a forma como o serviço deverá ser prestado.",
  );
  clausula("A CONTRATANTE deverá efetuar o pagamento na forma e nas condições estabelecidas na Cláusula {pagamento}.");

  clausula = secao("Obrigações da contratada");
  clausula(
    "A CONTRATADA será responsável pelo fornecimento de pratos, talheres, taças, bandejas, réchauds, guardanapos e demais " +
      "utensílios necessários para servir os pratos quentes e as saladas.",
  );
  const equipe: string[] = [];
  if (evento.qtd_garcons) {
    const valorGarcom = numero(evento.valor_garcom);
    equipe.push(quantidade(evento.qtd_garcons, "garçom", "garçons") + (valorGarcom !== null ? ", pelo valor de " + valorTexto(evento.qtd_garcons * valorGarcom) : ""));
  }
  if (evento.qtd_churrasqueiros) equipe.push(quantidade(evento.qtd_churrasqueiros, "churrasqueiro", "churrasqueiros"));
  if (evento.qtd_copeiras) equipe.push(quantidade(evento.qtd_copeiras, "copeira", "copeiras", true));
  if (equipe.length) clausula(`A CONTRATADA fornecerá a seguinte equipe para a prestação dos serviços: ${lista(equipe)}.`);

  clausula = secao("Do preço e das condições de pagamento");
  clausula(
    `O serviço contratado será remunerado pela quantia total de ${valorTexto(total)}` +
      (taxa ? `, já incluída a taxa de deslocamento de ${valorTexto(taxa)}` : "") +
      ", conforme o detalhamento do Anexo I.",
  );
  const chave = pix ? `, na chave ${pix}` : ", na chave informada pela CONTRATADA";
  clausula(
    servicoCompleto
      ? `O pagamento será feito por PIX${chave}, da seguinte forma: sinal de ${PERCENTUAL_SINAL}% (vinte e cinco por cento), ` +
          `no valor de ${valorTexto(sinal)}, na assinatura deste contrato, a título de garantia; e o restante, no valor de ` +
          `${valorTexto(restante)}, até ${DIAS_PRAZO_RESTANTE} (sete) dias antes do evento, ou seja, até ${prazoRestante}.`
      : `O valor total será pago integralmente no dia do evento, por PIX${chave}, sem sinal.`,
    "pagamento",
  );

  if (servicoCompleto) {
    clausula = secao("Do inadimplemento");
    clausula(
      "Em caso de não pagamento, por parte da CONTRATANTE, do valor devido até 7 (sete) dias antes do evento, " +
        "a CONTRATADA fica eximida da obrigação de prestar o serviço.",
    );
  }

  clausula = secao("Da devolução");
  clausula(
    "Todos os utensílios e objetos fornecidos pela CONTRATADA deverão ser devolvidos em perfeito estado de conservação, " +
      "sob pena de a CONTRATANTE arcar com os respectivos valores de reposição. Pratos, pratinhos e copos quebrados por " +
      "convidados durante o evento serão cobrados a R$ 28,00, R$ 24,00 e R$ 16,00 por unidade, respectivamente.",
  );
  secoes[secoes.length - 1].blocos.push({ tipo: "clausula", rotulo: "Parágrafo único.", texto: "Os valores de reposição deverão ser pagos ao final do evento." });

  clausula = secao(servicoCompleto ? "Do cancelamento e da remarcação" : "Da remarcação");
  if (servicoCompleto) {
    clausula(
      "Se a CONTRATANTE cancelar o evento até 2 (dois) dias antes da data marcada, receberá de volta 50% (cinquenta por cento) " +
        "do sinal e todo valor pago além do sinal. Se cancelar com menos de 2 (dois) dias, perderá o sinal integralmente, " +
        "recebendo de volta apenas o valor pago além dele.",
    );
    clausula("Se a CONTRATADA cancelar o evento, devolverá à CONTRATANTE 100% (cem por cento) dos valores pagos.");
  }
  clausula(
    "A data do evento poderá ser remarcada, sem custo, desde que a CONTRATANTE avise com no mínimo 7 (sete) dias de " +
      "antecedência e que a CONTRATADA tenha disponibilidade na nova data.",
  );

  clausula = secao("Das condições gerais");
  clausula(
    "Se o número de pessoas exceder o confirmado, a CONTRATANTE pagará por cada pessoa excedente. Se comparecerem menos " +
      "pessoas, o pagamento será feito pelo número confirmado na Cláusula {convidados}. A CONTRATADA estará preparada para " +
      "atender até 10% (dez por cento) a mais de convidados, cabendo à CONTRATANTE pagar o excedente ao final do evento.",
  );
  clausula(
    "Fica convencionado entre as partes que crianças até 5 anos não pagam e crianças de 5 a 10 anos pagam meia. " +
      "Profissionais presentes no evento pagam o valor integral do buffet.",
  );
  clausula(
    "O buffet será servido à vontade pelo tempo máximo de 4 (quatro) horas, contadas do início do serviço no evento. " +
      "O tempo excedente será cobrado a R$ 50,00 (cinquenta reais) por hora, por funcionário.",
  );
  clausula(
    "Qualquer alteração, modificação, complementação ou ajuste somente será reconhecido e produzirá efeitos legais se " +
      "incorporado ao presente contrato por Termo Aditivo assinado pelas partes.",
  );

  clausula = secao("Do foro");
  clausula("Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de Curitiba – PR.");

  let n = 0;
  const numeros = new Map<string, string>();
  for (const s of secoes) {
    for (const b of s.blocos) {
      if (b.tipo === "clausula" && !b.rotulo) {
        b.rotulo = `Cláusula ${ordinal(++n)}.`;
        if (b.chave) numeros.set(b.chave, ordinal(n));
      }
    }
  }
  const secoesFinais: SecaoContrato[] = secoes.map((s) => ({
    titulo: s.titulo,
    blocos: s.blocos.map(({ tipo, rotulo, texto }) => ({
      tipo,
      rotulo,
      texto: texto.replace(/\{(\w+)\}/g, (_, chaveRef: string) => numeros.get(chaveRef) ?? chaveRef),
    })),
  }));

  // Anexo I – Resumo do evento.
  const principais: Campo[] = [
    ["Contratante", evento.cliente, true],
    ["Data e hora", `${dataCurtaDe(dia)} às ${hora}`, true],
  ];
  if (totalConvidados > 0) principais.push(["Convidados", totalConvidados + (totalConvidados === 1 ? " pessoa" : " pessoas"), true]);
  const detalhes: Campo[] = [];
  const contato = [evento.contato?.trim(), evento.telefone?.trim()].filter(Boolean).join(" · ");
  if (contato) detalhes.push(["Contato", contato]);
  if (evento.tipo_evento?.trim()) detalhes.push(["Tipo de evento", evento.tipo_evento.trim()]);
  const horarios: Campo[] = [];
  for (const [rotulo, horario] of [
    ["Chegada da equipe", evento.hora_chegada_equipe],
    ["Aperitivos", evento.hora_aperitivo],
    ["Refeição", evento.hora_almoco],
    ["Limpeza e finalização", evento.hora_encerramento],
  ] as const) {
    if (horario) horarios.push([rotulo, paraInputTime(horario).replace(":", "h")]);
  }
  const parcelas: Array<[string, string]> = servicoCompleto
    ? [
        [`Sinal (${PERCENTUAL_SINAL}%) · na assinatura`, sinal === null ? "A preencher" : moeda(sinal)],
        [`Restante · até ${prazoRestante}`, restante === null ? "A preencher" : moeda(restante)],
      ]
    : [["Pagamento integral · no dia do evento", total === null ? "A preencher" : moeda(total)]];

  return {
    titulo: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BUFFET",
    servicoCompleto,
    partes: [
      ["CONTRATANTE:", `${evento.cliente}, inscrito(a) no CPF sob o nº ${LACUNA}, residente em ${LACUNA}${LACUNA}${LACUNA}.`],
      [
        "CONTRATADA:",
        `${CONTRATADA.nomeFantasia} (${CONTRATADA.responsavel}), com sede na ${CONTRATADA.endereco}, inscrita no CNPJ sob o ` +
          `nº ${CONTRATADA.cnpj} e no Cadastro Estadual como isenta, neste ato representada por ${CONTRATADA.responsavel}.`,
      ],
    ] as Array<[string, string]>,
    preambulo:
      "As partes acima identificadas têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços de Buffet, " +
      "que se regerá pelas cláusulas seguintes e pelas condições de preço, forma e prazo de pagamento nele descritas.",
    secoes: secoesFinais,
    fechamento:
      "Por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor, juntamente com 2 (duas) testemunhas.",
    localData: "Curitiba, ____ de ____________________ de ________.",
    anexo: {
      principais,
      local: local ?? "A preencher",
      detalhes,
      horarios,
      itens,
      total: total == null ? "A preencher" : (formatarValor(String(total)) ?? "A preencher"),
      parcelas,
      pix: pix ? "Pagamento por PIX: " + pix : null,
    },
    referencia: "Evento nº " + evento.id + " · " + dataCurtaDe(dia) + " · Senhor Churrasco",
  };
}
