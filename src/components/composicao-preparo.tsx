"use client";

import { useState, useTransition } from "react";
import type { Insumo } from "@/lib/insumos";
import { UNIDADES_INSUMO, type UnidadeInsumo } from "@/lib/preparos-opcoes";
import { criarInsumoInlineAction } from "@/app/actions/preparo";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Modal } from "@/components/modal";
import { Alerta } from "@/components/alerta";
import { botaoClasse } from "@/components/botao";

type LinhaComposicao = {
  chave: string; // key estável pro React — não é o Id do NocoDB
  id: number | null; // Id da Composição no NocoDB (null = linha nova, ainda não gravada)
  insumoId: number | "";
  quantidade: string;
};

const OPCAO_NOVO_INSUMO = "__novo__";

let proximaChave = 0;
function novaChave(): string {
  proximaChave += 1;
  return `nova-${proximaChave}`;
}

export function ComposicaoPreparo({
  insumosIniciais,
  composicaoInicial,
}: {
  insumosIniciais: Insumo[];
  composicaoInicial: Array<{ id: number; insumoId: number; quantidade: number }>;
}) {
  const [insumos, setInsumos] = useState(insumosIniciais);
  const [linhas, setLinhas] = useState<LinhaComposicao[]>(() =>
    composicaoInicial.map((c) => ({
      chave: `existente-${c.id}`,
      id: c.id,
      insumoId: c.insumoId,
      quantidade: String(c.quantidade),
    }))
  );
  const [modalParaLinha, setModalParaLinha] = useState<string | null>(null);

  function adicionarLinha() {
    setLinhas((atual) => [
      ...atual,
      { chave: novaChave(), id: null, insumoId: "", quantidade: "" },
    ]);
  }

  function removerLinha(chave: string) {
    setLinhas((atual) => atual.filter((l) => l.chave !== chave));
  }

  function atualizarLinha(chave: string, mudanca: Partial<LinhaComposicao>) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  function aoMudarInsumo(chave: string, valor: string) {
    if (valor === OPCAO_NOVO_INSUMO) {
      setModalParaLinha(chave);
      return;
    }
    atualizarLinha(chave, { insumoId: Number(valor) });
  }

  function insumoCriado(chave: string, insumo: Insumo) {
    setInsumos((atual) =>
      [...atual, insumo].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    );
    atualizarLinha(chave, { insumoId: insumo.id });
    setModalParaLinha(null);
  }

  return (
    <section className="flex flex-col gap-5">
      <h3 className={secaoTituloClasse}>Composição</h3>

      <div className="flex flex-col gap-3">
        {linhas.length === 0 && (
          <p className="text-sm text-paper-dim">Nenhum insumo adicionado ainda.</p>
        )}
        {linhas.map((linha, i) => (
          <div
            key={linha.chave}
            className="flex flex-col gap-3 rounded-[2px] border border-paper-dim/20 bg-ink-soft p-3 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="composicaoId" value={linha.id ?? ""} />
            <div className="flex flex-1 flex-col gap-1.5">
              <label className={rotuloClasse}>Insumo</label>
              <select
                required
                aria-label="Insumo"
                name="composicaoInsumoId"
                value={linha.insumoId}
                onChange={(e) => aoMudarInsumo(linha.chave, e.target.value)}
                className={campoClasse}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {insumos.map((insumo) => (
                  <option key={insumo.id} value={insumo.id}>
                    {insumo.nome} ({insumo.udm})
                  </option>
                ))}
                <option value={OPCAO_NOVO_INSUMO}>+ Criar novo insumo</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:w-32">
              <label className={rotuloClasse}>Quantidade</label>
              <input
                required
                aria-label="Quantidade"
                type="number"
                step="0.001"
                min="0"
                name="composicaoQuantidade"
                value={linha.quantidade}
                onChange={(e) => atualizarLinha(linha.chave, { quantidade: e.target.value })}
                className={campoClasse}
              />
            </div>
            <button
              type="button"
              onClick={() => removerLinha(linha.chave)}
              aria-label={`Remover insumo ${i + 1}`}
              className="self-start text-sm text-acao-claro underline decoration-acao-claro/40 underline-offset-4 transition hover:decoration-acao-claro sm:self-center"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={adicionarLinha}
        className="self-start rounded-[2px] bg-paper px-3 py-1.5 text-sm font-medium text-paper-ink transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      >
        + Adicionar Insumo
      </button>

      {modalParaLinha && (
        <ModalNovoInsumo
          onFechar={() => setModalParaLinha(null)}
          onCriado={(insumo) => insumoCriado(modalParaLinha, insumo)}
        />
      )}
    </section>
  );
}

function ModalNovoInsumo({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: (insumo: Insumo) => void;
}) {
  const [nome, setNome] = useState("");
  const [udm, setUdm] = useState<UnidadeInsumo>(UNIDADES_INSUMO[0]);
  const [preco, setPreco] = useState("");
  const [fatorCorrecao, setFatorCorrecao] = useState("1");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function salvar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        const insumo = await criarInsumoInlineAction({
          nome,
          udm,
          preco: Number(preco),
          fatorCorrecao: Number(fatorCorrecao),
        });
        onCriado(insumo);
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  }

  return (
    <Modal
      titulo="Novo insumo"
      mostrarFechar
      cliqueForaFecha={!nome.trim() && !preco}
      onFechar={onFechar}
      className="max-w-md bg-ink"
    >
      <div className="flex flex-col gap-1.5">
        <label className={rotuloClasse}>Nome</label>
        <input aria-label="Nome" data-foco-inicial value={nome} onChange={(e) => setNome(e.target.value)} className={campoClasse} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={rotuloClasse}>Unidade</label>
        <select
          aria-label="Unidade"
          value={udm}
          onChange={(e) => setUdm(e.target.value as UnidadeInsumo)}
          className={campoClasse}
        >
          {UNIDADES_INSUMO.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className={rotuloClasse}>Preço (R$)</label>
          <input
            aria-label="Preço (R$)"
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            className={campoClasse}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={rotuloClasse}>Fator de correção</label>
          <input
            aria-label="Fator de correção"
            type="number"
            step="0.01"
            min="0"
            value={fatorCorrecao}
            onChange={(e) => setFatorCorrecao(e.target.value)}
            className={campoClasse}
          />
        </div>
      </div>

      {erro && <Alerta tipo="perigo">{erro}</Alerta>}

      <button
        type="button"
        onClick={salvar}
        disabled={pendente || !nome.trim() || !preco}
        className={`${botaoClasse()} mt-1 self-start`}
      >
        {pendente ? "Salvando…" : "Criar insumo"}
      </button>
    </Modal>
  );
}
