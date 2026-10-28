"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { obterUsuarioAtual, type Usuario } from "@/lib/usuario-atual";
import { valoresEnviados, type ValoresFormulario } from "@/lib/formulario-valores";
import { CAMPOS_TEXTO_LEAD, validarDadosLead, type CampoTextoLead } from "@/lib/prospeccao-dados";
import { encontrarDuplicatas, type CorrespondenciaDuplicata } from "@/lib/prospeccao-normalizacao";
import { analisarCsv, linhaImportavel, type LinhaImportacao } from "@/lib/prospeccao-csv";
import { DIMENSOES, calcularQualificacao, validarDimensao, type DimensaoAvaliada } from "@/lib/prospeccao-pontuacao";
import { gerarMensagemModelo, fatosPersonalizaveis, type FatoUsado } from "@/lib/prospeccao-mensagem";
import { canaisDisponiveis } from "@/lib/prospeccao-canais";
import { configuracaoGemini, gerarMensagemGemini } from "@/lib/prospeccao-ia";
import {
  CAMPOS_EVIDENCIA,
  CANAIS,
  CONFIANCAS,
  INTERACOES_REGISTRAVEIS,
  NATUREZAS_EVIDENCIA,
  STATUS_MANUAIS,
  TIPOS_EVIDENCIA,
  VERIFICACOES,
  ehUm,
  type Confianca,
} from "@/lib/prospeccao-opcoes";
import {
  aprovarMensagem,
  alterarStatus,
  alterarVerificacaoEvidencia,
  atualizarLead,
  confirmarEnvio,
  criarEvidencia,
  criarLead,
  criarMensagem,
  definirProximaAcao,
  descartarMensagem,
  editarMensagem,
  identidadesLeads,
  importarLeads,
  listarEvidencias,
  marcarNaoContatar,
  obterLead,
  reativarContato,
  registrarEnvioIniciado,
  registrarInteracao,
  registrarQualificacao,
  type Resultado,
} from "@/lib/prospeccao";

export type EstadoAcao = {
  erro?: string;
  sucesso?: string;
  valores?: ValoresFormulario;
  duplicatas?: CorrespondenciaDuplicata[];
};

async function exigirUsuario(): Promise<Usuario> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login");
  return usuario;
}

const texto = (fd: FormData, campo: string) => {
  const v = String(fd.get(campo) ?? "").trim();
  return v ? v : null;
};

/** "AAAA-MM-DD" válido, ou null. */
const dataIso = (fd: FormData, campo: string) => {
  const v = texto(fd, campo);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
};

function revalidarLead(leadId: number) {
  revalidatePath("/prospeccao");
  revalidatePath(`/prospeccao/${leadId}`);
}

function resultadoParaEstado(r: Resultado, leadId: number, sucesso: string): EstadoAcao {
  if ("erro" in r) return { erro: r.erro };
  revalidarLead(leadId);
  return { sucesso };
}

function camposLead(fd: FormData): Partial<Record<CampoTextoLead, string>> {
  const campos: Partial<Record<CampoTextoLead, string>> = {};
  for (const c of CAMPOS_TEXTO_LEAD) campos[c] = String(fd.get(c) ?? "");
  return campos;
}

