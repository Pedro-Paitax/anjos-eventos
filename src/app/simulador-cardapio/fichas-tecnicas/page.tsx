import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { calcularDebugCardapio } from "@/lib/debug-calculo-cardapio";
import { obterFichasTecnicasPorPreparos } from "@/lib/ficha-tecnica-evento";
import { pessoasParaProducao } from "@/lib/pessoas-producao";
import { lerParametrosQuantidades } from "@/lib/quantidades-cardapio-url";
import { descreverConvidados } from "@/lib/quantidades-cardapio-pdf";
import { AvisoFolhaFichaTecnica, DocumentoFichasTecnicas } from "@/components/ficha-tecnica-documento";

export const metadata: Metadata = { title: "Fichas técnicas do cardápio" };
export const dynamic = "force-dynamic";

const VOLTAR = { voltarHref: "/simulador-cardapio", voltarRotulo: "← Voltar pro simulador" };

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Fichas técnicas dos preparos do cardápio do Simulador, com a mesma folha da Ficha Técnica da
 * Agenda (components/ficha-tecnica-documento.tsx) e o mesmo "Imprimir / Salvar como PDF".
 * Mesmos parâmetros e mesmo cálculo do PDF de quantidades; a quantidade de cada preparo
 * (quantidadeParaCusto) escala a ficha. Exige usuário logado (sem sessão: /login, como as demais
 * páginas). Parâmetros inválidos: mensagem na própria folha, sem consultar cálculo nem banco.
 */
export default async function PaginaFichasTecnicasCardapio({ searchParams }: Props) {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(await searchParams)) {
    if (typeof valor === "string") busca.set(chave, valor);
  }
  const parametros = lerParametrosQuantidades(busca);
  if ("erro" in parametros) {
    return <AvisoFolhaFichaTecnica {...VOLTAR}>{parametros.erro}</AvisoFolhaFichaTecnica>;
  }

  const { preparoIds, adultos, criancasAte5, criancas5a10 } = parametros;
  const debug = await calcularDebugCardapio(preparoIds, {
    numConvidados: adultos + criancasAte5 + criancas5a10,
    pessoasProducao: pessoasParaProducao({ adultos, criancasAte5, criancas5a10 }),
    regiaoMetropolitanaCuritiba: false,
  });
  if ("erro" in debug) {
    return <AvisoFolhaFichaTecnica {...VOLTAR}>{debug.erro}</AvisoFolhaFichaTecnica>;
  }

  const fichas = await obterFichasTecnicasPorPreparos(
    debug.linhas.map((l) => ({ preparoId: l.preparoId, quantidade: l.quantidadeParaCusto }))
  );

  return (
    <DocumentoFichasTecnicas
      {...VOLTAR}
      titulo="Cardápio do simulador"
      campos={[
        { rotulo: "Convidados", valor: descreverConvidados({ adultos, criancasAte5, criancas5a10 }) },
        { rotulo: "Preparos", valor: `${fichas.length} · quantidades incluem 10% de folga` },
      ]}
      fichas={fichas}
      mensagemVazia="Nenhuma ficha técnica encontrada para a seleção."
      avisos={
        debug.itensExcluidos.length > 0 ? (
          <div className="mb-8 text-sm text-black/70">
            <p className="font-semibold">Fora do cálculo (sem ficha neste documento)</p>
            <ul className="mt-1 list-disc pl-5">
              {debug.itensExcluidos.map((item) => (
                <li key={item.preparo}>
                  {item.preparo} — {item.motivo}
                </li>
              ))}
            </ul>
          </div>
        ) : undefined
      }
    />
  );
}
