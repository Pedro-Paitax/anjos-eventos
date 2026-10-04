"use client";

import { useActionState } from "react";
import type { InsumoResumo } from "@/lib/insumos";
import { UNIDADES_INSUMO } from "@/lib/preparos-opcoes";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import type { EstadoFormularioInsumo } from "@/app/actions/insumo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

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
  const [estado, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Dados do insumo</h3>

      <Campo rotulo="Nome">
        {(p) => (
          <input {...p}
            name="nome"
            defaultValue={estado.valores?.nome ?? valoresIniciais.nome}
            required
          />
        )}
      </Campo>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Campo rotulo="Unidade">
          {(p) => (
            <select {...p}
              name="udm"
              defaultValue={estado.valores?.udm ?? valoresIniciais.udm}
            >
              {UNIDADES_INSUMO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo rotulo="Preço (R$)">
          {(p) => (
            <input {...p}
              name="preco"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={estado.valores?.preco ?? valoresIniciais.preco ?? ""}
            />
          )}
        </Campo>
        <Campo rotulo="Fator de correção">
          {(p) => (
            <input {...p}
              name="fatorCorrecao"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={estado.valores?.fatorCorrecao ?? valoresIniciais.fatorCorrecao ?? ""}
            />
          )}
        </Campo>
      </div>

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
