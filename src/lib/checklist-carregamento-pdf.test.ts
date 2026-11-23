import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { gerarChecklistPdf, type DadosChecklistPdf } from "@/lib/checklist-carregamento-pdf";
import { TEXTO_A_DEFINIR } from "@/lib/checklist-carregamento";

const base: DadosChecklistPdf = {
  cliente: "Cliente Teste",
  tipoEvento: "Casamento",
  data: "sáb, 12/12/2026",
  chegada: "09:00",
  convidados: "80 adultos · 6 crianças",
  local: "Rua Teste, 123",
  veiculo: null,
  observacoes: null,
  categorias: [
    { titulo: "Pratos", itens: [{ texto: TEXTO_A_DEFINIR, aDefinir: true }], sub: [] },
    { titulo: "Equipe", itens: [{ texto: "Uniformes" }], sub: [] },
  ],
  fichasSemItens: [],
  geradoEm: "23/11/2026 10:00",
};

const paginas = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();

describe("gerarChecklistPdf", () => {
  it("gera um PDF A4 de uma página com campos vazios e 'a definir'", async () => {
    const bytes = await gerarChecklistPdf({ ...base, chegada: null, tipoEvento: null, convidados: null, local: null });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595, height: 842 });
  });

  it("categoria maior que uma coluna continua na coluna seguinte e em nova página", async () => {
    const itens = Array.from({ length: 120 }, (_, i) => ({ texto: `Item ${i + 1}`, nota: "Preparo com um nome bem comprido, outro preparo" }));
    const bytes = await gerarChecklistPdf({ ...base, categorias: [{ titulo: "Comida", itens, sub: [] }], fichasSemItens: ["A", "B"] });
    expect(await paginas(bytes)).toBeGreaterThan(1);
  });

  it("aceita caracteres fora do WinAnsi sem quebrar", async () => {
    const bytes = await gerarChecklistPdf({ ...base, cliente: "Festa 🎉 — “aspas”", observacoes: "Levar extensão → 10 m" });
    expect(await paginas(bytes)).toBe(1);
  });
});
