"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Colaborador } from "@/lib/colaboradores";
import {
  FUNCOES_COLABORADOR,
} from "@/lib/colaboradores-opcoes";
import { rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import {
  OPCOES_POR_CAMPO,
  ROTULOS_CAMPO,
  ehValorLegado,
  type CampoOpcao,
} from "@/lib/decisoes-operacionais-opcoes";
import type { EstadoFormularioDecisoes } from "@/app/actions/decisoes-operacionais";
import { BotaoEnviar } from "@/components/botao-enviar";
import { botaoClasse } from "@/components/botao";
import { Alerta } from "@/components/alerta";
import { Seletor } from "@/components/seletor";
import { Campo } from "@/components/campo";

type ValoresDecisoes = {
  veiculo: string | null;
  modelo_prato: string | null;
  sousplat: boolean;
  tipo_bebida_recipiente: string | null;
  taca_furta_cor: boolean;
  qtd_taca_furta_cor?: number | null;
  taca_champanhe: boolean;
  qtd_taca_champanhe?: number | null;
  tipo_talher: string | null;
};

type FormularioDecisoesProps = {
  colaboradoresAtivos: Colaborador[];
  equipeIds: number[];
  /** `eventos.qtd_garcons`: só para exibir "N de M alocados"; a regra de pendência continua em `pendencias-evento`. */
  garconsNecessarios?: number | null;
  valoresIniciais: ValoresDecisoes | null;
  action: (
    estadoAnterior: EstadoFormularioDecisoes,
    formData: FormData
  ) => Promise<EstadoFormularioDecisoes>;
};

type Funcao = (typeof FUNCOES_COLABORADOR)[number];

const ROTULOS_PLURAL: Record<Funcao, string> = {
  copeira: "Copeiras",
  assador: "Assadores",
  garcom: "Garçons",
};

function contarPorFuncao(ids: number[], ativos: Colaborador[]): Record<Funcao, number> {
  const total: Record<Funcao, number> = { copeira: 0, assador: 0, garcom: 0 };
  for (const c of ativos) if (ids.includes(c.id)) total[c.funcao] += 1;
  return total;
}

function textoContagem(alocados: number, minimo: number): string {
  if (minimo === 0) return `${alocados} ${alocados === 1 ? "alocado" : "alocados"}`;
  if (alocados > minimo) return `${alocados} alocados (mínimo ${minimo})`;
  return `${alocados} de ${minimo} ${minimo === 1 ? "alocado" : "alocados"}`;
}

function IconeEstado({ ok }: { ok: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {ok ? (
        <>
          <circle cx="10" cy="10" r="8" />
          <path d="m6.5 10.5 2.5 2.5 4.5-5" />
        </>
      ) : (
        <>
          <path d="M10 3 18 17H2L10 3Z" />
          <path d="M10 8v4M10 14.5v.01" />
        </>
      )}
    </svg>
  );
}

function CampoSelect({
  nome,
  valor,
  enviado,
}: {
  nome: CampoOpcao;
  valor: string | null | undefined;
  /** Valor enviado antes de um erro; tem prioridade sobre o salvo. */
  enviado?: string;
}) {
  valor = enviado ?? valor;
  const legado = ehValorLegado(nome, valor) ? valor : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nome} className={rotuloClasse}>
        {ROTULOS_CAMPO[nome]}
      </label>
      <Seletor
        id={nome}
        name={nome}
        defaultValue={valor ?? ""}
        opcoes={[
          { valor: "", rotulo: "Selecione…" },
          ...OPCOES_POR_CAMPO[nome].map((opcao) => ({ valor: opcao, rotulo: opcao })),
          ...(legado ? [{ valor: legado, rotulo: `${legado} (valor antigo)` }] : []),
        ]}
      />
    </div>
  );
}

