"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { PreparoResumo } from "@/lib/preparos";
import { excluirPreparoAction } from "@/app/actions/preparo";
import { CATEGORIAS_PREPARO } from "@/lib/preparos-opcoes";
import { Modal } from "@/components/modal";

const campoFiltroClasse =
  "rounded-[2px] border border-paper-ink/20 bg-transparent px-3 py-2 text-sm text-paper-ink placeholder:text-paper-ink/40 focus:border-brass focus:outline-none";

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

function LinhaPreparo({ preparo }: { preparo: PreparoResumo }) {
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
    <li className="flex flex-col gap-2 px-6 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <p className="font-display text-lg italic">{preparo.nome}</p>
          <p className="text-sm text-paper-ink/70">
            {preparo.categoria ?? "Sem categoria"} · {rotuloRendimento(preparo)}
          </p>
        </div>
        <div className="flex items-center gap-4 pl-0 sm:pl-0">
          <Link
            href={`/preparos/${preparo.id}`}
            className="text-sm underline decoration-paper-ink/30 underline-offset-4 transition hover:decoration-paper-ink"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            disabled={pendente}
            className="text-sm text-ember underline decoration-ember/40 underline-offset-4 transition hover:decoration-ember disabled:opacity-50"
          >
            {pendente ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
      {erro && <p className="text-sm text-ember">{erro}</p>}

      {confirmando && (
        <Modal onFechar={() => setConfirmando(false)} rotulo="Excluir preparo" className="max-w-sm bg-ink">
          <h4 className="font-display text-lg italic text-paper">Excluir preparo</h4>
          <p className="text-sm text-paper-dim">
            Excluir o preparo &quot;{preparo.nome}&quot;? Essa ação não pode ser
            desfeita.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="text-sm text-paper-dim underline decoration-paper-dim/40 underline-offset-4 transition hover:text-paper hover:decoration-paper"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarExclusao}
              className="inline-flex items-center justify-center rounded-[2px] bg-ember px-4 py-2 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110"
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </li>
  );
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
      <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
        Nenhum preparo cadastrado ainda. Cadastre o primeiro pra começar a
        montar as fichas técnicas.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-paper-ink/10 p-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={buscaNome}
          onChange={(e) => setBuscaNome(e.target.value)}
          placeholder="Buscar por nome…"
          className={`${campoFiltroClasse} sm:flex-1`}
        />
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className={`${campoFiltroClasse} sm:w-52`}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS_PREPARO.map((categoria) => (
            <option key={categoria} value={categoria}>
              {categoria}
            </option>
          ))}
        </select>
        <select
          value={agrupamento}
          onChange={(e) => setAgrupamento(e.target.value as Agrupamento)}
          className={`${campoFiltroClasse} sm:w-44`}
        >
          <option value="nenhum">Sem agrupamento</option>
          <option value="categoria">Agrupar por Categoria</option>
        </select>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          className={`${campoFiltroClasse} sm:w-44`}
        >
          <option value="nome">Ordenar por Nome</option>
          <option value="categoria">Ordenar por Categoria</option>
          <option value="unidade">Ordenar por Unidade</option>
        </select>
      </div>

      {preparosFiltrados.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-paper-ink/70">
          Nenhum preparo encontrado com esse filtro.
        </p>
      ) : grupos ? (
        <div className="divide-y divide-paper-ink/10">
          {grupos.map(([categoria, itens]) => (
            <div key={categoria}>
              <p className="bg-paper-ink/5 px-6 py-2 text-xs font-medium uppercase tracking-wide text-paper-ink/60">
                {categoria}
              </p>
              <ul className="divide-y divide-paper-ink/10">
                {itens.map((preparo) => (
                  <LinhaPreparo key={preparo.id} preparo={preparo} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-paper-ink/10">
          {preparosFiltrados.map((preparo) => (
            <LinhaPreparo key={preparo.id} preparo={preparo} />
          ))}
        </ul>
      )}
    </div>
  );
}
