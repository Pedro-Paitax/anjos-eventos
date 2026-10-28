"use client";

import { useActionState, type ReactNode } from "react";
import type { EstadoAcao } from "@/app/actions/prospeccao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";
import type { VarianteBotao } from "@/components/botao";

type FormularioAcaoProps = {
  action: (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;
  rotulo: string;
  rotuloEnviando?: string;
  variante?: VarianteBotao;
  className?: string;
  /** Recebe o estado (para repor `valores` depois de erro). */
  children?: ReactNode | ((estado: EstadoAcao) => ReactNode);
};

/** Formulário de uma Server Action da prospecção: campos + botão + erro/sucesso. */
export function FormularioAcao({
  action,
  rotulo,
  rotuloEnviando,
  variante,
  className = "flex flex-col gap-4",
  children,
}: FormularioAcaoProps) {
  const [estado, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {typeof children === "function" ? children(estado) : children}
      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}
      <BotaoEnviar rotulo={rotulo} rotuloEnviando={rotuloEnviando} variante={variante} className="self-start" />
    </form>
  );
}
