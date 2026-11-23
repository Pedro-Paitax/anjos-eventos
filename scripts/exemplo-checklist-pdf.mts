// PDF de exemplo do checklist de carregamento, gerado pela lib real com os mesmos dados fictícios
// do protótipo (docs/specs/prototipo-checklist-pdf.mjs). Não toca no banco.
// Uso: npx tsx scripts/exemplo-checklist-pdf.mts [saida.pdf]
import { writeFileSync } from "node:fs";
import { montarChecklist, type ItemCargaCadastro } from "../src/lib/checklist-carregamento";
import { gerarChecklistPdf } from "../src/lib/checklist-carregamento-pdf";

// Mesmo cadastro de scripts/dados-0016-checklist-carregamento.sql (parte usada no exemplo).
const cadastro: [string, string, string | null, boolean, string | null, number?][] = [
  ["Pegadores / colheres", "Talheres de serviço", null, true, "dois_por_preparo"],
  ["Chaira / pedra / afiador", "Talheres de serviço", null, true, null],
  ["Facas de carne", "Talheres de serviço", null, true, null],
  ["Faca do chef", "Talheres de serviço", null, true, null],
  ["Faca de serrinha", "Talheres de serviço", null, true, null],
  ["Espátula de bolo", "Talheres de serviço", null, true, "so_casamento"],
  ["Cano com espetos", "Churrasco", null, true, null],
  ["Parrilla pequena", "Churrasco", null, true, null],
  ["Carvão", "Churrasco", null, true, null],
  ["Álcool etanol", "Churrasco", null, true, null],
  ...["Pano de prato", "Perflex", "Esponjas", "Bombril", "Detergente / sabão", "Pasta limpa-alumínio", "Fósforo",
    "Álcool + borrifador", "Pano de polimento", "Sacos de lixo", "Papel-filme", "Rolo de sacolinha"].map(
    (n) => [n, "Limpeza", null, true, null] as [string, string, null, boolean, null],
  ),
  ["Sal de parrilla", "Temperos", "Fixos", true, null],
  ["Sal grosso", "Temperos", "Fixos", true, null, 42],
  ["Sal temperado", "Temperos", "Fixos", true, null],
  ["Sal comum", "Temperos", "Fixos", true, null, 16],
  ["Óleo", "Temperos", "Fixos", true, null, 12],
  ["Azeite", "Temperos", "Fixos", true, null, 5],
  ["Alho triturado", "Temperos", "Fixos", true, null, 24],
  ["Alho", "Temperos", "Fixos", true, null, 10],
  ["Azeite do buffet", "Temperos", "Buffet", true, null],
  ["Vinagre do buffet", "Temperos", "Buffet", true, null],
  ["Sal do buffet", "Temperos", "Buffet", true, null],
  ["Bowls de reposição", "Louças e servir", "Sempre", true, null],
  ["Travessas de inox", "Louças e servir", "Sempre", true, null],
  ["Tábuas de carne", "Louças e servir", "Sempre", true, null],
  ["Tábuas de salada", "Louças e servir", "Sempre", true, null],
  ["Tábuas padrão", "Louças e servir", "Sempre", true, null],
  ["Louças de cerâmica", "Louças e servir", "Sempre", true, null],
  ["Saladeiras", "Louças e servir", null, false, null],
  ["Rechauds", "Louças e servir", null, false, null],
  ["Jarras grandes", "Bebidas", null, false, null],
  ["Suqueiras", "Bebidas", null, false, null],
  ["Processador", "Equipamentos", null, false, null],
  ["Cabrita (cortador de legumes)", "Equipamentos", null, false, null],
  ...["Copos", "Pratinhos", "Garfinhos", "Guardanapos", "Luvas descartáveis"].map(
    (n) => [n, "Descartáveis", null, true, null] as [string, string, null, boolean, null],
  ),
  ["Uniformes", "Equipe", null, true, null],
];
const itensCarga: ItemCargaCadastro[] = cadastro.map(([nome, categoria, subgrupo, sempre, regra, insumoId], i) => ({
  id: i + 1,
  nome,
  categoria,
  subgrupo,
  sempre,
  marcavelFicha: !sempre,
  regra,
  insumoId: insumoId ?? null,
  ordem: i,
}));
const idItem = (nome: string) => itensCarga.find((i) => i.nome === nome)!.id;

