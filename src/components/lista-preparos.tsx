"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { PreparoResumo } from "@/lib/preparos";
import { excluirPreparoAction } from "@/app/actions/preparo";
import { CATEGORIAS_PREPARO } from "@/lib/preparos-opcoes";
import { ModalConfirmacao } from "@/components/modal-confirmacao";
import { Alerta } from "@/components/alerta";
import { campoClasse } from "@/components/campo";
import { botaoClasse } from "@/components/botao";
import { Vazio } from "@/components/vazio";
import { Seletor } from "@/components/seletor";
import { ChipNeutro } from "@/components/precos/visual";
import { agruparPorBase, rotuloVariacao } from "@/lib/variacoes-preparo";

const campoFiltroClasse = campoClasse;

type Agrupamento = "nenhum" | "categoria";
type Ordenacao = "nome" | "categoria" | "unidade";

function compararPorOrdenacao(ordenacao: Ordenacao) {
  return (a: PreparoResumo, b: PreparoResumo) => {
    const porNome = a.nome.localeCompare(b.nome, "pt-BR");
    if (ordenacao === "nome") return porNome;
    if (ordenacao === "categoria") {
      const diff = (a.categoria ?? "").localeCompare(b.categoria ?? "", "pt-BR");
      return diff !== 0 ? diff : porNome;
    }
    const diff = (a.unidadeRendimento ?? "").localeCompare(b.unidadeRendimento ?? "", "pt-BR");
    return diff !== 0 ? diff : porNome;
  };
}

function rotuloRendimento(preparo: PreparoResumo): string {
  if (preparo.rendimento == null) return "—";
  const unidade = preparo.unidadeRendimento ?? "";
  return `${preparo.rendimento} ${unidade}`.trim();
}

type LinhaPreparoProps = {
  preparo: PreparoResumo;
  /** Nome do base quando a linha é uma versão (aparece recuada, com o rótulo curto). */
  nomeBase?: string;
  /** Quantas versões o preparo tem (só nas linhas de base). */
  versoes?: number;
};

