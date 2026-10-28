/**
 * Importação/exportação CSV de leads. Funções puras.
 *
 * Aceita "," ou ";" (o Excel em pt-BR salva com ";"), aspas duplas e quebras
 * de linha dentro de aspas. Cabeçalho obrigatório, com os nomes de
 * CAMPOS_CSV (ordem livre, colunas desconhecidas são ignoradas e listadas).
 *
 * Colunas fonte_*: opcionais; viram uma evidência ligada ao lead. A evidência
 * só entra como "verificado" se fonte_verificada = sim.
 */
import { CAMPOS_TEXTO_LEAD, validarDadosLead, type DadosLead } from "@/lib/prospeccao-dados";
import {
  extrairDominio,
  encontrarDuplicatas,
  type CorrespondenciaDuplicata,
  type IdentidadeLead,
} from "@/lib/prospeccao-normalizacao";

export const CAMPOS_FONTE = [
  "fonte_nome",
  "fonte_url",
  "fonte_consultada_em",
  "fonte_fato",
  "fonte_verificada",
] as const;

export const CAMPOS_CSV = [...CAMPOS_TEXTO_LEAD, ...CAMPOS_FONTE] as const;

export const LIMITE_LINHAS_CSV = 500;

export function detectarDelimitador(primeiraLinha: string): "," | ";" {
  const virgulas = (primeiraLinha.match(/,/g) ?? []).length;
  const pontoVirgulas = (primeiraLinha.match(/;/g) ?? []).length;
  return pontoVirgulas > virgulas ? ";" : ",";
}

/** Parser CSV (RFC 4180 com delimitador variável). Linhas totalmente vazias são descartadas. */
export function parseCsv(textoBruto: string): string[][] {
  const texto = textoBruto.replace(/^﻿/, "");
  const delim = detectarDelimitador(texto.split(/\r?\n/, 1)[0] ?? "");
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let emAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (emAspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        emAspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      emAspas = true;
    } else if (c === delim) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim() !== ""));
}

export type FonteImportada = {
  fonte: string;
  url: string | null;
  consultadoEm: string;
  fato: string;
  verificado: boolean;
};

export type LinhaImportacao = {
  /** Número da linha no arquivo (cabeçalho = 1). */
  linha: number;
  nome: string;
  dados: DadosLead | null;
  fonte: FonteImportada | null;
  erros: string[];
  duplicatas: CorrespondenciaDuplicata[];
  /** Nº da linha anterior do próprio arquivo com o mesmo identificador forte. */
  duplicadaNoArquivo: number | null;
};

export type ResultadoAnaliseCsv = {
  erroGeral: string | null;
  colunasIgnoradas: string[];
  linhas: LinhaImportacao[];
};

function interpretarFonte(campos: Record<string, string>): { fonte: FonteImportada | null; erros: string[] } {
  const v = (k: string) => campos[k]?.trim() ?? "";
  const algum = CAMPOS_FONTE.some((k) => v(k) !== "");
  if (!algum) return { fonte: null, erros: [] };
  const erros: string[] = [];
  if (!v("fonte_nome") && !v("fonte_url")) erros.push("fonte sem nome nem URL");
  if (!v("fonte_fato")) erros.push("fonte sem o fato que ela sustenta (fonte_fato)");
  const data = v("fonte_consultada_em");
  const dataIso = /^\d{4}-\d{2}-\d{2}$/.test(data)
    ? data
    : /^\d{2}\/\d{2}\/\d{4}$/.test(data)
      ? `${data.slice(6)}-${data.slice(3, 5)}-${data.slice(0, 2)}`
      : null;
  if (!dataIso || Number.isNaN(Date.parse(dataIso))) {
    erros.push("fonte_consultada_em inválida (use AAAA-MM-DD ou DD/MM/AAAA)");
  }
  if (erros.length > 0) return { fonte: null, erros };
  return {
    fonte: {
      fonte: v("fonte_nome") || v("fonte_url"),
      url: v("fonte_url") || null,
      consultadoEm: dataIso!,
      fato: v("fonte_fato"),
      verificado: /^(sim|s|true|1|verificado)$/i.test(v("fonte_verificada")),
    },
    erros: [],
  };
}

