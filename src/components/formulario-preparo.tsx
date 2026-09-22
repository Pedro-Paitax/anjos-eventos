"use client";

import { useActionState, useState } from "react";
import type { PreparoDetalhado } from "@/lib/preparos";
import type { Insumo } from "@/lib/insumos";
import {
  CATEGORIAS_PREPARO,
  RESTRICOES_PREPARO,
  SUBCATEGORIAS_PROTEINA,
  UNIDADES_RENDIMENTO_PREPARO,
} from "@/lib/preparos-opcoes";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { ComposicaoPreparo } from "@/components/composicao-preparo";
import type { EstadoFormularioPreparo } from "@/app/actions/preparo";

type FormularioPreparoProps = {
  valoresIniciais?: PreparoDetalhado;
  insumosDisponiveis: Insumo[];
  action: (
    estadoAnterior: EstadoFormularioPreparo,
    formData: FormData
  ) => Promise<EstadoFormularioPreparo>;
  rotuloEnvio: string;
};

export function FormularioPreparo({
  valoresIniciais,
  insumosDisponiveis,
  action,
  rotuloEnvio,
}: FormularioPreparoProps) {
  const [estado, formAction, pendente] = useActionState(action, {});
  const [categoria, setCategoria] = useState(
    valoresIniciais?.categoria ?? CATEGORIAS_PREPARO[0]
  );
  const [unidadeRendimento, setUnidadeRendimento] = useState(
    valoresIniciais?.unidadeRendimento ?? UNIDADES_RENDIMENTO_PREPARO[0]
  );

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do preparo</h3>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className={rotuloClasse}>
            Nome Do Preparo
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

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoria" className={rotuloClasse}>
              Categoria
            </label>
            <select
              id="categoria"
              name="categoria"
              required
              value={categoria ?? ""}
              onChange={(e) => setCategoria(e.target.value)}
              className={campoClasse}
            >
              {CATEGORIAS_PREPARO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {categoria === "Carnes" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subcategoriaProteina" className={rotuloClasse}>
                Subcategoria da proteína
              </label>
              <select
                id="subcategoriaProteina"
                name="subcategoriaProteina"
                defaultValue={valoresIniciais?.subcategoriaProteina ?? ""}
                className={campoClasse}
              >
                <option value="">Não definida</option>
                {SUBCATEGORIAS_PROTEINA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rendimento" className={rotuloClasse}>
              Rendimento
            </label>
            <input
              id="rendimento"
              name="rendimento"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={valoresIniciais?.rendimento ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="unidadeRendimento" className={rotuloClasse}>
              Unidade do rendimento
            </label>
            <select
              id="unidadeRendimento"
              name="unidadeRendimento"
              required
              value={unidadeRendimento}
              onChange={(e) => setUnidadeRendimento(e.target.value)}
              className={campoClasse}
            >
              {UNIDADES_RENDIMENTO_PREPARO.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {unidadeRendimento === "Unidade" && (
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <label htmlFor="pesoMedioUnidadeG" className={rotuloClasse}>
              Peso médio por unidade (g)
            </label>
            <input
              id="pesoMedioUnidadeG"
              name="pesoMedioUnidadeG"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={valoresIniciais?.pesoMedioUnidadeG ?? ""}
              className={campoClasse}
            />
            <p className="text-sm text-paper-dim">
              Obrigatório pra preparo vendido por Unidade — sem isso o motor
              de custo não sabe converter a porção calculada (em g/ml) em
              contagem de unidades (docs/DECISOES.md).
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="modoPreparo" className={rotuloClasse}>
            Modo de Preparo
          </label>
          <textarea
            id="modoPreparo"
            name="modoPreparo"
            rows={5}
            required
            defaultValue={valoresIniciais?.modoPreparo ?? ""}
            className={campoClasse}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={rotuloClasse}>Tags (restrições)</p>
          <div className="flex flex-wrap gap-4">
            {RESTRICOES_PREPARO.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-paper">
                <input
                  type="checkbox"
                  name="restricoes"
                  value={r}
                  defaultChecked={valoresIniciais?.restricoes.includes(r)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tempoPreparoMinutos" className={rotuloClasse}>
              Tempo de preparo (min)
            </label>
            <input
              id="tempoPreparoMinutos"
              name="tempoPreparoMinutos"
              type="number"
              min="0"
              defaultValue={valoresIniciais?.tempoPreparoMinutos ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pesoAtratividade" className={rotuloClasse}>
              Peso de atratividade
            </label>
            <input
              id="pesoAtratividade"
              name="pesoAtratividade"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valoresIniciais?.pesoAtratividade ?? ""}
              className={campoClasse}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="porcaoMaximaIndividual" className={rotuloClasse}>
              Porção máxima individual
            </label>
            <input
              id="porcaoMaximaIndividual"
              name="porcaoMaximaIndividual"
              type="number"
              step="0.01"
              min="0"
              defaultValue={valoresIniciais?.porcaoMaximaIndividual ?? ""}
              className={campoClasse}
            />
          </div>
        </div>
      </section>

      <ComposicaoPreparo
        insumosIniciais={insumosDisponiveis}
        composicaoInicial={valoresIniciais?.composicao ?? []}
      />

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
