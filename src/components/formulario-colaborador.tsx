"use client";

import { useActionState } from "react";
import type { Colaborador } from "@/lib/colaboradores";
import { FUNCOES_COLABORADOR, ROTULOS_FUNCAO } from "@/lib/colaboradores-opcoes";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import type { EstadoFormularioColaborador } from "@/app/actions/colaborador";

type FormularioColaboradorProps = {
  valoresIniciais?: Colaborador;
  action: (
    estadoAnterior: EstadoFormularioColaborador,
    formData: FormData
  ) => Promise<EstadoFormularioColaborador>;
  rotuloEnvio: string;
};

export function FormularioColaborador({
  valoresIniciais,
  action,
  rotuloEnvio,
}: FormularioColaboradorProps) {
  const [estado, formAction, pendente] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Dados do colaborador</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className={rotuloClasse}>
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          defaultValue={estado.valores?.nome ?? valoresIniciais?.nome}
          required
          className={campoClasse}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="funcao" className={rotuloClasse}>
            Função
          </label>
          <select
            id="funcao"
            name="funcao"
            defaultValue={estado.valores?.funcao ?? valoresIniciais?.funcao ?? "copeira"}
            className={campoClasse}
          >
            {FUNCOES_COLABORADOR.map((f) => (
              <option key={f} value={f}>
                {ROTULOS_FUNCAO[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="telefoneWhatsapp" className={rotuloClasse}>
            WhatsApp (com DDI)
          </label>
          <input
            id="telefoneWhatsapp"
            name="telefoneWhatsapp"
            type="tel"
            placeholder="5541999999999"
            defaultValue={estado.valores?.telefoneWhatsapp ?? valoresIniciais?.telefone_whatsapp ?? ""}
            className={campoClasse}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={estado.valores ? estado.valores.ativo === "on" : (valoresIniciais?.ativo ?? true)}
        />
        Ativo
      </label>

      {estado.erro && <p className="text-sm text-perigo-claro">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center justify-center self-start rounded-[2px] bg-acao px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:bg-acao-forte disabled:opacity-50"
      >
        {pendente ? "Salvando…" : rotuloEnvio}
      </button>
    </form>
  );
}
