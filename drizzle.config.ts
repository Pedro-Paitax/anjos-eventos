import type { Config } from "drizzle-kit";

/**
 * Config de preparação — NÃO rodar `drizzle-kit push`/`migrate` ainda.
 * DATABASE_URL aponta pro Postgres novo (Oracle Cloud, ver
 * docs/plano-migracao-postgres-vultr.md); nenhum comando que escreve
 * no banco foi executado a partir deste arquivo nesta sessão.
 */
export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
