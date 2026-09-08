"use client";

import { useActionState } from "react";
import type { CardapioModeloDetalhado } from "@/lib/cardapios-modelo";
import type { CategoriaCardapio, Preparo } from "@/lib/cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { SeletorPreparos } from "@/components/seletor-preparos";
import type { EstadoFormularioCardapioModelo } from "@/app/actions/cardapio-modelo";

type FormularioCardapioModeloProps = {
  valoresIniciais?: CardapioModeloDetalhado;
  preparosPorCategoria: Record<CategoriaCardapio, Preparo[]>;
  action: (
    estadoAnterior: EstadoFormularioCardapioModelo,
    formData: FormData
  ) => Promise<EstadoFormularioCardapioModelo>;
  rotuloEnvio: string;
};

export function FormularioCardapioModelo({
  valoresIniciais,
  preparosPorCategoria,
  action,
  rotuloEnvio,
}: FormularioCardapioModeloProps) {
  const [estado, formAction, pendente] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cardápio</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className={rotuloClasse}>
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            defaultValue={valoresIniciais?.nome}
            className={campoClasse}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="descricao" className={rotuloClasse}>
            Descrição
          </label>
          <textarea
            id="descricao"
            name="descricao"
            rows={3}
            defaultValue={valoresIniciais?.descricao ?? ""}
            className={campoClasse}
          />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Itens do cardápio</h3>
        <SeletorPreparos
          preparosPorCategoria={preparosPorCategoria}
          selecaoInicial={valoresIniciais?.itens.map((i) => i.preparoId)}
        />
      </section>

      {estado?.erro && <p className="text-sm text-ember">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="mt-2 inline-flex items-center justify-center self-start rounded-[2px] bg-ember px-6 py-2.5 text-sm font-medium text-paper shadow-[0_10px_20px_-10px_rgba(0,0,0,0.6)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:opacity-50"
      >
        {pendente ? "Salvando…" : rotuloEnvio}
      </button>
    </form>
  );
}
