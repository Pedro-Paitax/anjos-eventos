import type { ReactNode } from "react";
import type { PrecoObservado } from "@/lib/precos-insumo";
import { ROTULOS_FONTE, diasEntre, formatarDiaCurto, formatarReais, idadeTexto } from "@/lib/precos-opcoes";

// Peças visuais de fornecedores e preços (servidor). Cor nunca sozinha: o chip diz o estado em texto.

/** Mesma forma do chip "Confirmado" (sucesso sobre sucesso a 14 % = 6,75:1, DESIGN-SYSTEM §4.2). */
export function ChipMenorPreco() {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-sucesso/[0.14] px-2.5 py-1 text-[13px] font-semibold text-sucesso">
      <svg aria-hidden="true" viewBox="0 0 20 20" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="m5.5 10.5 3 3 6-7" />
      </svg>
      Menor preço
    </span>
  );
}

/** Chip neutro, mesma forma do "Realizado" (`texto-suave` sobre branco a 6 % = 6,65:1). */
export function ChipNeutro({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-chip bg-white/[0.06] px-2.5 py-1 text-[13px] font-semibold text-texto-suave">
      {children}
    </span>
  );
}

/**
 * Preço com mais de 14 dias (PRAZO_PRECO_DIAS). Mesma forma dos chips de status:
 * aviso sobre aviso a 14 % em `superficie` = 7,55:1 (calculado em 2026-11-02). Triângulo + texto, nunca só cor.
 */
export function ChipDesatualizado() {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip bg-aviso/[0.14] px-2.5 py-1 text-[13px] font-semibold text-aviso">
      <svg aria-hidden="true" viewBox="0 0 20 20" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3 18 17H2L10 3Z" />
        <path d="M10 8v4M10 14.5v.01" />
      </svg>
      Desatualizado
    </span>
  );
}

/** "12/10/2026 · há 21 dias" (a idade é relativa a `hoje`, "AAAA-MM-DD", calculado no servidor). */
export function dataComIdade(dia: string, hoje: string): string {
  return `${formatarDiaCurto(dia)} · ${idadeTexto(diasEntre(dia, hoje))}`;
}

type ListaPrecosProps = {
  precos: PrecoObservado[];
  hoje: string;
  /** O que vai em destaque em cada linha. */
  titulo: (p: PrecoObservado) => string;
  /** Partes da linha de detalhe (as vazias somem). */
  detalhe: (p: PrecoObservado) => (string | null | undefined)[];
  menores?: Set<number>;
  /** Ação por linha (ex.: botão "Usar no cadastro"), abaixo do detalhe. */
  acao?: (p: PrecoObservado) => ReactNode;
};

/** Lista de preços: nome e detalhe à esquerda, valor à direita (números tabulares). Serve no celular sem tabela. */
export function ListaPrecos({ precos, hoje, titulo, detalhe, menores, acao }: ListaPrecosProps) {
  return (
    <ul className="divide-y divide-borda">
      {precos.map((p) => {
        const unidade = p.insumoUnidade ?? p.unidadeFornecedor;
        return (
          <li key={p.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-semibold [overflow-wrap:anywhere]">{titulo(p)}</p>
              <p className="text-sm text-texto-suave">
                {/* Como o fornecedor vende (ex.: "CX ~24 kg · peça R$ 56,12/kg"); sem insumo ligado, vira a unidade do preço. */}
                {[...detalhe(p), p.insumoUnidade ? p.unidadeFornecedor : null, ROTULOS_FONTE[p.fonte], dataComIdade(p.observadoEm, hoje)]
                  .filter(Boolean)
                  .join(" · ")}
                {p.urlFonte && (
                  <>
                    {" · "}
                    <a href={p.urlFonte} target="_blank" rel="noreferrer noopener" className="text-link underline underline-offset-4">
                      ver fonte
                    </a>
                  </>
                )}
              </p>
              {acao?.(p)}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-right">
              <p className="text-[17px] font-semibold tabular-nums">
                {formatarReais(p.preco)}
                {unidade && <span className="text-sm font-normal text-texto-suave"> /{unidade}</span>}
              </p>
              {menores?.has(p.id) && <ChipMenorPreco />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
