import "server-only";
import { pool } from "@/lib/db";

export type Empresa = { id: number; nome: string };

export async function listarEmpresas(): Promise<Empresa[]> {
  const { rows } = await pool.query<Empresa>(
    "SELECT id, nome FROM empresas ORDER BY id"
  );
  return rows;
}
