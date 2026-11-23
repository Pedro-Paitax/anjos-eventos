/**
 * Checklist de carregamento do Senhor Churrasco (docs/specs/SPEC_CHECKLIST_CARREGAMENTO.md).
 * Funções puras: recebem o que veio do banco (cardápio confirmado, decisões operacionais, cadastro
 * de itens de carga, marcações das fichas e temperos das fichas) e devolvem as categorias prontas
 * para o PDF. Sem acesso ao banco aqui (ver checklist-carregamento-dados.ts).
 */

/** Ordem das categorias no PDF (seção 2 do spec). */
export const ORDEM_CATEGORIAS_CHECKLIST = [
  "Talheres de serviço",
  "Churrasco",
  "Limpeza",
  "Temperos",
  "Louças e servir",
  "Bebidas",
  "Equipamentos",
  "Descartáveis",
  "Pratos",
  "Talheres dos convidados",
  "Taças e copos",
  "Equipe",
  "Comida",
] as const;

export const SUBGRUPO_DO_CARDAPIO = "Do cardápio";

export type ItemCargaCadastro = {
  id: number;
  nome: string;
  categoria: string;
  subgrupo: string | null;
  sempre: boolean;
  marcavelFicha: boolean;
  regra: string | null;
  insumoId: number | null;
  ordem: number;
};

export type PreparoChecklist = { id: number; nome: string; categoria: string };
export type MarcacaoFicha = { preparoId: number; itemCargaId: number };
export type TemperoFicha = { preparoId: number; insumoId: number; nome: string };

export type DecisoesChecklist = {
  modeloPrato: string | null;
  sousplat: boolean;
  tipoBebidaRecipiente: string | null;
  tacaFurtaCor: boolean;
  qtdTacaFurtaCor: number | null;
  tacaChampanhe: boolean;
  qtdTacaChampanhe: number | null;
  tipoTalher: string | null;
};

export type EntradaChecklist = {
  tipoEvento: string | null;
  /** Preparos do cardápio confirmado (sem repetição). */
  preparos: PreparoChecklist[];
  /** null = o evento não tem linha de decisões operacionais. */
  decisoes: DecisoesChecklist | null;
  /** Só itens ativos. */
  itensCarga: ItemCargaCadastro[];
  marcacoes: MarcacaoFicha[];
  temperosFicha: TemperoFicha[];
};

/** `aDefinir`: decisão operacional não preenchida (sai sem quadrado, em cinza). */
export type LinhaChecklist = { texto: string; nota?: string; aDefinir?: boolean };
export type SubgrupoChecklist = { nome: string; itens: LinhaChecklist[] };
export type CategoriaChecklist = { titulo: string; itens: LinhaChecklist[]; sub: SubgrupoChecklist[] };

export type Checklist = {
  categorias: CategoriaChecklist[];
  /** Nomes dos preparos do cardápio sem nenhum item de carga marcado (C21). */
  fichasSemItens: string[];
};

export const TEXTO_A_DEFINIR = "a definir nas Decisões Operacionais";

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Casamento = tipo_evento contém "casamento", sem diferenciar maiúsculas e acentos (seção 8.2). */
export function ehCasamento(tipoEvento: string | null | undefined): boolean {
  return !!tipoEvento && semAcento(tipoEvento).includes("casamento");
}

const comparaNome = (a: string, b: string) => a.localeCompare(b, "pt-BR");
const porOrdem = (a: ItemCargaCadastro, b: ItemCargaCadastro) => a.ordem - b.ordem || comparaNome(a.nome, b.nome);
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

function linhaFixa(item: ItemCargaCadastro, totalPreparos: number): LinhaChecklist {
  if (item.regra === "dois_por_preparo") {
    return {
      texto: `${item.nome} (${totalPreparos * 2})`,
      nota: `2 x ${totalPreparos} ${plural(totalPreparos, "preparo", "preparos")}`,
    };
  }
  if (item.regra === "so_casamento") return { texto: item.nome, nota: "casamento" };
  return { texto: item.nome };
}

