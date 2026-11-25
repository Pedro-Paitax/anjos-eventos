"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { atualizarInsumo, criarInsumo, listarInsumos, obterInsumo, type DadosInsumo } from "@/lib/insumos";
import { acharInsumosParecidos, type InsumoNome } from "@/lib/insumos-parecidos";
import { atualizarOrigemInsumo } from "@/lib/precos-insumo";
import { CANAIS_COMPRA, ehUm } from "@/lib/precos-opcoes";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { valoresEnviados, type ValoresFormulario } from "@/lib/formulario-valores";
import { validarEmbalagem } from "@/lib/embalagem-compra";
import { gravarEmbalagemCompra } from "@/lib/embalagem-insumo";
import { UNIDADES_INSUMO, type UnidadeInsumo } from "@/lib/preparos-opcoes";

export type EstadoFormularioInsumo = {
  erro?: string;
  valores?: ValoresFormulario;
  /** Insumos de nome parecido: o formulário avisa e só cadastra com a confirmação do usuário. */
  parecidos?: InsumoNome[];
};

function extrairDadosInsumo(formData: FormData): DadosInsumo | { erro: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const udm = String(formData.get("udm") ?? "");
  const preco = Number(formData.get("preco"));
  const fatorCorrecao = Number(formData.get("fatorCorrecao"));

  if (
    !nome ||
    !UNIDADES_INSUMO.includes(udm as UnidadeInsumo) ||
    !(preco >= 0) ||
    !(fatorCorrecao > 0)
  ) {
    return {
      erro: "Preencha nome, unidade, preço e fator de correção (maior que zero).",
    };
  }

  return { nome, udm: udm as UnidadeInsumo, preco, fatorCorrecao };
}

export async function atualizarInsumoAction(
  id: number,
  _estadoAnterior: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDadosInsumo(formData);
  if ("erro" in dados) return { ...dados, valores: valoresEnviados(formData) };

  // Embalagem de compra (migração 0015): os campos só vêm no formulário quando a coluna existe.
  const temEmbalagem = formData.has("embalagemNome");
  const embalagem = validarEmbalagem(
    String(formData.get("embalagemNome") ?? ""),
    String(formData.get("embalagemQtd") ?? ""),
  );
  if (temEmbalagem && "erro" in embalagem) return { erro: embalagem.erro, valores: valoresEnviados(formData) };

  // Campos da migração 0011: só vêm no formulário quando o histórico de preços está ativo no banco.
  const temOrigem = formData.has("canal");
  const fornecedorBruto = String(formData.get("fornecedorPrincipalId") ?? "");
  const fornecedorPrincipalId = fornecedorBruto === "" ? null : Number(fornecedorBruto);
  const canalBruto = formData.get("canal");
  const canal = ehUm(CANAIS_COMPRA, canalBruto) ? canalBruto : null;
  if (temOrigem && fornecedorPrincipalId !== null && !Number.isInteger(fornecedorPrincipalId)) {
    return { erro: "Fornecedor principal inválido.", valores: valoresEnviados(formData) };
  }

  try {
    const anterior = temOrigem ? await obterInsumo(id) : null;
    await atualizarInsumo(id, dados);
    if (temEmbalagem && "embalagem" in embalagem) await gravarEmbalagemCompra(id, embalagem.embalagem);
    if (temOrigem) {
      // Preço digitado aqui = fonte "manual", atualizado agora. Comparação em centavos (numeric(10,4) vs. campo de 2 casas).
      const precoMudou = Math.round((anterior?.preco ?? -1) * 100) !== Math.round(dados.preco * 100);
      await atualizarOrigemInsumo(id, { fornecedorPrincipalId, canal }, precoMudou);
    }
  } catch (erro) {
    return {
      erro: `Falha ao salvar insumo: ${(erro as Error).message}`,
      valores: valoresEnviados(formData),
    };
  }

  revalidatePath("/insumos");
  redirect("/insumos");
}

/**
 * Cadastro de insumo novo (tela /insumos/novo): mesmos campos e validações da edição. Antes de gravar
 * avisa se já existe insumo de nome parecido; nome igual (ignorando caixa e acento) é bloqueado.
 */
export async function criarInsumoAction(
  _estadoAnterior: EstadoFormularioInsumo,
  formData: FormData
): Promise<EstadoFormularioInsumo> {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const dados = extrairDadosInsumo(formData);
  if ("erro" in dados) return { ...dados, valores: valoresEnviados(formData) };

  const temEmbalagem = formData.has("embalagemNome");
  const embalagem = validarEmbalagem(
    String(formData.get("embalagemNome") ?? ""),
    String(formData.get("embalagemQtd") ?? ""),
  );
  if (temEmbalagem && "erro" in embalagem) return { erro: embalagem.erro, valores: valoresEnviados(formData) };

  const temOrigem = formData.has("canal");
  const fornecedorBruto = String(formData.get("fornecedorPrincipalId") ?? "");
  const fornecedorPrincipalId = fornecedorBruto === "" ? null : Number(fornecedorBruto);
  const canalBruto = formData.get("canal");
  const canal = ehUm(CANAIS_COMPRA, canalBruto) ? canalBruto : null;
  if (temOrigem && fornecedorPrincipalId !== null && !Number.isInteger(fornecedorPrincipalId)) {
    return { erro: "Fornecedor principal inválido.", valores: valoresEnviados(formData) };
  }

  let criadoId: number | null = null;
  try {
    const { iguais, parecidos } = acharInsumosParecidos(dados.nome, await listarInsumos());
    if (iguais.length > 0) {
      return {
        erro: `Já existe o insumo "${iguais[0].nome}". Edite o existente em vez de cadastrar outro.`,
        valores: valoresEnviados(formData),
      };
    }
    if (parecidos.length > 0 && formData.get("confirmarParecido") !== "1") {
      return { parecidos, valores: valoresEnviados(formData) };
    }

    const criado = await criarInsumo(dados);
    criadoId = criado.id;
    if (temEmbalagem && "embalagem" in embalagem && embalagem.embalagem) {
      await gravarEmbalagemCompra(criado.id, embalagem.embalagem);
    }
    // Preço digitado aqui = fonte "manual", de hoje (como na edição).
    if (temOrigem) await atualizarOrigemInsumo(criado.id, { fornecedorPrincipalId, canal }, true);
  } catch (erro) {
    // 23505 = nome único (corrida entre duas pessoas cadastrando o mesmo nome).
    const mensagem =
      criadoId !== null
        ? `O insumo foi cadastrado, mas não foi possível gravar embalagem, fornecedor ou canal (${(erro as Error).message}). Abra-o na lista de insumos para completar.`
        : (erro as { code?: string })?.code === "23505"
          ? "Já existe um insumo com esse nome."
          : `Falha ao cadastrar insumo: ${(erro as Error).message}`;
    return { erro: mensagem, valores: valoresEnviados(formData) };
  }

  revalidatePath("/insumos");
  redirect("/insumos");
}