/** Valida o CSV e marca duplicatas contra o banco (`existentes`) e dentro do próprio arquivo. */
export function analisarCsv(texto: string, existentes: IdentidadeLead[]): ResultadoAnaliseCsv {
  const tabela = parseCsv(texto);
  if (tabela.length < 2) return { erroGeral: "Arquivo vazio ou só com cabeçalho.", colunasIgnoradas: [], linhas: [] };
  if (tabela.length - 1 > LIMITE_LINHAS_CSV) {
    return { erroGeral: `Máximo de ${LIMITE_LINHAS_CSV} linhas por importação.`, colunasIgnoradas: [], linhas: [] };
  }
  const cabecalho = tabela[0].map((c) => c.trim().toLowerCase());
  if (!cabecalho.includes("nome_comercial") || !cabecalho.includes("categoria")) {
    return {
      erroGeral: "Cabeçalho precisa ter ao menos as colunas nome_comercial e categoria.",
      colunasIgnoradas: [],
      linhas: [],
    };
  }
  const colunasIgnoradas = cabecalho.filter((c) => c && !(CAMPOS_CSV as readonly string[]).includes(c));

  const jaVistos: (IdentidadeLead & { linha: number })[] = [];
  const linhas = tabela.slice(1).map((valores, i): LinhaImportacao => {
    const numero = i + 2;
    const campos: Record<string, string> = {};
    cabecalho.forEach((c, j) => {
      campos[c] = valores[j] ?? "";
    });
    const resultado = validarDadosLead(campos);
    const { fonte, erros: errosFonte } = interpretarFonte(campos);
    const nome = campos.nome_comercial?.trim() || `(linha ${numero})`;

    if ("erros" in resultado) {
      return { linha: numero, nome, dados: null, fonte: null, erros: [...resultado.erros, ...errosFonte], duplicatas: [], duplicadaNoArquivo: null };
    }
    const identidade: IdentidadeLead = { ...resultado.dados };
    const duplicatas = encontrarDuplicatas(identidade, existentes);
    const repetida = jaVistos.find((v) => encontrarDuplicatas(identidade, [v])[0]?.nivel === "forte");
    jaVistos.push({ ...identidade, linha: numero });
    return {
      linha: numero,
      nome,
      dados: resultado.dados,
      fonte,
      erros: errosFonte,
      duplicatas,
      duplicadaNoArquivo: repetida?.linha ?? null,
    };
  });

  return { erroGeral: null, colunasIgnoradas, linhas };
}

/**
 * Decide se a linha entra. Erro → não. Duplicata forte (banco ou arquivo) → não.
 * Duplicata possível → só se o usuário marcou a linha em `forcar`.
 */
export function linhaImportavel(l: LinhaImportacao, forcar: Set<number>): boolean {
  if (!l.dados || l.erros.length > 0) return false;
  if (l.duplicadaNoArquivo !== null) return false;
  if (l.duplicatas.some((d) => d.nivel === "forte")) return false;
  if (l.duplicatas.length > 0) return forcar.has(l.linha);
  return true;
}

/** Tipo da evidência importada pela URL: domínio do próprio lead = site oficial. */
export function tipoEvidenciaPorUrl(
  url: string | null,
  dominioLead: string | null,
): "site_oficial" | "rede_social" | "outro" {
  if (!url) return "outro";
  if (/(^|\.|\/\/)(instagram|facebook|fb|tiktok|linkedin|youtube)\.com\//i.test(url)) return "rede_social";
  return dominioLead && extrairDominio(url) === dominioLead ? "site_oficial" : "outro";
}

function escaparCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV com ";" e BOM (abre direto no Excel em pt-BR). */
export function gerarCsv(cabecalho: string[], linhas: unknown[][]): string {
  return "﻿" + [cabecalho, ...linhas].map((l) => l.map(escaparCsv).join(";")).join("\r\n") + "\r\n";
}
