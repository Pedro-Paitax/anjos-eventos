import { describe, expect, it } from "vitest";
import {
  ehCasamento,
  formatarConvidadosChecklist,
  formatarHoraChegada,
  montarChecklist,
  SUBGRUPO_DO_CARDAPIO,
  TEXTO_A_DEFINIR,
  type CategoriaChecklist,
  type DecisoesChecklist,
  type EntradaChecklist,
  type ItemCargaCadastro,
} from "@/lib/checklist-carregamento";

let proximoId = 1;
function item(nome: string, categoria: string, extra: Partial<ItemCargaCadastro> = {}): ItemCargaCadastro {
  return {
    id: proximoId++,
    nome,
    categoria,
    subgrupo: null,
    sempre: true,
    marcavelFicha: false,
    regra: null,
    insumoId: null,
    ordem: proximoId,
    ...extra,
  };
}

const PEGADORES = item("Pegadores / colheres", "Talheres de serviço", { regra: "dois_por_preparo" });
const ESPATULA = item("Espátula de bolo", "Talheres de serviço", { regra: "so_casamento" });
const FACA = item("Faca do chef", "Talheres de serviço");
const SAL_GROSSO = item("Sal grosso", "Temperos", { subgrupo: "Fixos", insumoId: 42 });
const AZEITE_BUFFET = item("Azeite do buffet", "Temperos", { subgrupo: "Buffet" });
const TRAVESSA = item("Travessas de inox", "Louças e servir", { subgrupo: "Sempre", marcavelFicha: true });
const SALADEIRAS = item("Saladeiras", "Louças e servir", { sempre: false, marcavelFicha: true });
const SUQUEIRAS = item("Suqueiras", "Bebidas", { sempre: false, marcavelFicha: true });
const PROCESSADOR = item("Processador", "Equipamentos", { sempre: false, marcavelFicha: true });
const UNIFORMES = item("Uniformes", "Equipe");

const CADASTRO = [PEGADORES, ESPATULA, FACA, SAL_GROSSO, AZEITE_BUFFET, TRAVESSA, SALADEIRAS, SUQUEIRAS, PROCESSADOR, UNIFORMES];

const DECISOES: DecisoesChecklist = {
  modeloPrato: "Redondo grande",
  sousplat: true,
  tipoBebidaRecipiente: "Taça",
  tacaFurtaCor: false,
  qtdTacaFurtaCor: null,
  tacaChampanhe: true,
  qtdTacaChampanhe: 80,
  tipoTalher: "Grande",
};

const PREPAROS = [
  { id: 1, nome: "Fraldinha", categoria: "Carnes" },
  { id: 2, nome: "Mix de Folhas", categoria: "Saladas" },
  { id: 3, nome: "Maionese Tradicional", categoria: "Guarnições" },
  { id: 4, nome: "Suco de Laranja", categoria: "Bebidas" },
  { id: 5, nome: "Pão de Alho", categoria: "Entrada" },
];

function entrada(extra: Partial<EntradaChecklist> = {}): EntradaChecklist {
  return {
    tipoEvento: "Aniversário",
    preparos: PREPAROS,
    decisoes: DECISOES,
    itensCarga: CADASTRO,
    marcacoes: [
      { preparoId: 2, itemCargaId: SALADEIRAS.id },
      { preparoId: 3, itemCargaId: SALADEIRAS.id },
      { preparoId: 3, itemCargaId: PROCESSADOR.id },
      { preparoId: 4, itemCargaId: SUQUEIRAS.id },
    ],
    temperosFicha: [],
    ...extra,
  };
}

const categoria = (cs: CategoriaChecklist[], titulo: string) => cs.find((c) => c.titulo === titulo);
const textos = (c: CategoriaChecklist | undefined) => [
  ...(c?.itens ?? []).map((i) => i.texto),
  ...(c?.sub ?? []).flatMap((s) => s.itens.map((i) => i.texto)),
];