function responsavel(fd: FormData): number | null {
  const id = Number(fd.get("responsavel_usuario_id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- Cadastro ----------

export async function criarLeadAction(_e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirUsuario();
  const r = validarDadosLead(camposLead(fd));
  if ("erros" in r) return { erro: `Corrija: ${r.erros.join("; ")}.`, valores: valoresEnviados(fd) };

  const duplicatas = encontrarDuplicatas(r.dados, await identidadesLeads());
  if (duplicatas.length > 0 && fd.get("confirmar_nao_duplicata") !== "on") {
    return {
      erro: "Possível duplicata. Confira os registros abaixo; se for outro estabelecimento, marque a confirmação e salve de novo.",
      duplicatas,
      valores: valoresEnviados(fd),
    };
  }

  let id: number;
  try {
    id = await criarLead(r.dados, responsavel(fd));
  } catch (erro) {
    return { erro: `Falha ao salvar: ${(erro as Error).message}`, valores: valoresEnviados(fd) };
  }
  revalidatePath("/prospeccao");
  redirect(`/prospeccao/${id}`);
}

export async function atualizarLeadAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirUsuario();
  const r = validarDadosLead(camposLead(fd));
  if ("erros" in r) return { erro: `Corrija: ${r.erros.join("; ")}.`, valores: valoresEnviados(fd) };

  const duplicatas = encontrarDuplicatas({ ...r.dados, id: leadId }, await identidadesLeads());
  if (duplicatas.length > 0 && fd.get("confirmar_nao_duplicata") !== "on") {
    return {
      erro: "Com esses dados o lead parece duplicar outro registro. Se não for, marque a confirmação e salve de novo.",
      duplicatas,
      valores: valoresEnviados(fd),
    };
  }

  try {
    await atualizarLead(leadId, r.dados, responsavel(fd));
  } catch (erro) {
    return { erro: `Falha ao salvar: ${(erro as Error).message}`, valores: valoresEnviados(fd) };
  }
  revalidarLead(leadId);
  redirect(`/prospeccao/${leadId}`);
}

// ---------- Status, próxima ação, não contatar ----------

export async function alterarStatusAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirUsuario();
  const status = fd.get("status");
  if (!ehUm(STATUS_MANUAIS, status)) return { erro: "Status inválido." };
  return resultadoParaEstado(await alterarStatus(leadId, status), leadId, "Status atualizado.");
}

export async function proximaAcaoAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirUsuario();
  if (texto(fd, "proxima_acao_em") && !dataIso(fd, "proxima_acao_em")) return { erro: "Data inválida." };
  await definirProximaAcao(leadId, texto(fd, "proxima_acao"), dataIso(fd, "proxima_acao_em"));
  revalidarLead(leadId);
  return { sucesso: "Próxima ação salva." };
}

export async function naoContatarAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const motivo = texto(fd, "motivo");
  if (!motivo) return { erro: "Informe o motivo (ex.: pediu para não receber contato)." };
  await marcarNaoContatar(leadId, motivo, usuario.id);
  revalidarLead(leadId);
  return { sucesso: "Lead bloqueado para novos contatos. Mensagens pendentes foram descartadas." };
}

export async function reativarContatoAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const justificativa = texto(fd, "justificativa");
  if (!justificativa) return { erro: "Explique por que o bloqueio pode ser removido." };
  await reativarContato(leadId, justificativa, usuario.id);
  revalidarLead(leadId);
  return { sucesso: "Bloqueio removido." };
}

// ---------- Evidências ----------

export async function criarEvidenciaAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const fonte = texto(fd, "fonte");
  const fato = texto(fd, "fato");
  const consultadoEm = dataIso(fd, "consultado_em");
  const url = texto(fd, "url");
  const tipo = fd.get("tipo");
  const natureza = fd.get("natureza");
  const confianca = fd.get("confianca");
  const verificacao = fd.get("verificacao");
  const campo = texto(fd, "campo");

  if (!fonte || !fato || !consultadoEm) {
    return { erro: "Fonte, fato e data da consulta são obrigatórios.", valores: valoresEnviados(fd) };
  }
  if (url && !/^https?:\/\/\S+$/i.test(url)) return { erro: "URL deve começar com http(s)://", valores: valoresEnviados(fd) };
  if (
    !ehUm(TIPOS_EVIDENCIA, tipo) ||
    !ehUm(NATUREZAS_EVIDENCIA, natureza) ||
    !ehUm(CONFIANCAS, confianca) ||
    !ehUm(VERIFICACOES, verificacao) ||
    (campo !== null && !ehUm(CAMPOS_EVIDENCIA, campo))
  ) {
    return { erro: "Opção inválida.", valores: valoresEnviados(fd) };
  }
  if (natureza === "inferencia" && verificacao === "verificado") {
    return { erro: "Inferência não pode ser marcada como verificada: registre a fonte que confirma o fato.", valores: valoresEnviados(fd) };
  }

  await criarEvidencia(
    leadId,
    { fonte, url, consultadoEm, tipo, natureza, campo, fato, trecho: texto(fd, "trecho"), confianca, verificacao },
    usuario.id,
  );
  revalidarLead(leadId);
  return { sucesso: "Evidência registrada." };
}

