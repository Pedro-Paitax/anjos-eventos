import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_HIERARQUIA_PROTEINA, TAG_MACRO_CATEGORIAS } from "@/lib/cache-tags";

// Rota chamada por um webhook do NocoDB quando Hierarquia_Proteina ou
// Macro_Categorias mudam — ver docs/DECISOES.md, seção "Cache de
// Hierarquia_Proteina/Macro_Categorias" pra como configurar o webhook.
// Protegida por segredo compartilhado (REVALIDATE_SECRET) — nunca aberta.

const TAGS_POR_NOME: Record<string, string> = {
  "hierarquia-proteina": TAG_HIERARQUIA_PROTEINA,
  "macro-categorias": TAG_MACRO_CATEGORIAS,
};

function segredoValido(recebido: string | null, esperado: string): boolean {
  if (!recebido) return false;
  const bufRecebido = Buffer.from(recebido);
  const bufEsperado = Buffer.from(esperado);
  if (bufRecebido.length !== bufEsperado.length) return false;
  return timingSafeEqual(bufRecebido, bufEsperado);
}

export async function POST(request: Request) {
  const segredoEsperado = process.env.REVALIDATE_SECRET;
  if (!segredoEsperado) {
    return NextResponse.json(
      { erro: "REVALIDATE_SECRET não configurado no servidor." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const segredoRecebido =
    request.headers.get("x-revalidate-secret") ?? url.searchParams.get("secret");

  if (!segredoValido(segredoRecebido, segredoEsperado)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const tagParam = url.searchParams.get("tag");
  const tags = tagParam ? [TAGS_POR_NOME[tagParam]] : Object.values(TAGS_POR_NOME);

  if (tagParam && !tags[0]) {
    return NextResponse.json(
      {
        erro: `Tag desconhecida: "${tagParam}". Válidas: ${Object.keys(TAGS_POR_NOME).join(", ")}.`,
      },
      { status: 400 }
    );
  }

  for (const tag of tags) {
    // Next.js 16 passou a exigir um perfil de cacheLife como segundo
    // argumento; "max" é o valor recomendado pela própria mensagem de
    // depreciação do framework pra quem só quer invalidar a tag sob
    // demanda (equivalente ao antigo revalidateTag(tag) de argumento
    // único).
    revalidateTag(tag, "max");
  }

  return NextResponse.json({ revalidado: tags });
}
