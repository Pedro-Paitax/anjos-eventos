/**
 * Links para contato MANUAL. Nada aqui envia mensagem: abrir o link só leva o
 * usuário ao app; o envio é registrado depois, quando ele confirma.
 */
import type { Canal } from "@/lib/prospeccao-opcoes";

export type ContatoLead = {
  telefone: string | null;
  instagram: string | null;
  email: string | null;
};

export function canaisDisponiveis(c: ContatoLead): Canal[] {
  const canais: Canal[] = [];
  if (c.telefone) canais.push("whatsapp");
  if (c.instagram) canais.push("instagram");
  if (c.email) canais.push("email");
  return canais;
}

export function linkWhatsapp(telefone: string, texto: string): string {
  return `https://wa.me/${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

export function linkInstagram(usuario: string): string {
  return `https://www.instagram.com/${encodeURIComponent(usuario)}/`;
}

export function linkEmail(email: string, assunto: string | null, corpo: string): string {
  const params = [
    assunto ? `subject=${encodeURIComponent(assunto)}` : null,
    `body=${encodeURIComponent(corpo)}`,
  ].filter(Boolean);
  return `mailto:${email}?${params.join("&")}`;
}

/** Link do canal da mensagem, ou null se o lead não tem esse contato. */
export function linkDoCanal(
  canal: Canal,
  contato: ContatoLead,
  conteudo: string,
  assunto: string | null,
): string | null {
  switch (canal) {
    case "whatsapp":
      return contato.telefone ? linkWhatsapp(contato.telefone, conteudo) : null;
    case "instagram":
      return contato.instagram ? linkInstagram(contato.instagram) : null;
    case "email":
      return contato.email ? linkEmail(contato.email, assunto, conteudo) : null;
  }
}
