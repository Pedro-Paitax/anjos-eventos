"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { salvarDecisoes, definirEquipeEvento, obterDecisoes } from "@/lib/decisoes-operacionais";
import { valoresEnviados, type ValoresFormulario } from "@/lib/formulario-valores";
import { valorValido, ROTULOS_CAMPO, type CampoOpcao } from "@/lib/decisoes-operacionais-opcoes";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EstadoFormularioDecisoes = {
  erro?: string;
  salvo?: boolean;
  /** Valores enviados, devolvidos em erro para o formulário não zerar. */
  valores?: ValoresFormulario;
  equipeIds?: number[];
};

function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = String(formData.get(campo) ?? "").trim();
  return valor || null;
}

export async function salvarDecisoesOperacionaisAction(
  eventoId: number,
  _estadoAnterior: EstadoFormularioDecisoes,
  formData: FormData
): Promise<EstadoFormularioDecisoes> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const colaboradorIds = formData.getAll("colaboradorIds").map(Number);
  const devolver = (erro: string): EstadoFormularioDecisoes => ({
    erro,
    valores: valoresEnviados(formData),
    equipeIds: colaboradorIds.filter((id) => Number.isInteger(id) && id > 0),
  });
  if (!colaboradorIds.every((id) => Number.isInteger(id) && id > 0)) {
    return devolver("Equipe inválida.");
  }

  const veiculo = textoOuNull(formData, "veiculo");
  const modeloPrato = textoOuNull(formData, "modeloPrato");
  const tipoBebidaRecipiente = textoOuNull(formData, "tipoBebidaRecipiente");
  const tipoTalher = textoOuNull(formData, "tipoTalher");

  // Valor vazio é aceito (pendência). Valor fora da lista só passa se for
  // exatamente o que já está gravado (legado mantido pelo formulário).
  const atuais = await obterDecisoes(eventoId);
  const enviados: Record<CampoOpcao, string | null> = {
    veiculo, modeloPrato, tipoBebidaRecipiente, tipoTalher,
  };
  const gravados: Record<CampoOpcao, string | null | undefined> = {
    veiculo: atuais?.veiculo,
    modeloPrato: atuais?.modelo_prato,
    tipoBebidaRecipiente: atuais?.tipo_bebida_recipiente,
    tipoTalher: atuais?.tipo_talher,
  };
  for (const campo of Object.keys(enviados) as CampoOpcao[]) {
    const valor = enviados[campo];
    if (valor && !valorValido(campo, valor) && valor !== gravados[campo]) {
      return devolver(`Valor inválido para ${ROTULOS_CAMPO[campo]}.`);
    }
  }

  try {
    await definirEquipeEvento(eventoId, colaboradorIds);
    await salvarDecisoes(eventoId, {
      veiculo,
      modeloPrato,
      sousplat: formData.get("sousplat") === "on",
      tipoBebidaRecipiente,
      tacaFurtaCor: formData.get("tacaFurtaCor") === "on",
      tacaChampanhe: formData.get("tacaChampanhe") === "on",
      tipoTalher,
    });
  } catch (erro) {
    return devolver(`Falha ao salvar decisões: ${(erro as Error).message}`);
  }

  revalidatePath(`/agenda/${eventoId}`);
  revalidatePath("/");
  return { salvo: true };
}