export function FormularioDecisoesOperacionais({
  colaboradoresAtivos,
  equipeIds,
  garconsNecessarios,
  valoresIniciais,
  action,
}: FormularioDecisoesProps) {
  const [estado, formAction] = useActionState(action, {});
  const [alocados, setAlocados] = useState(() =>
    contarPorFuncao(equipeIds, colaboradoresAtivos)
  );
  const furtaCorInicial = estado.valores
    ? "tacaFurtaCor" in estado.valores
    : (valoresIniciais?.taca_furta_cor ?? false);
  const champanheInicial = estado.valores
    ? "tacaChampanhe" in estado.valores
    : (valoresIniciais?.taca_champanhe ?? false);
  // Quantidade de taças: o campo só existe com a caixa marcada (some ao desmarcar → gravada nula).
  const [tacas, setTacas] = useState({ furtaCor: furtaCorInicial, champanhe: champanheInicial });
  const minimos: Record<Funcao, number> = {
    copeira: 1,
    assador: 1,
    garcom: garconsNecessarios ?? 0,
  };

  // A contagem lê as caixas marcadas no DOM (continuam sem estado próprio: o payload não muda).
  function recontar(form: HTMLFormElement) {
    const marcados = [
      ...form.querySelectorAll<HTMLInputElement>('input[name="colaboradorIds"]:checked'),
    ].map((i) => Number(i.value));
    setAlocados(contarPorFuncao(marcados, colaboradoresAtivos));
    setTacas({
      furtaCor: form.querySelector<HTMLInputElement>('input[name="tacaFurtaCor"]')?.checked ?? false,
      champanhe: form.querySelector<HTMLInputElement>('input[name="tacaChampanhe"]')?.checked ?? false,
    });
  }

  // Ao marcar uma taça o campo da quantidade aparece e recebe o foco (anuncia o rótulo).
  function aoMudar(e: React.ChangeEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    recontar(form);
    const alvo = e.target as HTMLInputElement;
    const campoQtd =
      alvo.name === "tacaFurtaCor" ? "qtdTacaFurtaCor" : alvo.name === "tacaChampanhe" ? "qtdTacaChampanhe" : null;
    if (campoQtd && alvo.checked) {
      setTimeout(() => form.querySelector<HTMLInputElement>(`input[name="${campoQtd}"]`)?.focus(), 0);
    }
  }

  return (
    <form
      action={formAction}
      onChange={aoMudar}
      onReset={(e) => {
        const form = e.currentTarget;
        setTimeout(() => recontar(form), 0);
      }}
      className="flex flex-col gap-6"
    >
      <h3 className={secaoTituloClasse}>Equipe</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FUNCOES_COLABORADOR.map((funcao) => {
          const doGrupo = colaboradoresAtivos.filter((c) => c.funcao === funcao);
          const minimo = minimos[funcao];
          const completo = alocados[funcao] >= minimo;
          const faltaCadastro = doGrupo.length < minimo;
          return (
            <fieldset key={funcao} className="flex flex-col gap-2">
              <legend className="mb-1 flex flex-wrap items-center gap-x-1.5 text-sm font-medium text-texto-suave">
                <span className="text-texto">{ROTULOS_PLURAL[funcao]}:</span>
                <span
                  aria-live="polite"
                  className={`inline-flex items-center gap-1 ${completo ? "text-sucesso" : "text-aviso"}`}
                >
                  <IconeEstado ok={completo} />
                  {textoContagem(alocados[funcao], minimo)}
                </span>
              </legend>
              {doGrupo.map((c, i) => (
                <label
                  key={c.id}
                  className="flex min-h-14 items-center gap-3 rounded-controle border border-borda-controle px-3.5 py-2 text-base hover:border-[#a89c90] has-[:checked]:border-brasa has-[:checked]:bg-brasa/15 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco"
                >
                  <input
                    id={i === 0 ? `equipe-${funcao}` : undefined}
                    type="checkbox"
                    name="colaboradorIds"
                    value={c.id}
                    defaultChecked={(estado.equipeIds ?? equipeIds).includes(c.id)}
                  />
                  {c.nome}
                </label>
              ))}
              {faltaCadastro && (
                <p className="text-sm text-texto-suave">
                  {doGrupo.length === 0
                    ? "Nenhum ativo cadastrado. "
                    : `Só há ${doGrupo.length} ${doGrupo.length === 1 ? "ativo cadastrado" : "ativos cadastrados"}; ${minimo - doGrupo.length === 1 ? "falta 1" : `faltam ${minimo - doGrupo.length}`} para o mínimo. `}
                  <Link href="/colaboradores" className={`${botaoClasse("link", "sm")} min-h-11`}>
                    Cadastrar em Colaboradores
                  </Link>
                </p>
              )}
            </fieldset>
          );
        })}
      </div>

      <h3 className={secaoTituloClasse}>Logística</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <CampoSelect nome="veiculo" valor={valoresIniciais?.veiculo} enviado={estado.valores?.veiculo} />
        <CampoSelect nome="modeloPrato" valor={valoresIniciais?.modelo_prato} enviado={estado.valores?.modeloPrato} />
        <CampoSelect nome="tipoBebidaRecipiente" valor={valoresIniciais?.tipo_bebida_recipiente} enviado={estado.valores?.tipoBebidaRecipiente} />
        <CampoSelect nome="tipoTalher" valor={valoresIniciais?.tipo_talher} enviado={estado.valores?.tipoTalher} />
      </div>

      <h3 className={secaoTituloClasse}>Adicionais</h3>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="sousplat" defaultChecked={estado.valores ? "sousplat" in estado.valores : (valoresIniciais?.sousplat ?? false)} />
          Sousplat
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="tacaFurtaCor" defaultChecked={estado.valores ? "tacaFurtaCor" in estado.valores : (valoresIniciais?.taca_furta_cor ?? false)} />
          Taça furta-cor
        </label>
        {tacas.furtaCor && (
          <div className="ml-8 max-w-xs">
            <Campo rotulo="Quantidade de taças furta-cor">
              {(p) => (
                <input {...p}
                  name="qtdTacaFurtaCor"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  defaultValue={estado.valores?.qtdTacaFurtaCor ?? valoresIniciais?.qtd_taca_furta_cor ?? ""}
                />
              )}
            </Campo>
          </div>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="tacaChampanhe" defaultChecked={estado.valores ? "tacaChampanhe" in estado.valores : (valoresIniciais?.taca_champanhe ?? false)} />
          Taça de champanhe
        </label>
        {tacas.champanhe && (
          <div className="ml-8 max-w-xs">
            <Campo rotulo="Quantidade de taças de champanhe">
              {(p) => (
                <input {...p}
                  name="qtdTacaChampanhe"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  required
                  defaultValue={estado.valores?.qtdTacaChampanhe ?? valoresIniciais?.qtd_taca_champanhe ?? ""}
                />
              )}
            </Campo>
          </div>
        )}
      </div>

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      {/* Barra de salvar: fixa no rodapé, como a do orçamento. */}
      <div className="barra-salvar sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-end gap-3 rounded-cartao border border-borda-forte bg-elevada p-3 shadow-barra rail:bottom-4">
        {estado.salvo && (
          <p role="status" className="mr-auto pl-1 text-sm text-sucesso">
            Decisões salvas.
          </p>
        )}
        <BotaoEnviar rotulo="Salvar decisões operacionais" className="flex-1 whitespace-nowrap rail:flex-none" />
      </div>
    </form>
  );
}
