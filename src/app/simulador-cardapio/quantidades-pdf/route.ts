import { NextResponse } from "next/server";
import { exigirUsuarioApi } from "@/lib/api-auth";
import { calcularDebugCardapio } from "@/lib/debug-calculo-cardapio";
import { lerParametrosQuantidades } from "@/lib/quantidades-cardapio-url";
import { gerarQuantidadesCardapioPdf, montarLinhasQuantidades } from "@/lib/quantidades-cardapio-pdf";

export const dynamic = "force-dynamic";

/**
 * PDF "Quantidades do cardápio" do Simulador ("Ver cálculos" → Exportar PDF). Recalcula com o mesmo
 * diagnóstico da tabela (calcularDebugCardapio), a partir da seleção e dos convidados da tela.
 * Exige usuário logado (exigirUsuarioApi: 401 sem sessão, sem corpo com dado).
 */
export async function GET(request: Request) {
  const negado = await exigirUsuarioApi(request);
  if (negado) return negado;

  const parametros = lerParametrosQuantidades(new URL(request.url).searchParams);
  if ("erro" in parametros) return NextResponse.json({ erro: parametros.erro }, { status: 400 });

  const { preparoIds, adultos, criancasAte5, criancas5a10 } = parametros;
  // Quantidade e custo por item só dependem dos preparos e do total de convidados; garçom e
  // deslocamento não mudam nenhuma linha, por isso não vêm no endereço.
  const debug = await calcularDebugCardapio(preparoIds, {
    numConvidados: adultos + criancasAte5 + criancas5a10,
    regiaoMetropolitanaCuritiba: false,
  });
  if ("erro" in debug) return NextResponse.json({ erro: debug.erro }, { status: debug.status });

  const geradoEm = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const bytes = await gerarQuantidadesCardapioPdf({
    adultos,
    criancasAte5,
    criancas5a10,
    geradoEm,
    itens: montarLinhasQuantidades(debug),
    foraDoCalculo: debug.itensExcluidos,
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      // inline: abre no visualizador do navegador (no celular, com o botão de compartilhar).
      "content-disposition": `inline; filename="quantidades-cardapio.pdf"`,
      "cache-control": "no-store",
    },
  });
}
