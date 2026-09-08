// Tags de cache (Next.js revalidateTag) — única fonte de verdade compartilhada
// entre quem grava no cache (hierarquia-proteina.ts, dimensionamento-cardapio.ts)
// e quem invalida (app/api/revalidate/route.ts). Sem "server-only": são só
// strings, não fazem I/O.

export const TAG_HIERARQUIA_PROTEINA = "hierarquia-proteina";
export const TAG_MACRO_CATEGORIAS = "macro-categorias";