/** Categoria vinda do cadastro de itens de carga (+ temperos das fichas, em Temperos). */
function categoriaDoCadastro(titulo: string, e: EntradaChecklist, casamento: boolean): CategoriaChecklist {
  const nomesPreparo = new Map(e.preparos.map((p) => [p.id, p.nome]));
  const ordemPreparo = new Map(e.preparos.map((p, i) => [p.id, i]));
  const origens = (ids: Set<number>) =>
    [...ids].sort((a, b) => (ordemPreparo.get(a) ?? 0) - (ordemPreparo.get(b) ?? 0)).map((id) => nomesPreparo.get(id)!).join(", ");

  const daCategoria = e.itensCarga.filter((i) => i.categoria === titulo).sort(porOrdem);

  // Fixos: sempre vão (salvo a regra de casamento).
  const fixos = daCategoria.filter((i) => i.sempre && (i.regra !== "so_casamento" || casamento));

  // Marcados nas fichas do cardápio; os que já são fixos não se repetem.
  const marcadosPor = new Map<number, Set<number>>();
  for (const m of e.marcacoes) {
    if (!nomesPreparo.has(m.preparoId)) continue;
    if (!marcadosPor.has(m.itemCargaId)) marcadosPor.set(m.itemCargaId, new Set());
    marcadosPor.get(m.itemCargaId)!.add(m.preparoId);
  }
  const doCardapio: LinhaChecklist[] = daCategoria
    .filter((i) => !i.sempre && marcadosPor.has(i.id))
    .map((i) => ({ texto: i.nome, nota: origens(marcadosPor.get(i.id)!) }));

  if (titulo === "Temperos") {
    // Insumo já coberto por um tempero fixo (ligado pelo insumo_id) não se repete.
    const cobertos = new Set(e.itensCarga.filter((i) => i.insumoId != null).map((i) => i.insumoId!));
    const porInsumo = new Map<number, { nome: string; preparos: Set<number> }>();
    for (const t of e.temperosFicha) {
      if (!nomesPreparo.has(t.preparoId) || cobertos.has(t.insumoId)) continue;
      if (!porInsumo.has(t.insumoId)) porInsumo.set(t.insumoId, { nome: t.nome, preparos: new Set() });
      porInsumo.get(t.insumoId)!.preparos.add(t.preparoId);
    }
    const temperos = [...porInsumo.values()]
      .sort((a, b) => comparaNome(a.nome, b.nome))
      .map((t) => ({ texto: t.nome, nota: origens(t.preparos) }));
    doCardapio.push(...temperos);
  }

  const itens: LinhaChecklist[] = [];
  const sub: SubgrupoChecklist[] = [];
  for (const f of fixos) {
    const linha = linhaFixa(f, e.preparos.length);
    if (f.subgrupo == null) {
      itens.push(linha);
      continue;
    }
    let grupo = sub.find((s) => s.nome === f.subgrupo);
    if (!grupo) sub.push((grupo = { nome: f.subgrupo, itens: [] }));
    grupo.itens.push(linha);
  }
  if (doCardapio.length > 0) {
    if (sub.length > 0) sub.push({ nome: SUBGRUPO_DO_CARDAPIO, itens: doCardapio });
    else itens.push(...doCardapio);
  }
  return { titulo, itens, sub };
}

const ROTULO_PRATO: Record<string, string> = {
  "Redondo pequeno": "Pratos redondos pequenos",
  "Redondo grande": "Pratos redondos grandes",
  Quadrado: "Pratos quadrados",
};
const ROTULO_TALHER: Record<string, string> = { Grande: "Talheres grandes", Pequeno: "Talheres pequenos" };
const ROTULO_COPO_TACA: Record<string, string> = { Copo: "Copos", Taça: "Taças" };

const preenchido = (v: string | null | undefined): v is string => !!v && v.trim() !== "";
const aDefinir = (): LinhaChecklist => ({ texto: TEXTO_A_DEFINIR, aDefinir: true });
const comQuantidade = (texto: string, q: number | null): LinhaChecklist =>
  q != null ? { texto, nota: `${q} un.` } : { texto };

