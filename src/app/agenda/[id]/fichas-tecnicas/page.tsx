import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { obterEvento } from "@/lib/eventos";
import { obterFichasTecnicasEvento } from "@/lib/ficha-tecnica-evento";
import { formatarData } from "@/lib/formatacao";
import { DocumentoFichasTecnicas } from "@/components/ficha-tecnica-documento";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fichas técnicas" };

type PaginaFichasTecnicasProps = {
  params: Promise<{ id: string }>;
};

export default async function PaginaFichasTecnicas({ params }: PaginaFichasTecnicasProps) {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) {
    notFound();
  }

  const evento = await obterEvento(idNumero);
  if (!evento) {
    notFound();
  }

  const fichas = await obterFichasTecnicasEvento(idNumero);
  const numConvidados =
    (evento.qtd_adultos ?? 0) + (evento.qtd_criancas_ate_5 ?? 0) + (evento.qtd_criancas_5_a_10 ?? 0);

  return (
    <DocumentoFichasTecnicas
      voltarHref={`/agenda/${evento.id}`}
      voltarRotulo="← Voltar pro evento"
      titulo={evento.cliente}
      campos={[
        { rotulo: "Empresa", valor: evento.empresa_nome },
        { rotulo: "Data do evento", valor: formatarData(evento.data_evento), classe: "capitalize" },
        { rotulo: "Convidados", valor: numConvidados > 0 ? numConvidados : "—" },
        { rotulo: "Preparos", valor: `${fichas.length} · produção real + 10% de buffer` },
      ]}
      fichas={fichas}
      mensagemVazia="Este evento não tem cardápio confirmado em Itens_Evento_Confirmados — nada pra exportar."
    />
  );
}
