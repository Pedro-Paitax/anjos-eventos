"use client";

import { useActionState } from "react";
import type { InsumoResumo } from "@/lib/insumos";
import { UNIDADES_INSUMO } from "@/lib/preparos-opcoes";
import { secaoTituloClasse } from "@/components/formulario-evento";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import type { EstadoFormularioInsumo } from "@/app/actions/insumo";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";
import type { FornecedorOpcao } from "@/lib/precos-insumo";
import { CANAIS_COMPRA, ROTULOS_CANAL, type EstadoPreco } from "@/lib/precos-opcoes";
import { ChipDesatualizado } from "@/components/precos/visual";

/** Origem do preço (migração 0011). Ausente = histórico de preços ainda não ativo no banco. */
export type OrigemFormularioInsumo = {
  fornecedores: FornecedorOpcao[];
  fornecedorPrincipalId: number | null;
  canal: string | null;
  /** Texto pronto, ex.: "Manual · atualizado em 02/11/2026 (hoje)". */
  resumoFonte: string;
  estado: EstadoPreco;
};

type FormularioInsumoProps = {
  valoresIniciais: InsumoResumo;
  action: (
    estadoAnterior: EstadoFormularioInsumo,
    formData: FormData
  ) => Promise<EstadoFormularioInsumo>;
  rotuloEnvio: string;
  origem?: OrigemFormularioInsumo;
};

export function FormularioInsumo({
  valoresIniciais,
  action,
  rotuloEnvio,
  origem,
}: FormularioInsumoProps) {
  const [estado, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <h3 className={secaoTituloClasse}>Dados do insumo</h3>

      <Campo rotulo="Nome">
        {(p) => (
          <input {...p}
            name="nome"
            defaultValue={estado.valores?.nome ?? valoresIniciais.nome}
            required
          />
        )}
      </Campo>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Campo rotulo="Unidade">
          {(p) => (
            <Seletor {...p}
              name="udm"
              defaultValue={estado.valores?.udm ?? valoresIniciais.udm}
              opcoes={UNIDADES_INSUMO.map((u) => ({ valor: u, rotulo: u }))}
            />
          )}
        </Campo>
        <Campo rotulo="Preço (R$)">
          {(p) => (
            <input {...p}
              name="preco"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={estado.valores?.preco ?? valoresIniciais.preco ?? ""}
            />
          )}
        </Campo>
        <Campo rotulo="Fator de correção">
          {(p) => (
            <input {...p}
              name="fatorCorrecao"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={estado.valores?.fatorCorrecao ?? valoresIniciais.fatorCorrecao ?? ""}
            />
          )}
        </Campo>
      </div>

      {origem && (
        <>
          <p className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-texto-suave">
            {origem.estado === "desatualizado" && <ChipDesatualizado />}
            <span>
              <span className="font-medium">Fonte do preço:</span> {origem.resumoFonte}
            </span>
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Campo rotulo="Fornecedor principal" ajuda="De quem vocês costumam comprar este insumo.">
              {(p) => (
                <Seletor {...p}
                  name="fornecedorPrincipalId"
                  defaultValue={
                    estado.valores?.fornecedorPrincipalId ?? String(origem.fornecedorPrincipalId ?? "")
                  }
                  opcoes={[
                    { valor: "", rotulo: "Nenhum" },
                    ...origem.fornecedores
                      .filter((f) => f.ativo || f.id === origem.fornecedorPrincipalId)
                      .map((f) => ({ valor: String(f.id), rotulo: f.ativo ? f.nome : `${f.nome} (inativo)` })),
                  ]}
                />
              )}
            </Campo>
            <Campo rotulo="Canal de compra">
              {(p) => (
                <Seletor {...p}
                  name="canal"
                  defaultValue={estado.valores?.canal ?? origem.canal ?? ""}
                  opcoes={[
                    { valor: "", rotulo: "Não informado" },
                    ...CANAIS_COMPRA.map((c) => ({ valor: c, rotulo: ROTULOS_CANAL[c] })),
                  ]}
                />
              )}
            </Campo>
          </div>
        </>
      )}

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}

      <BotaoEnviar rotulo={rotuloEnvio} className="w-full sm:w-auto sm:self-start" />
    </form>
  );
}
