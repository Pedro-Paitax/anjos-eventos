import { beforeEach, describe, expect, it, vi } from "vitest";

const { obterUsuarioAtual, calcularMargemProjetada, calcularDimensionamentoOrcamento, calcularCustoPreparo } =
  vi.hoisted(() => ({
    obterUsuarioAtual: vi.fn(),
    calcularMargemProjetada: vi.fn(),
    calcularDimensionamentoOrcamento: vi.fn(),
    calcularCustoPreparo: vi.fn(),
  }));
vi.mock("@/lib/usuario-atual", () => ({ obterUsuarioAtual }));
vi.mock("@/lib/margem-orcamento", () => ({ calcularMargemProjetada }));
vi.mock("@/lib/dimensionamento-cardapio", () => ({ calcularDimensionamentoOrcamento }));
vi.mock("@/lib/custo-preparo", () => ({ calcularCustoPreparo }));

import { GET as margem } from "@/app/api/orcamentos/[id]/margem-projetada/route";
import { GET as dimensionamento } from "@/app/api/orcamentos/[id]/dimensionamento/route";
import { GET as custo } from "@/app/api/preparos/[id]/custo/route";

const rotas = [
  { nome: "/api/orcamentos/[id]/margem-projetada", get: margem, calculo: calcularMargemProjetada },
  {
    nome: "/api/orcamentos/[id]/dimensionamento",
    get: dimensionamento,
    calculo: calcularDimensionamentoOrcamento,
  },
  { nome: "/api/preparos/[id]/custo", get: custo, calculo: calcularCustoPreparo },
];

const chamar = (get: typeof margem) =>
  get(new Request("http://localhost/api/x/1"), { params: Promise.resolve({ id: "1" }) });

describe.each(rotas)("rota protegida $nome", ({ get, calculo }) => {
  beforeEach(() => {
    obterUsuarioAtual.mockReset();
    calculo.mockReset();
    calculo.mockResolvedValue({ ok: true });
  });

  it("sem sessão: 401 JSON e o cálculo nem é chamado", async () => {
    obterUsuarioAtual.mockResolvedValue(null);
    const r = await chamar(get);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: "Não autenticado." });
    expect(calculo).not.toHaveBeenCalled();
  });

  it("com sessão: segue para o cálculo (200)", async () => {
    obterUsuarioAtual.mockResolvedValue({ id: 1, nome: "Pedro" });
    const r = await chamar(get);
    expect(r.status).toBe(200);
    expect(calculo).toHaveBeenCalledOnce();
  });
});
