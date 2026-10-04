"use client";

import type { PassosPreparo } from "@/lib/passos-preparo";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { botaoClasse } from "@/components/botao";

export type LinhaPasso = {
  chave: string; // key estável pro React — não é o Id/ordem
  descricao: string;
  tempoEstimadoMin: string; // texto do input; convertido pra number|null no envio
};

let proximaChave = 0;
function novaChave(): string {
  proximaChave += 1;
  return `passo-${proximaChave}`;
}

export function linhasIniciaisDePassos(passos: PassosPreparo): LinhaPasso[] {
  return passos.map((p) => ({
    chave: novaChave(),
    descricao: p.descricao,
    tempoEstimadoMin: p.tempo_estimado_min == null ? "" : String(p.tempo_estimado_min),
  }));
}

/** Deriva o array {ordem, descricao, tempo_estimado_min} a partir das linhas do editor — ordem é sempre a posição atual (1-based), recalculada aqui, nunca guardada em estado separado. */
export function linhasParaPassos(linhas: LinhaPasso[]): PassosPreparo {
  return linhas.map((l, i) => ({
    ordem: i + 1,
    descricao: l.descricao.trim(),
    tempo_estimado_min: l.tempoEstimadoMin.trim() === "" ? null : Number(l.tempoEstimadoMin),
  }));
}

export function EditorPassosPreparo({
  linhas,
  onMudar,
}: {
  linhas: LinhaPasso[];
  onMudar: (linhas: LinhaPasso[]) => void;
}) {
  function adicionarLinha() {
    onMudar([...linhas, { chave: novaChave(), descricao: "", tempoEstimadoMin: "" }]);
  }

  function removerLinha(chave: string) {
    onMudar(linhas.filter((l) => l.chave !== chave));
  }

  function moverLinha(chave: string, direcao: -1 | 1) {
    const i = linhas.findIndex((l) => l.chave === chave);
    const j = i + direcao;
    if (i < 0 || j < 0 || j >= linhas.length) return;
    const copia = [...linhas];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onMudar(copia);
  }

  function atualizarLinha(chave: string, mudanca: Partial<LinhaPasso>) {
    onMudar(linhas.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className={secaoTituloClasse}>Passos estruturados</p>
      <p className="text-sm text-texto-suave">
        Opcional por enquanto — o Modo de Preparo acima continua sendo a
        fonte oficial até todos os preparos serem revisados nesse formato.
      </p>

      {linhas.length === 0 && (
        <p className="text-sm text-texto-suave">Nenhum passo estruturado ainda.</p>
      )}

      {linhas.map((linha, i) => (
        <div
          key={linha.chave}
          className="flex flex-col gap-3 rounded-controle border border-borda-forte bg-elevada p-3 sm:flex-row sm:items-start"
        >
          <span className="pt-2 text-sm text-texto-suave sm:w-8">{i + 1}.</span>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className={rotuloClasse}>Descrição</label>
            <textarea
              required
              aria-label={`Descrição do passo ${i + 1}`}
              rows={2}
              value={linha.descricao}
              onChange={(e) => atualizarLinha(linha.chave, { descricao: e.target.value })}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-40">
            <label className={rotuloClasse}>Tempo estimado (min)</label>
            <input
              aria-label={`Tempo estimado do passo ${i + 1} (min)`}
              type="number"
              min="1"
              step="1"
              value={linha.tempoEstimadoMin}
              onChange={(e) => atualizarLinha(linha.chave, { tempoEstimadoMin: e.target.value })}
              className={campoClasse}
            />
          </div>
          <div className="flex gap-2 pt-6 sm:pt-7">
            <button
              type="button"
              onClick={() => moverLinha(linha.chave, -1)}
              disabled={i === 0}
              aria-label={`Mover passo ${i + 1} para cima`}
              className={`${botaoClasse("secundario", "sm")} min-w-11 px-0`}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => moverLinha(linha.chave, 1)}
              disabled={i === linhas.length - 1}
              aria-label={`Mover passo ${i + 1} para baixo`}
              className={`${botaoClasse("secundario", "sm")} min-w-11 px-0`}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => removerLinha(linha.chave)}
              aria-label={`Remover passo ${i + 1}`}
              className="text-sm text-link underline decoration-link/40 underline-offset-4 transition hover:decoration-link"
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={adicionarLinha}
        className="self-start rounded-controle bg-superficie px-3 py-1.5 text-sm font-medium text-texto transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
      >
        + Adicionar passo
      </button>
    </div>
  );
}

