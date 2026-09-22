/**
 * Flag de corte NocoDB -> Postgres novo (docs/CHECKLIST_CORTE_PRODUCAO.md,
 * Fase A). Decide de onde os módulos de src/lib/ leem o catálogo.
 * Default `nocodb`: sem a variável, nada muda em produção.
 * `oracle` lê via Drizzle usando DATABASE_URL (que no corte aponta pro Oracle).
 */
export type DataSource = "nocodb" | "oracle";

export function dataSource(): DataSource {
  const valor = process.env.DATA_SOURCE?.trim() || "nocodb";
  if (valor !== "nocodb" && valor !== "oracle") {
    throw new Error(`DATA_SOURCE inválido: "${valor}" (esperado "nocodb" ou "oracle").`);
  }
  return valor;
}