export async function verificacaoEvidenciaAction(
  leadId: number,
  evidenciaId: number,
  _e: EstadoAcao,
  fd: FormData,
): Promise<EstadoAcao> {
  await exigirUsuario();
  const verificacao = fd.get("verificacao");
  if (!ehUm(VERIFICACOES, verificacao)) return { erro: "Opção inválida." };
  const ev = (await listarEvidencias(leadId)).find((e) => e.id === evidenciaId);
  if (!ev) return { erro: "Evidência não encontrada." };
  if (ev.natureza === "inferencia" && verificacao === "verificado") {
    return { erro: "Inferência não pode ser marcada como verificada." };
  }
  await alterarVerificacaoEvidencia(leadId, evidenciaId, verificacao);
  revalidarLead(leadId);
  return { sucesso: "Atualizada." };
}

// ---------- Qualificação ----------

export async function qualificarAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const idsEvidencias = new Set((await listarEvidencias(leadId)).map((e) => e.id));

  const dimensoes: DimensaoAvaliada[] = DIMENSOES.map((d) => {
    const bruto = String(fd.get(`pontos_${d.chave}`) ?? "").trim();
    const confianca = fd.get(`confianca_${d.chave}`);
    return {
      chave: d.chave,
      maximo: d.maximo,
      pontos: bruto === "" ? null : Number(bruto),
      justificativa: String(fd.get(`justificativa_${d.chave}`) ?? "").trim(),
      evidenciaIds: fd
        .getAll(`evidencias_${d.chave}`)
        .map(Number)
        .filter((id) => idsEvidencias.has(id)),
      confianca: ehUm(CONFIANCAS, confianca) ? confianca : ("baixa" as Confianca),
    };
  });

  const erros = DIMENSOES.flatMap((d, i) => {
    const erro = validarDimensao(dimensoes[i]);
    return erro ? [`${d.rotulo}: ${erro}`] : [];
  });
  if (erros.length > 0) return { erro: `Corrija: ${erros.join("; ")}.`, valores: valoresEnviados(fd) };

  const resultado = calcularQualificacao(dimensoes);
  await registrarQualificacao(leadId, dimensoes, resultado, texto(fd, "observacoes"), usuario.id);
  revalidarLead(leadId);
  return { sucesso: `Avaliação registrada: ${resultado.pontuacao} pontos.` };
}

// ---------- Mensagens ----------

