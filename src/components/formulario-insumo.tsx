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
import { EMBALAGEM_NOME_MAX, type EmbalagemCompra } from "@/lib/embalagem-compra";
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
  /** Embalagem de compra atual (null = sem). `undefined` = migração 0015 pendente: os campos não aparecem. */
  embalagem?: EmbalagemCompra | null;
};

export function FormularioInsumo({
  valoresIniciais,
  action,
  rotuloEnvio,
  origem,
  embalagem,
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

      {embalagem !== undefined && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Embalagem de compra (opcional)</legend>
          <p className="text-sm text-texto-suave">
            Só para a lista de compras: ela passa a mostrar, por exemplo, &quot;12 bandejas (69 unidades)&quot;.
            O custo continua pela unidade do insumo. Deixe os dois campos vazios para comprar pela unidade.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Campo rotulo="Nome da embalagem" ajuda="Ex.: bandeja, pacote, caixa, garrafa.">
              {(p) => (
                <input {...p}
                  name="embalagemNome"
                  maxLength={EMBALAGEM_NOME_MAX}
                  defaultValue={estado.valores?.embalagemNome ?? embalagem?.nome ?? ""}
                />
              )}
            </Campo>
            <Campo rotulo="Quantidade por embalagem" ajuda="Na unidade do insumo (ex.: 6 unidades, 0,5 kg).">
              {(p) => (
                <input {...p}
                  name="embalagemQtd"
                  type="number"
                  step="0.001"
                  min="0"
                  inputMode="decimal"
                  defaultValue={estado.valores?.embalagemQtd ?? embalagem?.quantidade ?? ""}
                />
              )}
            </Campo>
          </div>
        </fieldset>
      )}

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
