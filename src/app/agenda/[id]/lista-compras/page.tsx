import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { carregarDocumentoListaCompras } from "@/lib/lista-compras-documento";
import { formatarQuantidadeCompra } from "@/lib/lista-compras-pdf";
import { formatarData } from "@/lib/formatacao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { botaoClasse } from "@/components/botao";
import { Painel } from "@/components/painel";
import { Alerta } from "@/components/alerta";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Lista de compras" };

export default async function PaginaListaCompras({ params }: { params: Promise<{ id: string }> }) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const { id } = await params;
  const eventoId = Number(id);
  if (!Number.isInteger(eventoId)) notFound();

  const documento = await carregarDocumentoListaCompras(eventoId);
  if (!documento) notFound();
  const { evento, itens, convidados } = documento;

  return (
    <main className="lista-compras mx-auto flex w-full max-w-pagina-documento flex-col gap-6">
      <CabecalhoPagina
        titulo="Lista de compras"
        subtitulo={`${evento.cliente} - ${evento.empresa_nome}`}
        voltarPara={{ href: `/agenda/${evento.id}`, rotulo: "← Evento" }}
        acao={
          itens.length > 0 ? (
            <a href={`/agenda/${evento.id}/lista-compras/pdf`} download className={botaoClasse("primario")}>
              Baixar PDF
            </a>
          ) : undefined
        }
      />

      <p className="text-sm text-texto-suave">
        {formatarData(evento.data_evento)} · {convidados ?? "-"} convidados
      </p>

      {itens.length === 0 ? (
        <Alerta tipo="aviso">Este evento não tem cardápio confirmado.</Alerta>
      ) : (
        <Painel>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-texto-suave">
                  <th scope="col" className="py-2 pr-3 font-medium">Insumo</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Qtd. a comprar</th>
                  <th scope="col" className="py-2 font-medium">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.insumoId} className="border-b border-borda/50">
                    <td className="py-2 pr-3">
                      {i.nome}
                      {i.semPreco && <span className="ml-2 text-xs text-texto-suave">sem preço</span>}
                      {i.semFator && <span className="ml-2 text-xs text-texto-suave">sem fator</span>}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatarQuantidadeCompra(i.quantidadeCompra)}</td>
                    <td className="py-2">{i.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-texto-suave">
            Consumíveis operacionais (carvão, gelo, sal grosso, papel toalha, sacos de lixo e papel
            alumínio) não têm ficha técnica: o PDF traz os nomes com a quantidade em branco para
            preencher à mão.
          </p>
        </Painel>
      )}
    </main>
  );
}
