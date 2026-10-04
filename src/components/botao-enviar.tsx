"use client";

import { useFormStatus } from "react-dom";
import { Botao, type VarianteBotao } from "@/components/botao";

type BotaoEnviarProps = {
  rotulo: string;
  rotuloEnviando?: string;
  variante?: VarianteBotao;
  className?: string;
};

/** Botão de envio: desabilita e muda o texto enquanto o formulário envia. Não altera o payload. */
export function BotaoEnviar({
  rotulo,
  rotuloEnviando = "Salvando…",
  variante = "primario",
  className,
}: BotaoEnviarProps) {
  const { pending } = useFormStatus();
  return (
    <Botao
      type="submit"
      variante={variante}
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? rotuloEnviando : rotulo}
    </Botao>
  );
}
