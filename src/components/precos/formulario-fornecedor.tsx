"use client";

import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";
import type { EstadoFormularioPreco } from "@/app/actions/precos";
import type { Fornecedor } from "@/lib/precos-insumo";

type Props = {
  action: (estado: EstadoFormularioPreco, formData: FormData) => Promise<EstadoFormularioPreco>;
  /** Ausente = cadastro novo (só nome e telefone; nasce ativo). */
  fornecedor?: Fornecedor;
};

export function FormularioFornecedor({ action, fornecedor }: Props) {
  const [estado, formAction] = useActionState(action, {});
  const v = estado.valores;
  const editando = Boolean(fornecedor);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {editando && <input type="hidden" name="editando" value="1" />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo rotulo="Nome">
          {(p) => (
            <input {...p}
              name="nome"
              required
              autoComplete="organization"
              placeholder={editando ? undefined : "Ex.: Frigorífico Boa Carne"}
              defaultValue={v?.nome ?? fornecedor?.nome ?? ""}
            />
          )}
        </Campo>
        <Campo rotulo="WhatsApp (opcional)" ajuda="Com DDD. Fica guardado só para consulta.">
          {(p) => (
            <input {...p}
              name="telefone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={v?.telefone ?? fornecedor?.telefone ?? ""}
            />
          )}
        </Campo>
      </div>

      {editando && (
        <>
          <Campo rotulo="Observações (opcional)" ajuda="Ex.: pedido mínimo, dia de entrega, contato do vendedor.">
            {(p) => <textarea {...p} name="observacoes" rows={3} defaultValue={v?.observacoes ?? fornecedor?.observacoes ?? ""} />}
          </Campo>
          <label className="flex flex-wrap items-center gap-x-3 gap-y-1 text-texto">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={v ? v.ativo === "on" : fornecedor?.ativo}
            />
            Fornecedor ativo
            <span className="text-sm text-texto-suave">(inativo some das listas de escolha, o histórico fica)</span>
          </label>
        </>
      )}

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <BotaoEnviar
        rotulo={editando ? "Salvar fornecedor" : "Cadastrar fornecedor"}
        className="w-full sm:w-auto sm:self-start"
      />
    </form>
  );
}
