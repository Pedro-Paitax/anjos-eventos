"use client";

import { useActionState } from "react";
import type { EstadoFormularioOrcamento } from "@/app/actions/orcamento";
import { Alerta } from "@/components/alerta";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { BotaoEnviar } from "@/components/botao-enviar";

type FormularioOrcamentoGenericoProps = {
  empresaId: number;
  action: (estadoAnterior: EstadoFormularioOrcamento, formData: FormData) => Promise<EstadoFormularioOrcamento>;
};

export function FormularioOrcamentoGenerico({ empresaId, action }: FormularioOrcamentoGenericoProps) {
  // Em erro, a ação devolve o que foi digitado e o formulário mostra de novo (D4).
  const [estado, formAction] = useActionState(action, {});
  const v = (campo: string) => estado.valores?.[campo];

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="empresaId" value={empresaId} />

      <p className="text-sm text-texto-suave">
        Modelo de contrato ainda não definido pra esta empresa — orçamento
        fechado direto no valor negociado, sem itens de cardápio.
      </p>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cliente</h3>
        <Campo rotulo="Cliente">
          {(p) => (
            <input {...p} name="clienteNome" type="text" required defaultValue={v("clienteNome")} />
          )}
        </Campo>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Convidados</h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Campo rotulo="Adultos">
            {(p) => (
              <input {...p} name="qtdAdultos" type="number" min={0} defaultValue={v("qtdAdultos") ?? 0} />
            )}
          </Campo>
          <Campo rotulo="Crianças até 5 anos">
            {(p) => (
              <input {...p}
                name="qtdCriancasAte5"
                type="number"
                min={0}
                defaultValue={v("qtdCriancasAte5") ?? 0}
              />
            )}
          </Campo>
          <Campo rotulo="Crianças de 5 a 10 anos">
            {(p) => (
              <input {...p}
                name="qtdCriancas5a10"
                type="number"
                min={0}
                defaultValue={v("qtdCriancas5a10") ?? 0}
              />
            )}
          </Campo>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Valor</h3>
        <Campo rotulo="Valor negociado (R$)">
          {(p) => (
            <input {...p}
              name="valorNegociado"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={v("valorNegociado")}
            />
          )}
        </Campo>
      </section>

      {estado.erro && (
        <div role="alert">
          <Alerta tipo="perigo">{estado.erro}</Alerta>
        </div>
      )}

      <BotaoEnviar rotulo="Gerar Orçamento" className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