const cardapio: [string, string][] = [
  ["Fraldinha", "Carnes"], ["Picanha Suína", "Carnes"], ["Sobrecoxa Desossada", "Carnes"],
  ["Linguiça Toscana", "Entrada"], ["Costela Janela", "Carnes"],
  ["Pão de Alho Caseiro", "Entrada"], ["Queijo Coalho", "Entrada"], ["Bruschetta com Provolone", "Entrada"],
  ["Mix de Folhas", "Saladas"], ["Vinagrete", "Saladas"], ["Maionese Tradicional", "Saladas"],
  ["Arroz Branco", "Guarnições"], ["Farofa da Casa", "Guarnições"], ["Mandioca com Ragu de Linguiça", "Guarnições"],
  ["Suco de Laranja", "Bebidas"],
];
const preparos = cardapio.map(([nome, categoria], i) => ({ id: i + 1, nome, categoria }));
const idPreparo = (nome: string) => preparos.find((p) => p.nome === nome)!.id;

const marcar: [string, string[]][] = [
  ["Saladeiras", ["Mix de Folhas", "Vinagrete", "Maionese Tradicional"]],
  ["Rechauds", ["Arroz Branco", "Mandioca com Ragu de Linguiça"]],
  ["Suqueiras", ["Suco de Laranja"]],
  ["Jarras grandes", ["Suco de Laranja"]],
  ["Processador", ["Maionese Tradicional"]],
  ["Cabrita (cortador de legumes)", ["Vinagrete"]],
  ["Tábuas de carne", ["Fraldinha", "Sobrecoxa Desossada", "Linguiça Toscana"]],
  ["Travessas de inox", ["Pão de Alho Caseiro", "Bruschetta com Provolone", "Farofa da Casa"]],
];
const marcacoes = marcar.flatMap(([item, ps]) => ps.map((p) => ({ preparoId: idPreparo(p), itemCargaId: idItem(item) })));

const temperosFicha = [
  { preparo: "Picanha Suína", insumoId: 134, nome: "Páprica defumada" },
  { preparo: "Maionese Tradicional", insumoId: 47, nome: "Mostarda Dijon" },
  { preparo: "Mandioca com Ragu de Linguiça", insumoId: 77, nome: "Noz-moscada" },
  { preparo: "Bruschetta com Provolone", insumoId: 9, nome: "Orégano" },
  { preparo: "Fraldinha", insumoId: 42, nome: "Sal Grosso" }, // já está nos fixos: não repete
].map((t) => ({ preparoId: idPreparo(t.preparo), insumoId: t.insumoId, nome: t.nome }));

const checklist = montarChecklist({
  tipoEvento: "Casamento",
  preparos,
  decisoes: {
    modeloPrato: "Redondo grande",
    sousplat: true,
    tipoBebidaRecipiente: "Taça",
    tacaFurtaCor: false,
    qtdTacaFurtaCor: null,
    tacaChampanhe: true,
    qtdTacaChampanhe: 80,
    tipoTalher: "Grande",
  },
  itensCarga,
  marcacoes,
  temperosFicha,
});

const bytes = await gerarChecklistPdf({
  cliente: "Casamento Ana & Bruno (EXEMPLO)",
  tipoEvento: "Casamento",
  data: "sáb, 12/12/2026",
  chegada: "09:00",
  convidados: "80 adultos · 6 crianças",
  local: "Chácara Recanto Verde · Colombo",
  veiculo: "Master",
  observacoes: "O local tem churrasqueira e fogão. Levar extensão de 10 m (tomada longe da área do buffet).",
  categorias: checklist.categorias,
  fichasSemItens: checklist.fichasSemItens,
  geradoEm: "23/11/2026 15:30 · EXEMPLO com dados fictícios",
});
const saida = process.argv[2] ?? "checklist-exemplo.pdf";
writeFileSync(saida, bytes);
console.log("gerado:", saida, "fichas sem itens:", checklist.fichasSemItens.join(", "));
