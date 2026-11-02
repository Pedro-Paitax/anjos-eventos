"use client";

import { useActionState } from "react";
import { Campo } from "@/components/campo";
import { Seletor } from "@/components/seletor";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alerta } from "@/components/alerta";
import type { EstadoFormularioPreco } from "@/app/actions/precos";
import type { FornecedorOpcao } from "@/lib/precos-insumo";
import { FONTES_REGISTRO_MANUAL, ROTULOS_FONTE } from "@/lib/precos-opcoes";

type Props = {
  action: (estado: EstadoFormularioPreco, formData: FormData) => Promise<EstadoFormularioPreco>;
  fornecedores: FornecedorOpcao[];
  fornecedorPadraoId: number | null;
  unidade: string;
  /** "AAAA-MM-DD" de hoje no fuso da equipe (vem do servidor, evita divergência na hidratação). */
  hoje: string;
};

/** Registra um preço pago/visto no histórico. Não altera o preço cadastrado do insumo. */
export function FormularioRegistroPreco({ action, fornecedores, fornecedorPadraoId, unidade, hoje }: Props) {
  const [estado, formAction] = useActionState(action, {});
  const v = estado.valores;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Campo rotulo={`Preço pago (R$ por ${unidade})`}>
          {(p) => (
            <input {...p}
              name="preco"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              required
              defaultValue={v?.preco ?? ""}
            />
          )}
        </Campo>
        <Campo rotulo="Data">
          {(p) => <input {...p} name="observadoEm" type="date" max={hoje} required defaultValue={v?.observadoEm ?? hoje} />}
        </Campo>
        <Campo rotulo="De onde veio">
          {(p) => (
            <Seletor {...p}
              name="fonte"
              defaultValue={v?.fonte ?? "nota_fiscal"}
              opcoes={FONTES_REGISTRO_MANUAL.map((f) => ({ valor: f, rotulo: ROTULOS_FONTE[f] }))}
            />
          )}
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo rotulo="Fornecedor">
          {(p) => (
            <Seletor {...p}
              name="fornecedorId"
              defaultValue={v?.fornecedorId ?? String(fornecedorPadraoId ?? "")}
              opcoes={[
                { valor: "", rotulo: "Sem fornecedor" },
                ...fornecedores.filter((f) => f.ativo).map((f) => ({ valor: String(f.id), rotulo: f.nome })),
              ]}
            />
          )}
        </Campo>
        <Campo rotulo="Nome no fornecedor (opcional)" ajuda="Como aparece na nota ou na cotação, ex.: Picanha Maturatta.">
          {(p) => <input {...p} name="nomeNoFornecedor" defaultValue={v?.nomeNoFornecedor ?? ""} />}
        </Campo>
      </div>

      <Campo rotulo="Link da fonte (opcional)">
        {(p) => <input {...p} name="urlFonte" type="url" inputMode="url" placeholder="https://" defaultValue={v?.urlFonte ?? ""} />}
      </Campo>

      {estado.erro && <Alerta tipo="perigo">{estado.erro}</Alerta>}
      {estado.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <BotaoEnviar
        rotulo="Registrar preço"
        rotuloEnviando="Registrando…"
        variante="secundario"
        className="w-full sm:w-auto sm:self-start"
      />
    </form>
  );
}
