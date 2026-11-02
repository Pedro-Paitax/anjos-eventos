"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { valoresEnviados, type ValoresFormulario } from "@/lib/formulario-valores";
import {
  aplicarPrecoAoInsumo,
  atualizarFornecedor,
  criarFornecedor,
  registrarPreco,
  type DadosFornecedor,
} from "@/lib/precos-insumo";
import { FONTES_REGISTRO_MANUAL, ehUm, hojeNaEquipe } from "@/lib/precos-opcoes";

export type EstadoFormularioPreco = { erro?: string; sucesso?: string; valores?: ValoresFormulario };

const textoOuNulo = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

function extrairFornecedor(formData: FormData): DadosFornecedor | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return { erro: "Informe o nome do fornecedor." };
  const telefoneBruto = textoOuNulo(formData.get("telefone"));
  const telefone = telefoneBruto ? telefoneBruto.replace(/\D/g, "") : null;
  if (telefoneBruto && (!telefone || telefone.length < 10)) {
    return { erro: "Telefone inválido: use DDD e número, ex.: 41 99999-9999." };
  }
  return {
    nome,
    telefone,
    observacoes: textoOuNulo(formData.get("observacoes")),
    // Só o formulário de edição tem a caixa "ativo" (e o campo oculto "editando"); fornecedor novo nasce ativo.
    ativo: formData.has("editando") ? formData.get("ativo") === "on" : true,
  };
}

export async function criarFornecedorAction(
  _estado: EstadoFormularioPreco,
  formData: FormData,
): Promise<EstadoFormularioPreco> {
  if (!(await obterUsuarioAtual())) redirect("/login");
  const dados = extrairFornecedor(formData);
  if ("erro" in dados) return { ...dados, valores: valoresEnviados(formData) };

  const r = await criarFornecedor(dados);
  if ("erro" in r) return { erro: r.erro, valores: valoresEnviados(formData) };

  revalidatePath("/fornecedores");
  return { sucesso: `Fornecedor "${dados.nome}" cadastrado.` };
}

export async function atualizarFornecedorAction(
  id: number,
  _estado: EstadoFormularioPreco,
  formData: FormData,
): Promise<EstadoFormularioPreco> {
  if (!(await obterUsuarioAtual())) redirect("/login");
  const dados = extrairFornecedor(formData);
  if ("erro" in dados) return { ...dados, valores: valoresEnviados(formData) };

  const r = await atualizarFornecedor(id, dados);
  if ("erro" in r) return { erro: r.erro, valores: valoresEnviados(formData) };

  revalidatePath("/fornecedores");
  revalidatePath(`/fornecedores/${id}`);
  return { sucesso: "Fornecedor salvo." };
}

/** "AAAA-MM-DD" válido e não futuro (no fuso da equipe). */
function dataValida(dia: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  return !Number.isNaN(Date.parse(`${dia}T00:00:00Z`)) && dia <= hojeNaEquipe();
}

export async function registrarPrecoAction(
  insumoId: number,
  _estado: EstadoFormularioPreco,
  formData: FormData,
): Promise<EstadoFormularioPreco> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");

  const preco = Number(String(formData.get("preco") ?? "").replace(",", "."));
  const fonte = formData.get("fonte");
  const observadoEm = String(formData.get("observadoEm") ?? "");
  const fornecedorBruto = String(formData.get("fornecedorId") ?? "");
  const fornecedorId = fornecedorBruto === "" ? null : Number(fornecedorBruto);
  const urlFonte = textoOuNulo(formData.get("urlFonte"));

  const erro =
    !(preco > 0)
      ? "Informe o preço pago (maior que zero)."
      : !ehUm(FONTES_REGISTRO_MANUAL, fonte)
        ? "Escolha de onde veio o preço."
        : !dataValida(observadoEm)
          ? "Informe uma data válida, que não seja no futuro."
          : fornecedorId !== null && !Number.isInteger(fornecedorId)
            ? "Fornecedor inválido."
            : urlFonte && !/^https?:\/\//i.test(urlFonte)
              ? "O link precisa começar com http:// ou https://."
              : null;
  if (erro || !ehUm(FONTES_REGISTRO_MANUAL, fonte)) {
    return { erro: erro ?? "Escolha de onde veio o preço.", valores: valoresEnviados(formData) };
  }

  try {
    await registrarPreco(
      {
        insumoId,
        fornecedorId,
        nomeNoFornecedor: textoOuNulo(formData.get("nomeNoFornecedor")),
        preco,
        fonte,
        observadoEm,
        urlFonte,
      },
      usuario.id,
    );
  } catch (e) {
    return { erro: `Falha ao registrar preço: ${(e as Error).message}`, valores: valoresEnviados(formData) };
  }

  revalidatePath(`/insumos/${insumoId}`);
  revalidatePath("/fornecedores");
  return { sucesso: "Preço registrado no histórico." };
}

/**
 * Botão "Usar no cadastro" de uma linha do histórico: preço do insumo = bruto + 10 %.
 * Volta para a página do insumo com o resultado na URL (o formulário de cima remonta com o preço novo).
 */
export async function aplicarPrecoAction(insumoId: number, historicoId: number): Promise<void> {
  if (!(await obterUsuarioAtual())) redirect("/login");
  const r = await aplicarPrecoAoInsumo(insumoId, historicoId);
  revalidatePath("/insumos");
  revalidatePath(`/insumos/${insumoId}`);
  redirect(`/insumos/${insumoId}?${"erro" in r ? "erroPreco=1" : `precoAplicado=${r.preco}`}`);
}
