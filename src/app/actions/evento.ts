"use server";

import { redirect } from "next/navigation";
import {
  criarEvento,
  atualizarEvento,
  type DadosEvento,
  type StatusEvento,
  type Veiculo,
} from "@/lib/eventos";

function paraTexto(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : texto;
}

function paraNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim();
  return texto === "" ? null : Number(texto);
}

function extrairDados(formData: FormData): DadosEvento {
  return {
    empresaId: Number(formData.get("empresaId")),
    cliente: String(formData.get("cliente") ?? "").trim(),
    dataEvento: String(formData.get("dataEvento") ?? ""),
    tipoEvento: paraTexto(formData.get("tipoEvento")),
    numConvidados: paraNumero(formData.get("numConvidados")),
    status: String(formData.get("status")) as StatusEvento,
    valor: paraNumero(formData.get("valor")),
    veiculo: paraTexto(formData.get("veiculo")) as Veiculo | null,
    observacoes: paraTexto(formData.get("observacoes")),
  };
}

export async function criarEventoAction(formData: FormData) {
  const dados = extrairDados(formData);
  if (!dados.cliente || !dados.dataEvento || !dados.empresaId) {
    throw new Error("Preencha empresa, cliente e data do evento.");
  }
  const id = await criarEvento(dados);
  redirect(`/agenda/${id}`);
}

export async function atualizarEventoAction(id: number, formData: FormData) {
  const dados = extrairDados(formData);
  if (!dados.cliente || !dados.dataEvento || !dados.empresaId) {
    throw new Error("Preencha empresa, cliente e data do evento.");
  }
  await atualizarEvento(id, dados);
  redirect(`/agenda/${id}`);
}