export async function gerarMensagemAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const canal = fd.get("canal");
  const objetivo = texto(fd, "objetivo");
  if (!ehUm(CANAIS, canal) || !objetivo) return { erro: "Escolha o canal e descreva o objetivo.", valores: valoresEnviados(fd) };

  const lead = await obterLead(leadId);
  if (!lead) return { erro: "Lead não encontrado." };
  if (lead.naoContatar) return { erro: "Lead marcado como não contatar." };
  if (!canaisDisponiveis(lead).includes(canal)) {
    return { erro: "Este lead não tem contato para esse canal. Pesquise e cadastre o contato antes." };
  }

  let nova: Parameters<typeof criarMensagem>[0];
  if (fd.get("gerador") === "gemini") {
    const config = configuracaoGemini();
    if (!config) return { erro: "IA não configurada no servidor (GEMINI_API_KEY). Gere sem IA.", valores: valoresEnviados(fd) };

    const fatos = fatosPersonalizaveis(await listarEvidencias(leadId));
    const ia = await gerarMensagemGemini(
      {
        canal,
        categoria: lead.categoria,
        nomeLead: lead.nomeComercial,
        segmento: lead.segmento,
        municipio: lead.municipio,
        objetivo,
        fatos: fatos.map((f) => ({ id: f.id, fato: f.fato })),
      },
      usuario.nome,
      config,
    );
    if ("erro" in ia) return { erro: ia.erro, valores: valoresEnviados(fd) };

    nova = {
      leadId,
      canal,
      objetivo,
      assunto: ia.assunto,
      conteudo: ia.conteudo,
      // Cópia dos fatos que a IA declarou usar (o revisor confere no texto).
      fatosUsados: fatos
        .filter((f) => ia.evidenciaIds.includes(f.id))
        .map((f) => ({ evidenciaId: f.id, fato: f.fato, url: f.url })),
      gerador: "gemini",
      modelo: ia.modelo,
      usuarioId: usuario.id,
    };
  } else {
    const gerada = gerarMensagemModelo({
      canal,
      categoria: lead.categoria,
      nomeLead: lead.nomeComercial,
      nomeRemetente: usuario.nome,
    });
    nova = {
      leadId,
      canal,
      objetivo,
      assunto: gerada.assunto,
      conteudo: gerada.conteudo,
      fatosUsados: [],
      gerador: "modelo_local",
      modelo: null,
      usuarioId: usuario.id,
    };
  }

  let resultado: Resultado;
  try {
    resultado = await criarMensagem(nova);
  } catch (erro) {
    // 23514 = CHECK: banco sem a migração 0009 recusa gerador = 'gemini'.
    if ((erro as { code?: string }).code === "23514" && nova.gerador === "gemini") {
      return { erro: "Banco sem a migração 0009: mensagens do Gemini ainda não podem ser gravadas. Gere sem IA." };
    }
    return { erro: `Falha ao salvar a mensagem: ${(erro as Error).message}` };
  }
  return resultadoParaEstado(resultado, leadId, "Nova versão criada. Revise, personalize e aprove.");
}

export async function editarMensagemAction(
  leadId: number,
  mensagemId: number,
  _e: EstadoAcao,
  fd: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const conteudo = texto(fd, "conteudo");
  if (!conteudo) return { erro: "A mensagem não pode ficar vazia." };

  const marcados = new Set(fd.getAll("fatos").map(Number));
  const fatosUsados: FatoUsado[] = fatosPersonalizaveis(await listarEvidencias(leadId))
    .filter((e) => marcados.has(e.id))
    .map((e) => ({ evidenciaId: e.id, fato: e.fato, url: e.url }));

  return resultadoParaEstado(
    await editarMensagem(leadId, mensagemId, conteudo, texto(fd, "assunto"), fatosUsados, usuario.id),
    leadId,
    "Edição salva. A mensagem voltou para revisão.",
  );
}

export async function aprovarMensagemAction(leadId: number, mensagemId: number): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  return resultadoParaEstado(await aprovarMensagem(leadId, mensagemId, usuario.id), leadId, "Aprovada. Ainda não foi enviada.");
}

export async function descartarMensagemAction(leadId: number, mensagemId: number): Promise<EstadoAcao> {
  await exigirUsuario();
  return resultadoParaEstado(await descartarMensagem(leadId, mensagemId), leadId, "Descartada.");
}

/** Chamada ao clicar em "Abrir WhatsApp/Instagram/e-mail". Registra só que o canal foi aberto. */
export async function envioIniciadoAction(leadId: number, mensagemId: number): Promise<void> {
  await exigirUsuario();
  await registrarEnvioIniciado(leadId, mensagemId);
  revalidarLead(leadId);
}

export async function confirmarEnvioAction(
  leadId: number,
  mensagemId: number,
  _e: EstadoAcao,
  fd: FormData,
): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  if (fd.get("confirmo") !== "on") return { erro: "Marque a confirmação de que a mensagem foi enviada." };
  return resultadoParaEstado(await confirmarEnvio(leadId, mensagemId, usuario.id), leadId, "Envio registrado.");
}

