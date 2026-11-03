/**
 * Regras puras do cadastro de fichas técnicas por arquivo (scripts/cadastrar-preparo.ts).
 * Sem banco aqui: o script resolve nomes contra o Postgres e chama `validarFicha`.
 *
 * Regras de origem (não inventar novas aqui):
 * - docs/DECISOES.md: hierarquia de proteínas (Carnes → peso resolvido pela subcategoria),
 *   peso_atratividade sem DEFAULT (fail-fast), "Correção do Bug de Mistura de Unidades"
 *   (peso médio obrigatório para rendimento em Unidade, nunca derivado da composição),
 *   preço de cadastro = fornecedor + 10 %, preço com mais de 14 dias = desatualizado.
 * - docs/PENDENCIAS_NOTURNAS.md: preparo sem Header_UI sai do cálculo em silêncio → header obrigatório.
 */
import { z } from "zod";
import { passosPreparoSchema } from "../src/lib/passos-preparo";
import { FONTES_PRECO, CANAIS_COMPRA } from "../src/lib/precos-opcoes";

export const CATEGORIAS = ["Bebidas", "Carnes", "Entrada", "Guarnições", "Massas", "Molhos", "Saladas", "Sobremesa"] as const;
export const UNIDADES_RENDIMENTO = ["G", "ML", "Unidade"] as const;
export const SUBCATEGORIAS = ["Carne Vermelha", "Ovino", "Suíno", "Peixe", "Aves"] as const;
export const RESTRICOES = ["Vegano", "Vegetariano", "Sem Gluten", "Sem Lactose"] as const;
export const UNIDADES_INSUMO = ["KG", "Litro", "Unidade", "Maço"] as const;

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD");

/** Insumo que ainda não existe no banco. Preço = BRUTO do fornecedor; o cadastro recebe + 10 %. */
const insumoNovoSchema = z
  .object({
    unidade: z.enum(UNIDADES_INSUMO),
    precoFornecedor: z.number().positive(),
    fatorCorrecao: z.number().gt(0).max(1),
    /** true = preço não confirmado em fonte: entra sem data (aparece como "sem data" para conferir). */
    estimado: z.boolean().default(false),
    fonte: z.enum(FONTES_PRECO).optional(),
    url: z.string().url().optional(),
    observadoEm: dia.optional(),
    fornecedor: z.string().trim().min(1).optional(),
    nomeNoFornecedor: z.string().trim().min(1).optional(),
    canal: z.enum(CANAIS_COMPRA).optional(),
  })
  .strict()
  .superRefine((n, ctx) => {
    if (n.estimado) return;
    if (!n.fonte) ctx.addIssue({ code: "custom", message: "preço pesquisado precisa de 'fonte' (ou marque 'estimado': true)" });
    if (!n.observadoEm) ctx.addIssue({ code: "custom", message: "preço pesquisado precisa de 'observadoEm'" });
    if (n.fonte === "pesquisa_web" && !n.url) ctx.addIssue({ code: "custom", message: "pesquisa web precisa do 'url' da fonte" });
  });

export const fichaSchema = z
  .object({
    nome: z.string().trim().min(2),
    categoria: z.enum(CATEGORIAS),
    /** Nome exato de um Header_UI existente (veja --referencia). Sem header o preparo sai do cálculo. */
    header: z.string().trim().min(1),
    rendimento: z.number().positive(),
    unidadeRendimento: z.enum(UNIDADES_RENDIMENTO),
    passos: passosPreparoSchema.min(1),
    tags: z.array(z.enum(RESTRICOES)).default([]),
    tempoPreparoMinutos: z.number().int().positive().nullable().default(null),
    apresentacaoUtensilio: z.string().trim().min(1).nullable().default(null),
    pesoAtratividade: z.number().positive().nullable().default(null),
    subcategoriaProteina: z.enum(SUBCATEGORIAS).nullable().default(null),
    porcaoMaximaIndividual: z.number().positive().nullable().default(null),
    pesoMedioUnidadeG: z.number().positive().nullable().default(null),
    /**
     * Nome do preparo base quando esta ficha é uma versão dele ("Fraldinha com Chimichurri" → "Fraldinha").
     * O base precisa existir no banco ou vir antes no mesmo arquivo, e não pode ser versão de outro.
     * Só agrupa na tela: a ficha continua completa (composição inteira, header, rendimento).
     */
    variacaoDe: z.string().trim().min(1).nullable().default(null),
    composicao: z
      .array(
        z
          .object({
            insumo: z.string().trim().min(1),
            /** Na unidade comercial do insumo (KG, Litro, Unidade, Maço), nunca convertida. */
            quantidade: z.number().positive(),
            novo: insumoNovoSchema.optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((f, ctx) => {
    const erro = (message: string) => ctx.addIssue({ code: "custom", message });
    if (f.categoria === "Carnes") {
      if (!f.subcategoriaProteina) erro("Carnes exige 'subcategoriaProteina'");
      if (f.pesoAtratividade != null) erro("Carnes não leva 'pesoAtratividade' (vem da hierarquia de proteínas)");
    } else {
      if (f.subcategoriaProteina) erro("'subcategoriaProteina' só vale para Carnes");
      if (f.pesoAtratividade == null) erro("informe 'pesoAtratividade' (padrão 1.0; outro valor só com justificativa)");
    }
    if (f.unidadeRendimento === "Unidade" && f.pesoMedioUnidadeG == null) {
      erro("rendimento em Unidade exige 'pesoMedioUnidadeG' real (nunca derivado da composição); se não souber, pergunte ao Pedro");
    }
    if (f.unidadeRendimento !== "Unidade" && f.pesoMedioUnidadeG != null) erro("'pesoMedioUnidadeG' só vale para rendimento em Unidade");
    if (f.variacaoDe && normalizarNome(f.variacaoDe) === normalizarNome(f.nome)) erro("'variacaoDe' não pode ser o próprio preparo");
    const vistos = new Set<string>();
    for (const c of f.composicao) {
      const k = normalizarNome(c.insumo);
      if (vistos.has(k)) erro(`insumo repetido na composição: ${c.insumo}`);
      vistos.add(k);
    }
  });

export type Ficha = z.infer<typeof fichaSchema>;

/** Compara nomes sem maiúsculas, acentos e espaços extras ("batata  inglesa" = "Batata Inglesa"). */
export function normalizarNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Title Case dos insumos ("creme de leite" → "Creme De Leite"), como os nomes já cadastrados. */
export function tituloInsumo(nome: string): string {
  return nome
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((p) => (p ? p[0].toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR") : p))
    .join(" ");
}

/** Texto de `modo_preparo` (NOT NULL) a partir dos passos, no padrão dos já cadastrados: "1. texto" por linha. */
export function modoPreparoDosPassos(passos: Ficha["passos"]): string {
  return [...passos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => `${p.ordem}. ${p.descricao}`)
    .join("\n");
}

/** Mesma regra de src/lib/custo-preparo.ts: fator vazio ou 0 → custo 0. */
export function custoLinha(quantidade: number, preco: number | null, fator: number | null): number {
  if (preco == null || !fator) return 0;
  return (quantidade * preco) / fator;
}

/** Erros de validação do zod em linhas legíveis ("composicao.2.novo: ..."). */
export function errosLegiveis(erro: z.ZodError): string[] {
  return erro.issues.map((i) => `${i.path.length ? `${i.path.join(".")}: ` : ""}${i.message}`);
}
