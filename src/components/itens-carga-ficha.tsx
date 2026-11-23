"use client";

import { useActionState } from "react";
import type { EstadoItensCargaFicha } from "@/app/actions/checklist-carregamento";
import type { ItemMarcavel } from "@/lib/checklist-carregamento-dados";
import { Alerta } from "@/components/alerta";
import { BotaoEnviar } from "@/components/botao-enviar";

type Props = {
  itens: ItemMarcavel[];
  marcados: number[];
  textoAntigo: string | null;
  action: (estado: EstadoItensCargaFicha, formData: FormData) => Promise<EstadoItensCargaFicha>;
};

/** Ordem das categorias igual à do checklist. */
const ORDEM = ["Talheres de serviço", "Churrasco", "Limpeza", "Temperos", "Louças e servir", "Bebidas", "Equipamentos", "Descartáveis", "Equipe"];

/**
 * Itens de carga da ficha técnica (checklist de carregamento, C19/C20): lista para marcar, com o texto
 * antigo de "apresentação / utensílio" ao lado só como referência.
 */
export function ItensCargaFicha({ itens, marcados, textoAntigo, action }: Props) {
  const [estado, formAction] = useActionState(action, { status: "inicial" });
  const grupos = ORDEM.map((categoria) => ({ categoria, itens: itens.filter((i) => i.categoria === categoria) }))
    .concat([{ categoria: "Outros", itens: itens.filter((i) => !ORDEM.includes(i.categoria)) }])
    .filter((g) => g.itens.length > 0);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {grupos.length === 0 && (
            <p className="text-sm text-texto-suave">Nenhum item de carga cadastrado para marcar.</p>
          )}
          {grupos.map((g) => (
            <fieldset key={g.categoria} className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-texto">{g.categoria}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {g.itens.map((i) => (
                  <label
                    key={i.id}
                    className="flex min-h-12 items-center gap-3 rounded-controle border border-borda-controle px-3.5 py-2 text-base hover:border-[#a89c90] has-[:checked]:border-brasa has-[:checked]:bg-brasa/15 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-foco"
                  >
                    <input type="checkbox" name="itemCargaId" value={i.id} defaultChecked={marcados.includes(i.id)} />
                    {i.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <aside className="flex flex-col gap-2 self-start rounded-linha border border-borda p-4">
          <h3 className="text-sm font-medium text-texto">Texto antigo (só referência)</h3>
          <p className="whitespace-pre-line text-sm text-texto-suave">
            {textoAntigo ?? "Esta ficha não tem texto de apresentação / utensílio."}
          </p>
          <p className="text-[13px] leading-[1.4] text-texto-suave">
            Vem dos antigos &quot;Requisitos de Logística&quot;. Não muda o checklist: só o que estiver marcado ao lado entra.
          </p>
        </aside>
      </div>

      {estado.status === "erro" && <Alerta tipo="perigo">{estado.mensagem}</Alerta>}
      {estado.status === "salvo" && <Alerta tipo="sucesso">{estado.mensagem}</Alerta>}
      <BotaoEnviar rotulo="Salvar itens de carga" className="self-start" />
    </form>
  );
}
