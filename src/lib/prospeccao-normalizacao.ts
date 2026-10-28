/**
 * Normalização e deduplicação de leads. Funções puras (testadas em
 * prospeccao-normalizacao.test.ts).
 *
 * Regra (especificação de prospecção, §7): nada é unido automaticamente.
 * - "forte": mesmo identificador inequívoco (domínio, telefone, Instagram, e-mail).
 * - "possivel": nome parecido no mesmo município, ou nome igual sem município
 *   em comum — vai para revisão manual.
 */

const PALAVRAS_IGNORADAS = new Set([
  "ltda", "me", "eireli", "epp", "sa", "s", "a",
  "de", "do", "da", "dos", "das", "e", "the", "o",
]);

/** Domínios que não identificam o estabelecimento (link de rede social, agregador etc.). */
const DOMINIOS_GENERICOS = [
  "instagram.com", "facebook.com", "fb.com", "linktr.ee", "wa.me", "whatsapp.com",
  "google.com", "goo.gl", "g.page", "maps.app.goo.gl", "tiktok.com", "ifood.com.br",
  "tripadvisor.com", "tripadvisor.com.br", "youtube.com", "linkedin.com", "beacons.ai",
];

export function semAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizarNome(nome: string): string {
  return semAcentos(nome.toLowerCase())
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((p) => p && !PALAVRAS_IGNORADAS.has(p))
    .join(" ");
}

export function normalizarMunicipio(municipio: string | null | undefined): string | null {
  const limpo = municipio?.trim().replace(/\s+/g, " ");
  return limpo ? limpo : null;
}

function chaveMunicipio(municipio: string | null | undefined): string | null {
  const m = normalizarMunicipio(municipio);
  return m ? semAcentos(m.toLowerCase()) : null;
}

/** Domínio próprio do estabelecimento, sem "www."; null se vazio, inválido ou genérico. */
export function extrairDominio(site: string | null | undefined): string | null {
  const bruto = site?.trim();
  if (!bruto) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(bruto) ? bruto : `https://${bruto}`).hostname;
  } catch {
    return null;
  }
  host = host.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;
  if (DOMINIOS_GENERICOS.some((g) => host === g || host.endsWith(`.${g}`))) return null;
  return host;
}

/** Site normalizado (com protocolo) ou "invalido". */
export function normalizarSite(site: string): string | null | "invalido" {
  const bruto = site.trim();
  if (!bruto) return null;
  const comProtocolo = /^https?:\/\//i.test(bruto) ? bruto : `https://${bruto}`;
  try {
    const url = new URL(comProtocolo);
    return url.hostname.includes(".") ? url.toString() : "invalido";
  } catch {
    return "invalido";
  }
}

/**
 * Telefone comercial brasileiro → dígitos com DDI 55 (formato do wa.me).
 * Aceita "(41) 3333-4444", "+55 41 99999-8888" e "041 3333-4444" (zero de longa distância).
 * Com 10–11 dígitos assume Brasil (DDD + número); com 12–13 exige começar com 55.
 * Outros tamanhos: "invalido" — não adivinha.
 */
export function normalizarTelefone(bruto: string): string | null | "invalido" {
  let digitos = bruto.replace(/\D/g, "");
  if (!digitos) return null;
  if ((digitos.length === 11 || digitos.length === 12) && digitos.startsWith("0")) digitos = digitos.slice(1);
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    const ddd = Number(digitos.slice(2, 4));
    if (ddd < 11) return "invalido";
    // Celular (13 dígitos) começa com 9 depois do DDD.
    if (digitos.length === 13 && digitos[4] !== "9") return "invalido";
    return digitos;
  }
  return "invalido";
}

