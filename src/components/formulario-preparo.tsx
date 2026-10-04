"use client";

import { useActionState, useMemo, useState } from "react";
import type { PreparoDetalhado } from "@/lib/preparos";
import type { Insumo } from "@/lib/insumos";
import {
  CATEGORIAS_PREPARO,
  RESTRICOES_PREPARO,
  SUBCATEGORIAS_PROTEINA,
  UNIDADES_RENDIMENTO_PREPARO,
} from "@/lib/preparos-opcoes";
import { campoClasse, rotuloClasse, secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { ComposicaoPreparo } from "@/components/composicao-preparo";
import {
  EditorPassosPreparo,
  linhasIniciaisDePassos,
  linhasParaPassos,
} from "@/components/editor-passos-preparo";
import type { EstadoFormularioPreparo } from "@/app/actions/preparo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";

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
  const [estado, formAction] = useActionState(action, {});
  const [categoria, setCategoria] = useState(
    valoresIniciais?.categoria ?? CATEGORIAS_PREPARO[0]
  );
  const [unidadeRendimento, setUnidadeRendimento] = useState(
    valoresIniciais?.unidadeRendimento ?? UNIDADES_RENDIMENTO_PREPARO[0]
  );
  const [linhasPassos, setLinhasPassos] = useState(() =>
    linhasIniciaisDePassos(valoresIniciais?.passos ?? [])
  );
  const passosParaEnvio = useMemo(() => linhasParaPassos(linhasPassos), [linhasPassos]);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-5">
        <h3 className={secaoTituloClasse}>Dados do preparo</h3>

        <Campo rotulo="Nome Do Preparo">
          {(p) => (
            <input {...p}
              name="nome"
              type="text"
              required
              defaultValue={valoresIniciais?.nome}
            />
          )}
        </Campo>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Categoria">
            {(p) => (
              <select {...p}
                name="categoria"
                required
                value={categoria ?? ""}
                onChange={(e) => setCategoria(e.target.value)}
              >
                {CATEGORIAS_PREPARO.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Campo>

          {categoria === "Carnes" && (
            <Campo rotulo="Subcategoria da proteína">
              {(p) => (
                <select {...p}
                  name="subcategoriaProteina"
                  defaultValue={valoresIniciais?.subcategoriaProteina ?? ""}
                >
                  <option value="">Não definida</option>
                  {SUBCATEGORIAS_PROTEINA.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo rotulo="Rendimento">
            {(p) => (
              <input {...p}
                name="rendimento"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={valoresIniciais?.rendimento ?? ""}
              />
            )}
          </Campo>
          <Campo rotulo="Unidade do rendimento">
            {(p) => (
              <select {...p}
                name="unidadeRendimento"
                required
                value={unidadeRendimento}
                onChange={(e) => setUnidadeRendimento(e.target.value)}
              >
                {UNIDADES_RENDIMENTO_PREPARO.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            )}
          </Campo>
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
            <p className="text-sm text-texto-suave">
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

        <input type="hidden" name="passos" value={JSON.stringify(passosParaEnvio)} />
        <EditorPassosPreparo linhas={linhasPassos} onMudar={setLinhasPassos} />

        <div className="flex flex-col gap-1.5">
          <p className={rotuloClasse}>Tags (restrições)</p>
          <div className="flex flex-wrap gap-4">
            {RESTRICOES_PREPARO.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-texto">
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
          <Campo rotulo="Tempo de preparo (min)">
            {(p) => (
              <input {...p}
                name="tempoPreparoMinutos"
                type="number"
                min="0"
                defaultValue={valoresIniciais?.tempoPreparoMinutos ?? ""}
              />
            )}
          </Campo>
          <Campo rotulo="Peso de atratividade">
            {(p) => (
              <input {...p}
                name="pesoAtratividade"
                type="number"
                step="0.01"
                min="0"
                defaultValue={valoresIniciais?.pesoAtratividade ?? ""}
              />
            )}
          </Campo>
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
              aria-describedby="porcaoMaximaIndividualAjuda"
            />
            <p id="porcaoMaximaIndividualAjuda" className="text-xs text-texto-suave">
              Sempre em gramas (ou ml) por pessoa, na mesma unidade da macro
              — nunca em número de unidades. Ex.: 2 fatias de 10 g = 20.
            </p>
          </div>
        </div>
      </section>

      <ComposicaoPreparo
        insumosIniciais={insumosDisponiveis}
        composicaoInicial={valoresIniciais?.composicao ?? []}
      />

      {estado?.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