// ---------- Resultado do contato ----------

export async function registrarInteracaoAction(leadId: number, _e: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirUsuario();
  const tipo = fd.get("tipo");
  if (!ehUm(INTERACOES_REGISTRAVEIS, tipo)) return { erro: "Tipo inválido.", valores: valoresEnviados(fd) };
  if (texto(fd, "ocorrida_em") && !dataIso(fd, "ocorrida_em")) return { erro: "Data inválida.", valores: valoresEnviados(fd) };
  if (texto(fd, "proxima_acao_em") && !dataIso(fd, "proxima_acao_em")) {
    return { erro: "Data da próxima ação inválida.", valores: valoresEnviados(fd) };
  }
  const ocorrida = dataIso(fd, "ocorrida_em");
  return resultadoParaEstado(
    await registrarInteracao({
      leadId,
      tipo,
      resumo: texto(fd, "resumo"),
      // Meio-dia no fuso de Curitiba: a data não "volta um dia" ao exibir.
      ocorridaEm: ocorrida ? `${ocorrida}T12:00:00-03:00` : null,
      proximaAcao: texto(fd, "proxima_acao"),
      proximaAcaoEm: dataIso(fd, "proxima_acao_em"),
      usuarioId: usuario.id,
    }),
    leadId,
    "Registrado.",
  );
}

// ---------- Importação CSV ----------

export type EstadoImportacao = {
  erro?: string;
  csv?: string;
  colunasIgnoradas?: string[];
  linhas?: Pick<LinhaImportacao, "linha" | "nome" | "erros" | "duplicatas" | "duplicadaNoArquivo">[];
  importaveis?: number;
};

async function lerCsv(fd: FormData): Promise<string | null> {
  const arquivo = fd.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 1_000_000) return null;
    return await arquivo.text();
  }
  return texto(fd, "csv");
}

export async function analisarCsvAction(_e: EstadoImportacao, fd: FormData): Promise<EstadoImportacao> {
  await exigirUsuario();
  const csv = await lerCsv(fd);
  if (!csv) return { erro: "Envie um arquivo .csv (até 1 MB) ou cole o conteúdo." };
  const analise = analisarCsv(csv, await identidadesLeads());
  if (analise.erroGeral) return { erro: analise.erroGeral };
  return {
    csv,
    colunasIgnoradas: analise.colunasIgnoradas,
    linhas: analise.linhas.map(({ linha, nome, erros, duplicatas, duplicadaNoArquivo }) => ({
      linha, nome, erros, duplicatas, duplicadaNoArquivo,
    })),
    importaveis: analise.linhas.filter((l) => linhaImportavel(l, new Set())).length,
  };
}

export async function importarCsvAction(_e: EstadoImportacao, fd: FormData): Promise<EstadoImportacao> {
  const usuario = await exigirUsuario();
  const csv = texto(fd, "csv");
  if (!csv) return { erro: "Analise o arquivo antes de importar." };
  // Reanalisa: a base pode ter mudado entre a prévia e a importação.
  const analise = analisarCsv(csv, await identidadesLeads());
  if (analise.erroGeral) return { erro: analise.erroGeral };
  const forcar = new Set(fd.getAll("forcar").map(Number));
  const linhas = analise.linhas.filter((l) => linhaImportavel(l, forcar));
  if (linhas.length === 0) return { erro: "Nenhuma linha importável." };

  let total: number;
  try {
    total = await importarLeads(linhas.map((l) => ({ dados: l.dados!, fonte: l.fonte })), usuario.id);
  } catch (erro) {
    return { erro: `Falha na importação (nada foi gravado): ${(erro as Error).message}` };
  }
  revalidatePath("/prospeccao");
  redirect(`/prospeccao?importados=${total}`);
}
