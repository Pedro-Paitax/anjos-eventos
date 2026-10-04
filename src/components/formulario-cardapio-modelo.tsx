"use client";

import { useActionState } from "react";
import type { CardapioModeloDetalhado } from "@/lib/cardapios-modelo";
import type { CategoriaCardapio, Preparo } from "@/lib/cardapio";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { SeletorPreparos } from "@/components/seletor-preparos";
import type { EstadoFormularioCardapioModelo } from "@/app/actions/cardapio-modelo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

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
  const [estado, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do cardápio</h3>

        <Campo rotulo="Nome">
          {(p) => (
            <input {...p}
              name="nome"
              type="text"
              required
              defaultValue={valoresIniciais?.nome}
            />
          )}
        </Campo>

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

      {estado?.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
