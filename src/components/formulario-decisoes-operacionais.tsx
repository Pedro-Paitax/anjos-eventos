"use client";

import { useActionState } from "react";
import type { Colaborador } from "@/lib/colaboradores";
import {
  FUNCOES_COLABORADOR,
  ROTULOS_FUNCAO,
} from "@/lib/colaboradores-opcoes";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import {
  OPCOES_POR_CAMPO,
  ROTULOS_CAMPO,
  ehValorLegado,
  type CampoOpcao,
} from "@/lib/decisoes-operacionais-opcoes";
import type { EstadoFormularioDecisoes } from "@/app/actions/decisoes-operacionais";

type ValoresDecisoes = {
  veiculo: string | null;
  modelo_prato: string | null;
  sousplat: boolean;
  tipo_bebida_recipiente: string | null;
  taca_furta_cor: boolean;
  taca_champanhe: boolean;
  tipo_talher: string | null;
};

type FormularioDecisoesProps = {
  colaboradoresAtivos: Colaborador[];
  equipeIds: number[];
  valoresIniciais: ValoresDecisoes | null;
  action: (
    estadoAnterior: EstadoFormularioDecisoes,
    formData: FormData
  ) => Promise<EstadoFormularioDecisoes>;
};

function CampoSelect({
  nome,
  valor,
}: {
  nome: CampoOpcao;
  valor: string | null | undefined;
}) {
  const legado = ehValorLegado(nome, valor) ? valor : null;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={nome} className={rotuloClasse}>
        {ROTULOS_CAMPO[nome]}
      </label>
      <select id={nome} name={nome} defaultValue={valor ?? ""} className={campoClasse}>
        <option value="">Selecione…</option>
        {OPCOES_POR_CAMPO[nome].map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
        {legado && <option value={legado}>{legado} (valor antigo)</option>}
      </select>
    </div>
  );
}

export function FormularioDecisoesOperacionais({
  colaboradoresAtivos,
  equipeIds,
  valoresIniciais,
  action,
}: FormularioDecisoesProps) {
  const [estado, formAction, pendente] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Equipe</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FUNCOES_COLABORADOR.map((funcao) => {
          const doGrupo = colaboradoresAtivos.filter((c) => c.funcao === funcao);
          return (
            <fieldset key={funcao} className="flex flex-col gap-2">
              <legend className={rotuloClasse}>{ROTULOS_FUNCAO[funcao]}</legend>
              {doGrupo.length === 0 && (
                <p className="text-xs text-paper-dim">Nenhum ativo cadastrado.</p>
              )}
              {doGrupo.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="colaboradorIds"
                    value={c.id}
                    defaultChecked={equipeIds.includes(c.id)}
                  />
                  {c.nome}
                </label>
              ))}
            </fieldset>
          );
        })}
      </div>

      <h3 className={secaoTituloClasse}>Logística</h3>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <CampoSelect nome="veiculo" valor={valoresIniciais?.veiculo} />
        <CampoSelect nome="modeloPrato" valor={valoresIniciais?.modelo_prato} />
        <CampoSelect nome="tipoBebidaRecipiente" valor={valoresIniciais?.tipo_bebida_recipiente} />
        <CampoSelect nome="tipoTalher" valor={valoresIniciais?.tipo_talher} />
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="sousplat" defaultChecked={valoresIniciais?.sousplat ?? false} />
          Sousplat
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="tacaFurtaCor" defaultChecked={valoresIniciais?.taca_furta_cor ?? false} />
          Taça furta-cor
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="tacaChampanhe" defaultChecked={valoresIniciais?.taca_champanhe ?? false} />
          Taça de champanhe
        </label>
      </div>

      {estado.erro && <p className="text-sm text-ember">{estado.erro}</p>}
      {estado.salvo && <p className="text-sm text-sage">Decisões salvas.</p>}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 disabled:opacity-50"
      >
        {pendente ? "Salvando…" : "Salvar decisões operacionais"}
      </button>
    </form>
  );
}
