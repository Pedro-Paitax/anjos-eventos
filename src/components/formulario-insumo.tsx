"use client";

import { useActionState } from "react";
import type { InsumoResumo } from "@/lib/insumos";
import { UNIDADES_INSUMO } from "@/lib/preparos-opcoes";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import type { EstadoFormularioInsumo } from "@/app/actions/insumo";

type FormularioInsumoProps = {
  valoresIniciais: InsumoResumo;
  action: (
    estadoAnterior: EstadoFormularioInsumo,
    formData: FormData
  ) => Promise<EstadoFormularioInsumo>;
  rotuloEnvio: string;
};

export function FormularioInsumo({
  valoresIniciais,
  action,
  rotuloEnvio,
}: FormularioInsumoProps) {
  const [estado, formAction, pendente] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Dados do insumo</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className={rotuloClasse}>
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          defaultValue={estado.valores?.nome ?? valoresIniciais.nome}
          required
          className={campoClasse}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="udm" className={rotuloClasse}>
            Unidade
          </label>
          <select
            id="udm"
            name="udm"
            defaultValue={estado.valores?.udm ?? valoresIniciais.udm}
            className={campoClasse}
          >
            {UNIDADES_INSUMO.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preco" className={rotuloClasse}>
            Preço (R$)
          </label>
          <input
            id="preco"
            name="preco"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={estado.valores?.preco ?? valoresIniciais.preco ?? ""}
            className={campoClasse}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fatorCorrecao" className={rotuloClasse}>
            Fator de correção
          </label>
          <input
            id="fatorCorrecao"
            name="fatorCorrecao"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={estado.valores?.fatorCorrecao ?? valoresIniciais.fatorCorrecao ?? ""}
            className={campoClasse}
          />
        </div>
      </div>

      {estado.erro && <p className="text-sm text-ember">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-5 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 disabled:opacity-50"
      >
        {pendente ? "Salvando…" : rotuloEnvio}
      </button>
    </form>
  );
}
