"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { salvarDecisoes, definirEquipeEvento } from "@/lib/decisoes-operacionais";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

export type EstadoFormularioDecisoes = { erro?: string; salvo?: boolean };

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
  if (!colaboradorIds.every((id) => Number.isInteger(id) && id > 0)) {
    return { erro: "Equipe inválida." };
  }

  try {
    await definirEquipeEvento(eventoId, colaboradorIds);
    await salvarDecisoes(eventoId, {
      veiculo: textoOuNull(formData, "veiculo"),
      modeloPrato: textoOuNull(formData, "modeloPrato"),
      sousplat: formData.get("sousplat") === "on",
      tipoBebidaRecipiente: textoOuNull(formData, "tipoBebidaRecipiente"),
      tacaFurtaCor: formData.get("tacaFurtaCor") === "on",
      tacaChampanhe: formData.get("tacaChampanhe") === "on",
      tipoTalher: textoOuNull(formData, "tipoTalher"),
    });
  } catch (erro) {
    return { erro: `Falha ao salvar decisões: ${(erro as Error).message}` };
  }

  revalidatePath(`/agenda/${eventoId}`);
  revalidatePath("/");
  return { salvo: true };
}
