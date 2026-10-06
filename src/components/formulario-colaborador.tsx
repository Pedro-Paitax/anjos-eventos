"use client";

import { useActionState } from "react";
import type { Colaborador } from "@/lib/colaboradores";
import { FUNCOES_COLABORADOR, ROTULOS_FUNCAO } from "@/lib/colaboradores-opcoes";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import type { EstadoFormularioColaborador } from "@/app/actions/colaborador";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

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
  const [estado, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Dados do colaborador</h3>

      <Campo rotulo="Nome">
        {(p) => (
          <input {...p}
            name="nome"
            defaultValue={estado.valores?.nome ?? valoresIniciais?.nome}
            required
          />
        )}
      </Campo>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo rotulo="Função">
          {(p) => (
            <Seletor {...p}
              name="funcao"
              defaultValue={estado.valores?.funcao ?? valoresIniciais?.funcao ?? "copeira"}
              opcoes={FUNCOES_COLABORADOR.map((f) => ({ valor: f, rotulo: ROTULOS_FUNCAO[f] }))}
            />
          )}
        </Campo>
        <Campo rotulo="WhatsApp (com DDI)">
          {(p) => (
            <input {...p}
              name="telefoneWhatsapp"
              type="tel"
              placeholder="5541999999999"
              defaultValue={estado.valores?.telefoneWhatsapp ?? valoresIniciais?.telefone_whatsapp ?? ""}
            />
          )}
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="ativo"
          defaultChecked={estado.valores ? estado.valores.ativo === "on" : (valoresIniciais?.ativo ?? true)}
        />
        Ativo
      </label>

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