describe("ehCasamento", () => {
  it("aceita maiúsculas, acentos e texto em volta", () => {
    expect(ehCasamento("Casamento")).toBe(true);
    expect(ehCasamento("CASAMENTO civil")).toBe(true);
    expect(ehCasamento("Pré-casaménto")).toBe(true);
    expect(ehCasamento("Aniversário")).toBe(false);
    expect(ehCasamento(null)).toBe(false);
  });
});

describe("montarChecklist", () => {
  it("casamento leva a espátula de bolo, com a origem em cinza", () => {
    const talheres = categoria(montarChecklist(entrada({ tipoEvento: "Casamento" })).categorias, "Talheres de serviço");
    expect(talheres?.itens).toContainEqual({ texto: "Espátula de bolo", nota: "casamento" });
  });

  it("evento que não é casamento não leva a espátula", () => {
    const talheres = categoria(montarChecklist(entrada({ tipoEvento: "Aniversário" })).categorias, "Talheres de serviço");
    expect(textos(talheres)).not.toContain("Espátula de bolo");
    expect(textos(talheres)).toContain("Faca do chef");
  });

  it("pegadores = 2 x preparos do cardápio", () => {
    const talheres = categoria(montarChecklist(entrada()).categorias, "Talheres de serviço");
    expect(talheres?.itens[0]).toEqual({ texto: "Pegadores / colheres (10)", nota: "2 x 5 preparos" });
    const um = categoria(montarChecklist(entrada({ preparos: [PREPAROS[0]] })).categorias, "Talheres de serviço");
    expect(um?.itens[0]).toEqual({ texto: "Pegadores / colheres (2)", nota: "2 x 1 preparo" });
  });

  it("item marcado em duas fichas aparece uma vez, com as duas origens", () => {
    const loucas = categoria(montarChecklist(entrada()).categorias, "Louças e servir");
    const doCardapio = loucas?.sub.find((s) => s.nome === SUBGRUPO_DO_CARDAPIO);
    expect(doCardapio?.itens).toEqual([{ texto: "Saladeiras", nota: "Mix de Folhas, Maionese Tradicional" }]);
  });

  it("item fixo marcado numa ficha não se repete", () => {
    const loucas = categoria(
      montarChecklist(entrada({ marcacoes: [{ preparoId: 1, itemCargaId: TRAVESSA.id }] })).categorias,
      "Louças e servir",
    );
    expect(textos(loucas).filter((t) => t === "Travessas de inox")).toHaveLength(1);
    expect(loucas?.sub.map((s) => s.nome)).toEqual(["Sempre"]);
  });

  it("tempero que já está nos fixos não se repete; os outros saem em Do cardápio com a origem", () => {
    const temperos = categoria(
      montarChecklist(
        entrada({
          temperosFicha: [
            { preparoId: 1, insumoId: 42, nome: "Sal Grosso" },
            { preparoId: 1, insumoId: 134, nome: "Páprica" },
            { preparoId: 5, insumoId: 134, nome: "Páprica" },
            { preparoId: 3, insumoId: 47, nome: "Mostarda Dijon" },
          ],
        }),
      ).categorias,
      "Temperos",
    );
    expect(temperos?.sub.map((s) => s.nome)).toEqual(["Fixos", "Buffet", SUBGRUPO_DO_CARDAPIO]);
    expect(temperos?.sub[2].itens).toEqual([
      { texto: "Mostarda Dijon", nota: "Maionese Tradicional" },
      { texto: "Páprica", nota: "Fraldinha, Pão de Alho" },
    ]);
    expect(textos(temperos).filter((t) => /sal grosso/i.test(t))).toEqual(["Sal grosso"]);
  });

  it("ignora tempero e marcação de preparo que não está no cardápio", () => {
    const c = montarChecklist(
      entrada({
        marcacoes: [{ preparoId: 99, itemCargaId: PROCESSADOR.id }],
        temperosFicha: [{ preparoId: 99, insumoId: 134, nome: "Páprica" }],
      }),
    );
    expect(categoria(c.categorias, "Equipamentos")).toBeUndefined();
    expect(textos(categoria(c.categorias, "Temperos"))).not.toContain("Páprica");
  });

  it("ficha sem itens de carga vai para o aviso", () => {
    expect(montarChecklist(entrada()).fichasSemItens).toEqual(["Fraldinha", "Pão de Alho"]);
  });

  it("decisões operacionais vazias saem como 'a definir'", () => {
    const sem = montarChecklist(entrada({ decisoes: null })).categorias;
    for (const titulo of ["Pratos", "Talheres dos convidados", "Taças e copos"]) {
      expect(categoria(sem, titulo)?.itens).toEqual([{ texto: TEXTO_A_DEFINIR, aDefinir: true }]);
    }
    const parcial = montarChecklist(
      entrada({ decisoes: { ...DECISOES, modeloPrato: null, tipoTalher: "  " } }),
    ).categorias;
    expect(categoria(parcial, "Pratos")?.itens).toEqual([
      { texto: TEXTO_A_DEFINIR, aDefinir: true },
      { texto: "Sousplat" },
    ]);
    expect(categoria(parcial, "Talheres dos convidados")?.itens[0].aDefinir).toBe(true);
  });

  it("decisões preenchidas viram itens, com a quantidade de taças em cinza", () => {
    const cs = montarChecklist(entrada()).categorias;
    expect(categoria(cs, "Pratos")?.itens).toEqual([{ texto: "Pratos redondos grandes" }, { texto: "Sousplat" }]);
    expect(categoria(cs, "Talheres dos convidados")?.itens).toEqual([{ texto: "Talheres grandes" }]);
    expect(categoria(cs, "Taças e copos")?.itens).toEqual([
      { texto: "Taças" },
      { texto: "Taças de champanhe", nota: "80 un." },
    ]);
  });

  it("categoria vazia some e a ordem segue o spec", () => {
    const c = montarChecklist(entrada({ marcacoes: [] }));
    const titulos = c.categorias.map((x) => x.titulo);
    expect(titulos).not.toContain("Bebidas");
    expect(titulos).not.toContain("Equipamentos");
    expect(titulos).not.toContain("Limpeza"); // nada cadastrado nela neste teste
    expect(titulos).toEqual([
      "Talheres de serviço",
      "Temperos",
      "Louças e servir",
      "Pratos",
      "Talheres dos convidados",
      "Taças e copos",
      "Equipe",
      "Comida",
    ]);
  });

  it("Comida separa Carnes, Saladas e Outros pela categoria do preparo", () => {
    const comida = categoria(
      montarChecklist(
        entrada({
          preparos: [
            ...PREPAROS,
            { id: 6, nome: "Arroz Branco", categoria: "Guarnições" },
            { id: 7, nome: "Picanha", categoria: "Carnes" },
          ],
        }),
      ).categorias,
      "Comida",
    );
    expect(comida?.sub).toEqual([
      { nome: "Carnes", itens: [{ texto: "Fraldinha" }, { texto: "Picanha" }] },
      { nome: "Saladas", itens: [{ texto: "Mix de Folhas" }] },
      {
        nome: "Outros",
        itens: [
          { texto: "Pão de Alho" },
          { texto: "Arroz Branco" },
          { texto: "Maionese Tradicional" },
          { texto: "Suco de Laranja" },
        ],
      },
    ]);
    const soCarne = categoria(montarChecklist(entrada({ preparos: [PREPAROS[0]] })).categorias, "Comida");
    expect(soCarne?.sub.map((s) => s.nome)).toEqual(["Carnes"]);
  });
});

describe("cabeçalho", () => {
  it("convidados com adultos e crianças somadas", () => {
    expect(formatarConvidadosChecklist(80, 4, 2)).toBe("80 adultos · 6 crianças");
    expect(formatarConvidadosChecklist(1, null, null)).toBe("1 adulto");
    expect(formatarConvidadosChecklist(null, null, null)).toBeNull();
  });

  it("hora de chegada sem segundos", () => {
    expect(formatarHoraChegada("09:00:00")).toBe("09:00");
    expect(formatarHoraChegada(null)).toBeNull();
  });
});