/** "@Perfil", "instagram.com/perfil/" ou "perfil" → "perfil". */
export function normalizarInstagram(bruto: string): string | null | "invalido" {
  let valor = bruto.trim();
  if (!valor) return null;
  const url = valor.match(/instagram\.com\/([^/?#\s]+)/i);
  if (url) valor = url[1];
  valor = valor.replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(valor) ? valor : "invalido";
}

export function normalizarEmail(bruto: string): string | null | "invalido" {
  const valor = bruto.trim().toLowerCase();
  if (!valor) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? valor : "invalido";
}

export type IdentidadeLead = {
  id?: number;
  nomeComercial: string;
  municipio: string | null;
  site: string | null;
  telefone: string | null;
  instagram: string | null;
  email: string | null;
};

export type CorrespondenciaDuplicata = {
  id?: number;
  nomeComercial: string;
  nivel: "forte" | "possivel";
  motivos: string[];
};

function semelhancaNomes(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns++;
  return comuns / (ta.size + tb.size - comuns);
}

/** Compara dois leads (já normalizados nos campos de contato). null = sem sinal de duplicata. */
export function compararLeads(a: IdentidadeLead, b: IdentidadeLead): CorrespondenciaDuplicata | null {
  const fortes: string[] = [];
  const dominioA = extrairDominio(a.site);
  if (dominioA && dominioA === extrairDominio(b.site)) fortes.push(`mesmo site (${dominioA})`);
  if (a.telefone && a.telefone === b.telefone) fortes.push("mesmo telefone");
  if (a.instagram && a.instagram === b.instagram) fortes.push(`mesmo Instagram (@${a.instagram})`);
  if (a.email && a.email === b.email) fortes.push("mesmo e-mail");
  if (fortes.length > 0) return { id: b.id, nomeComercial: b.nomeComercial, nivel: "forte", motivos: fortes };

  const nomeA = normalizarNome(a.nomeComercial);
  const nomeB = normalizarNome(b.nomeComercial);
  if (!nomeA || !nomeB) return null;
  const munA = chaveMunicipio(a.municipio);
  const munB = chaveMunicipio(b.municipio);
  const mesmoMunicipio = munA !== null && munA === munB;
  const municipioDesconhecido = munA === null || munB === null;

  if (nomeA === nomeB && (mesmoMunicipio || municipioDesconhecido)) {
    return {
      id: b.id,
      nomeComercial: b.nomeComercial,
      nivel: "possivel",
      motivos: [mesmoMunicipio ? "mesmo nome no mesmo município" : "mesmo nome (município não informado)"],
    };
  }
  const contem = nomeA.length >= 5 && nomeB.length >= 5 && (nomeA.includes(nomeB) || nomeB.includes(nomeA));
  if (mesmoMunicipio && (contem || semelhancaNomes(nomeA, nomeB) >= 0.6)) {
    return { id: b.id, nomeComercial: b.nomeComercial, nivel: "possivel", motivos: ["nome parecido no mesmo município"] };
  }
  return null;
}

/** Todas as correspondências de `candidato` em `existentes`, as fortes primeiro. */
export function encontrarDuplicatas(
  candidato: IdentidadeLead,
  existentes: IdentidadeLead[],
): CorrespondenciaDuplicata[] {
  return existentes
    .filter((e) => e.id === undefined || e.id !== candidato.id)
    .map((e) => compararLeads(candidato, e))
    .filter((c): c is CorrespondenciaDuplicata => c !== null)
    .sort((x, y) => (x.nivel === y.nivel ? 0 : x.nivel === "forte" ? -1 : 1));
}

/** Pares de possíveis duplicatas dentro de uma lista (para a fila de revisão). */
export function paresDuplicados(
  leads: (IdentidadeLead & { id: number })[],
): { a: IdentidadeLead & { id: number }; b: IdentidadeLead & { id: number }; correspondencia: CorrespondenciaDuplicata }[] {
  const pares = [];
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const c = compararLeads(leads[i], leads[j]);
      if (c) pares.push({ a: leads[i], b: leads[j], correspondencia: c });
    }
  }
  return pares;
}
