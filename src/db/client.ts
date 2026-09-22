import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "@/lib/db";
import * as schema from "./schema";

/**
 * Reaproveita o Pool já existente (src/lib/db.ts) em vez de abrir uma
 * segunda conexão — nenhum consumidor usa este client ainda (schema
 * só desenhado nesta sessão, ETL e drizzle-kit push ficam para uma
 * etapa futura, aprovada separadamente).
 */
export const db = drizzle(pool, { schema });