function LinhaPreparo({ preparo, nomeBase, versoes = 0 }: LinhaPreparoProps) {
  const [erro, setErro] = useState<string | null>(null);
  const [excluido, setExcluido] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function confirmarExclusao() {
    setErro(null);
    setConfirmando(false);
    iniciarTransicao(async () => {
      const resultado = await excluirPreparoAction(preparo.id);
      if (resultado?.erro) {
        setErro(resultado.erro);
      } else {
        setExcluido(true);
      }
    });
  }

  if (excluido) return null;

  return (
    <li className={`flex flex-col gap-2 py-4 pr-6 ${nomeBase ? "pl-10 sm:pl-14" : "pl-6"}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className={nomeBase ? "border-l-2 border-borda-forte pl-3" : undefined}>
          <p className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">
            {nomeBase ? rotuloVariacao(nomeBase, preparo.nome) : preparo.nome}
            {versoes > 0 && <ChipNeutro>{versoes === 1 ? "1 versão" : `${versoes} versões`}</ChipNeutro>}
          </p>
          <p className="text-sm text-texto-suave">
            {nomeBase ? `Versão de ${nomeBase}` : (preparo.categoria ?? "Sem categoria")} · {rotuloRendimento(preparo)}
          </p>
        </div>
        <div className="flex items-center gap-4 pl-0 sm:pl-0">
          <Link
            href={`/preparos/${preparo.id}`}
            aria-label={`Editar ${preparo.nome}`}
            className={botaoClasse("link", "sm")}
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={pendente}
            aria-label={`Excluir ${preparo.nome}`}
            className={botaoClasse("link", "sm")}
          >
            {pendente ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
      {erro && <Alerta tipo="perigo">{erro}</Alerta>}

      {confirmando && (
        <ModalConfirmacao
          titulo="Excluir preparo"
          rotuloConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmando(false)}
        >
          Excluir o preparo &quot;{preparo.nome}&quot;? Essa ação não pode ser desfeita.
        </ModalConfirmacao>
      )}
    </li>
  );
}

/** Base seguido das suas versões, recuadas. Versão cujo base ficou fora do filtro aparece com o nome inteiro. */
function LinhasAgrupadas({ itens }: { itens: PreparoResumo[] }) {
  return agruparPorBase(itens).flatMap(({ item, variacoes }) => [
    <LinhaPreparo key={item.id} preparo={item} versoes={variacoes.length} />,
    ...variacoes.map((v) => <LinhaPreparo key={v.id} preparo={v} nomeBase={item.nome} />),
  ]);
}

export function ListaPreparos({ preparos }: { preparos: PreparoResumo[] }) {
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [buscaNome, setBuscaNome] = useState("");
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("nenhum");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");

  const preparosFiltrados = useMemo(() => {
    const buscaNormalizada = buscaNome.trim().toLowerCase();
    const filtrados = preparos.filter((preparo) => {
      if (categoriaFiltro && preparo.categoria !== categoriaFiltro) return false;
      if (buscaNormalizada && !preparo.nome.toLowerCase().includes(buscaNormalizada)) return false;
      return true;
    });
    return [...filtrados].sort(compararPorOrdenacao(ordenacao));
  }, [preparos, categoriaFiltro, buscaNome, ordenacao]);

  const grupos = useMemo(() => {
    if (agrupamento !== "categoria") return null;
    const porCategoria = new Map<string, PreparoResumo[]>();
    for (const preparo of preparosFiltrados) {
      const chave = preparo.categoria ?? "Sem categoria";
      const lista = porCategoria.get(chave) ?? [];
      lista.push(preparo);
      porCategoria.set(chave, lista);
    }
    return [...porCategoria.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [preparosFiltrados, agrupamento]);

  if (preparos.length === 0) {
    return (
      <Vazio
        acao={
          <Link href="/preparos/novo" className={botaoClasse()}>
            Novo Preparo
          </Link>
        }
      >
        Nenhum preparo cadastrado ainda. Cadastre o primeiro pra começar a
        montar as fichas técnicas.
      </Vazio>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-borda p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="text"
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          placeholder="Buscar por nome…"
          aria-label="Buscar preparo por nome"
          className={`${campoFiltroClasse} sm:min-w-48 sm:flex-1`}
        />
        <Seletor
          aria-label="Filtrar por categoria"
          value={categoriaFiltro}
          onChange={setCategoriaFiltro}
          className="sm:w-60"
          opcoes={[
            { valor: "", rotulo: "Todas as categorias" },
            ...CATEGORIAS_PREPARO.map((categoria) => ({ valor: categoria, rotulo: categoria })),
          ]}
        />
        <Seletor
          aria-label="Agrupamento"
          value={agrupamento}
          onChange={(v) => setAgrupamento(v as Agrupamento)}
          className="sm:w-56"
          opcoes={[
            { valor: "nenhum", rotulo: "Sem agrupamento" },
            { valor: "categoria", rotulo: "Agrupar por Categoria" },
          ]}
        />
        <Seletor
          aria-label="Ordenação"
          value={ordenacao}
          onChange={(v) => setOrdenacao(v as Ordenacao)}
          className="sm:w-56"
          opcoes={[
            { valor: "nome", rotulo: "Ordenar por Nome" },
            { valor: "categoria", rotulo: "Ordenar por Categoria" },
            { valor: "unidade", rotulo: "Ordenar por Unidade" },
          ]}
        />
      </div>

      {preparosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-texto-suave">
          Nenhum preparo encontrado com esse filtro.
        </p>
      ) : grupos ? (
        <div className="divide-y divide-borda">
          {grupos.map(([categoria, itens]) => (
            <div key={categoria}>
              <p className="bg-white/[0.03] px-6 py-2 text-[13px] font-medium text-texto-suave">
                {categoria}
              </p>
              <ul className="divide-y divide-borda">
                <LinhasAgrupadas itens={itens} />
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-borda">
          <LinhasAgrupadas itens={preparosFiltrados} />
        </ul>
      )}
    </div>
  );
}
