import "server-only";
import { pool } from "@/lib/db";
import type { FuncaoColaborador } from "@/lib/colaboradores-opcoes";

export type Colaborador = {
  id: number;
  nome: string;
  funcao: FuncaoColaborador;
  telefone_whatsapp: string | null;
  ativo: boolean;
};

export type DadosColaborador = {
  nome: string;
  funcao: FuncaoColaborador;
  telefoneWhatsapp: string | null;
  ativo: boolean;
};

const COLUNAS = "id, nome, funcao, telefone_whatsapp, ativo";

export async function listarColaboradores(): Promise<Colaborador[]> {
  const { rows } = await pool.query<Colaborador>(
    `SELECT ${COLUNAS} FROM colaboradores ORDER BY ativo DESC, funcao, nome`
  );
  return rows;
}

export async function listarColaboradoresAtivos(): Promise<Colaborador[]> {
  const { rows } = await pool.query<Colaborador>(
    `SELECT ${COLUNAS} FROM colaboradores WHERE ativo ORDER BY nome`
  );
  return rows;
}

export async function obterColaborador(id: number): Promise<Colaborador | null> {
  const { rows } = await pool.query<Colaborador>(
    `SELECT ${COLUNAS} FROM colaboradores WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function criarColaborador(dados: DadosColaborador): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO colaboradores (nome, funcao, telefone_whatsapp, ativo)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [dados.nome, dados.funcao, dados.telefoneWhatsapp, dados.ativo]
  );
  return rows[0].id;
}

export async function atualizarColaborador(
  id: number,
  dados: DadosColaborador
): Promise<void> {
  await pool.query(
    `UPDATE colaboradores
        SET nome = $2, funcao = $3, telefone_whatsapp = $4, ativo = $5
      WHERE id = $1`,
    [id, dados.nome, dados.funcao, dados.telefoneWhatsapp, dados.ativo]
  );
}
