/**
 * Validação dos dados de um lead (formulário e importação CSV usam a mesma).
 * Função pura: recebe texto bruto por campo e devolve os dados normalizados
 * ou a lista de erros.
 */
import { CATEGORIAS_LEAD, type CategoriaLead } from "@/lib/prospeccao-opcoes";
import {
  normalizarNome,
  normalizarMunicipio,
  normalizarSite,
  normalizarTelefone,
  normalizarInstagram,
  normalizarEmail,
  extrairDominio,
  semAcentos,
} from "@/lib/prospeccao-normalizacao";

export type DadosLead = {
  nomeComercial: string;
  nomeLegal: string | null;
  categoria: CategoriaLead;
  segmento: string | null;
  municipio: string | null;
  endereco: string | null;
  site: string | null;
  instagram: string | null;
  outrosPerfis: string | null;
  telefone: string | null;
  email: string | null;
  responsavelComercial: string | null;
  sinaisDemanda: string | null;
  compatibilidadeParrilla: string | null;
  limitacoes: string | null;
  observacoes: string | null;
  nomeNormalizado: string;
  dominio: string | null;
};

/** Nomes dos campos no formulário e no cabeçalho do CSV. */
export const CAMPOS_TEXTO_LEAD = [
  "nome_comercial",
  "nome_legal",
  "categoria",
  "segmento",
  "municipio",
  "endereco",
  "site",
  "instagram",
  "outros_perfis",
  "telefone",
  "email",
  "responsavel_comercial",
  "sinais_demanda",
  "compatibilidade_parrilla",
  "limitacoes",
  "observacoes",
] as const;

export type CampoTextoLead = (typeof CAMPOS_TEXTO_LEAD)[number];

const SINONIMOS_CATEGORIA: Record<string, CategoriaLead> = {
  cervejaria: "cervejaria",
  cervejarias: "cervejaria",
  brewpub: "cervejaria",
  cervejaria_brewpub: "cervejaria",
  bar_restaurante: "bar_restaurante",
  bar: "bar_restaurante",
  restaurante: "bar_restaurante",
  bar_e_restaurante: "bar_restaurante",
  espaco_eventos: "espaco_eventos",
  espaco_de_eventos: "espaco_eventos",
  salao_de_festas: "espaco_eventos",
  casa_de_festas: "espaco_eventos",
  outro: "outro",
  outros: "outro",
  outro_parceiro: "outro",
};

export function interpretarCategoria(bruto: string): CategoriaLead | null {
  const chave = semAcentos(bruto.trim().toLowerCase()).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if ((CATEGORIAS_LEAD as readonly string[]).includes(chave)) return chave as CategoriaLead;
  return SINONIMOS_CATEGORIA[chave] ?? null;
}

const texto = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : null;
};

export function validarDadosLead(
  campos: Partial<Record<CampoTextoLead, string>>,
): { dados: DadosLead } | { erros: string[] } {
  const erros: string[] = [];
  const nomeComercial = texto(campos.nome_comercial);
  if (!nomeComercial) erros.push("nome comercial é obrigatório");

  const categoria = interpretarCategoria(campos.categoria ?? "");
  if (!categoria) erros.push(`categoria inválida ("${campos.categoria ?? ""}")`);

  const site = normalizarSite(campos.site ?? "");
  if (site === "invalido") erros.push("site inválido");
  const telefone = normalizarTelefone(campos.telefone ?? "");
  if (telefone === "invalido") erros.push("telefone inválido (use DDD + número, ex.: 41 3333-4444)");
  const instagram = normalizarInstagram(campos.instagram ?? "");
  if (instagram === "invalido") erros.push("Instagram inválido (use @perfil ou o link do perfil)");
  const email = normalizarEmail(campos.email ?? "");
  if (email === "invalido") erros.push("e-mail inválido");

  if (erros.length > 0 || !nomeComercial || !categoria) return { erros };

  const siteOk = site as string | null;
  return {
    dados: {
      nomeComercial,
      nomeLegal: texto(campos.nome_legal),
      categoria,
      segmento: texto(campos.segmento),
      municipio: normalizarMunicipio(campos.municipio),
      endereco: texto(campos.endereco),
      site: siteOk,
      instagram: instagram as string | null,
      outrosPerfis: texto(campos.outros_perfis),
      telefone: telefone as string | null,
      email: email as string | null,
      responsavelComercial: texto(campos.responsavel_comercial),
      sinaisDemanda: texto(campos.sinais_demanda),
      compatibilidadeParrilla: texto(campos.compatibilidade_parrilla),
      limitacoes: texto(campos.limitacoes),
      observacoes: texto(campos.observacoes),
      nomeNormalizado: normalizarNome(nomeComercial),
      dominio: extrairDominio(siteOk),
    },
  };
}