/** Pratos, Talheres dos convidados e Taças e copos (C16): decisão vazia sai como "a definir". */
function categoriaDasDecisoes(titulo: string, d: DecisoesChecklist | null): CategoriaChecklist {
  const itens: LinhaChecklist[] = [];
  if (titulo === "Pratos") {
    const modelo = d?.modeloPrato;
    itens.push(preenchido(modelo) ? { texto: ROTULO_PRATO[modelo] ?? `Pratos: ${modelo}` } : aDefinir());
    if (d?.sousplat) itens.push({ texto: "Sousplat" });
  } else if (titulo === "Talheres dos convidados") {
    const talher = d?.tipoTalher;
    itens.push(preenchido(talher) ? { texto: ROTULO_TALHER[talher] ?? `Talheres: ${talher}` } : aDefinir());
  } else {
    const tipo = d?.tipoBebidaRecipiente;
    itens.push(preenchido(tipo) ? { texto: ROTULO_COPO_TACA[tipo] ?? tipo } : aDefinir());
    if (d?.tacaFurtaCor) itens.push(comQuantidade("Taças furta-cor", d.qtdTacaFurtaCor));
    if (d?.tacaChampanhe) itens.push(comQuantidade("Taças de champanhe", d.qtdTacaChampanhe));
  }
  return { titulo, itens, sub: [] };
}

const ORDEM_OUTROS = ["Entrada", "Guarnições", "Massas", "Molhos", "Bebidas", "Sobremesa"];

/** Comida (C22): uma linha por preparo; Carnes, Saladas e Outros (as demais categorias). */
function categoriaComida(preparos: PreparoChecklist[]): CategoriaChecklist {
  const nomes = (lista: PreparoChecklist[]) => lista.map((p) => ({ texto: p.nome }));
  const carnes = preparos.filter((p) => p.categoria === "Carnes").sort((a, b) => comparaNome(a.nome, b.nome));
  const saladas = preparos.filter((p) => p.categoria === "Saladas").sort((a, b) => comparaNome(a.nome, b.nome));
  const posicao = (c: string) => (ORDEM_OUTROS.includes(c) ? ORDEM_OUTROS.indexOf(c) : ORDEM_OUTROS.length);
  const outros = preparos
    .filter((p) => p.categoria !== "Carnes" && p.categoria !== "Saladas")
    .sort((a, b) => posicao(a.categoria) - posicao(b.categoria) || comparaNome(a.nome, b.nome));
  const sub = [
    { nome: "Carnes", itens: nomes(carnes) },
    { nome: "Saladas", itens: nomes(saladas) },
    { nome: "Outros", itens: nomes(outros) },
  ].filter((s) => s.itens.length > 0);
  return { titulo: "Comida", itens: [], sub };
}

export function montarChecklist(e: EntradaChecklist): Checklist {
  const casamento = ehCasamento(e.tipoEvento);
  const categorias: CategoriaChecklist[] = [];
  for (const titulo of ORDEM_CATEGORIAS_CHECKLIST) {
    let c: CategoriaChecklist;
    if (titulo === "Pratos" || titulo === "Talheres dos convidados" || titulo === "Taças e copos") {
      c = categoriaDasDecisoes(titulo, e.decisoes);
    } else if (titulo === "Comida") {
      c = categoriaComida(e.preparos);
    } else {
      c = categoriaDoCadastro(titulo, e, casamento);
    }
    // Categoria sem item no evento não aparece.
    if (c.itens.length > 0 || c.sub.some((s) => s.itens.length > 0)) categorias.push(c);
  }

  const comItens = new Set(e.marcacoes.map((m) => m.preparoId));
  const fichasSemItens = e.preparos.filter((p) => !comItens.has(p.id)).map((p) => p.nome);
  return { categorias, fichasSemItens };
}

// ---------- cabeçalho ----------

/** "80 adultos · 6 crianças" (crianças = até 5 + 5 a 10). Sem nenhum número: null. */
export function formatarConvidadosChecklist(
  adultos: number | null,
  criancasAte5: number | null,
  criancas5a10: number | null,
): string | null {
  if (adultos == null && criancasAte5 == null && criancas5a10 == null) return null;
  const criancas = (criancasAte5 ?? 0) + (criancas5a10 ?? 0);
  const partes = [`${adultos ?? 0} ${plural(adultos ?? 0, "adulto", "adultos")}`];
  if (criancas > 0) partes.push(`${criancas} ${plural(criancas, "criança", "crianças")}`);
  return partes.join(" · ");
}

/** "09:00:00" → "09:00". */
export function formatarHoraChegada(hora: string | null): string | null {
  const m = hora?.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
}

/** "sáb, 12/12/2026". */
export function formatarDataChecklist(data: string | Date): string {
  const d = new Date(data);
  const dia = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(d).replace(/\.$/, "");
  const numerica = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  return `${dia}, ${numerica}`;
}
