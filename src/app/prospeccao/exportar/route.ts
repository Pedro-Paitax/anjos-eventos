import { exigirUsuarioApi } from "@/lib/api-auth";
import { listarLeads } from "@/lib/prospeccao";
import { gerarCsv } from "@/lib/prospeccao-csv";

export const dynamic = "force-dynamic";

// Exige usuário logado (exigirUsuarioApi: 401 sem sessão, sem corpo com dado).
export async function GET(request: Request) {
  const negado = await exigirUsuarioApi(request);
  if (negado) return negado;

  const leads = await listarLeads();
  const cabecalho = [
    "id", "nome_comercial", "categoria", "segmento", "municipio", "status", "nao_contatar", "site", "instagram",
    "telefone", "email", "prioridade", "pontuacao", "pontuacao_maxima", "avaliacao_provisoria", "completude",
    "fontes", "fontes_verificadas", "contatado", "respondeu", "reuniao", "proposta", "convertido",
    "proxima_acao", "proxima_acao_em", "origem",
  ];
  const sim = (b: boolean | null) => (b === null ? "" : b ? "sim" : "nao");
  const linhas = leads.map((l) => [
    l.id, l.nomeComercial, l.categoria, l.segmento, l.municipio, l.status, sim(l.naoContatar), l.site, l.instagram,
    l.telefone, l.email, l.prioridade, l.pontuacao, l.pontuacaoMaxima, sim(l.provisoria), l.completude,
    l.evidencias, l.evidenciasVerificadas, sim(l.contatado), sim(l.respondeu), sim(l.reuniao), sim(l.proposta),
    sim(l.convertido), l.proximaAcao, l.proximaAcaoEm, l.origem,
  ]);
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  return new Response(gerarCsv(cabecalho, linhas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leads-${hoje}.csv"`,
      "cache-control": "no-store",
    },
  });
}
