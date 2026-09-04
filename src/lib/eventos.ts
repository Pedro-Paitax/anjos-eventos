import "server-only";
import { pool } from "@/lib/db";

export type StatusEvento = "orcado" | "confirmado" | "realizado" | "cancelado";
export type Veiculo = "Master" | "Kombi nova" | "Kombi velha";

export type Evento = {
  id: number;
  empresa_id: number;
  empresa_nome: string;
  cliente: string;
  data_evento: string;
  tipo_evento: string | null;
  num_convidados: number | null;
  status: StatusEvento;
  valor: string | null;
  veiculo: Veiculo | null;
  observacoes: string | null;
};

export type DadosEvento = {
  empresaId: number;
  cliente: string;
  dataEvento: string;
  tipoEvento: string | null;
  numConvidados: number | null;
  status: StatusEvento;
  valor: number | null;
  veiculo: Veiculo | null;
  observacoes: string | null;
};

const SELECT_BASE = `
  SELECT
    e.id, e.empresa_id, emp.nome AS empresa_nome, e.cliente, e.data_evento,
    e.tipo_evento, e.num_convidados, e.status, e.valor, e.veiculo, e.observacoes
  FROM eventos e
  JOIN empresas emp ON emp.id = e.empresa_id
`;

export async function listarEventos(): Promise<Evento[]> {
  const { rows } = await pool.query<Evento>(
    `${SELECT_BASE} ORDER BY e.data_evento ASC`
  );
  return rows;
}

export async function obterEvento(id: number): Promise<Evento | null> {
  const { rows } = await pool.query<Evento>(
    `${SELECT_BASE} WHERE e.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function criarEvento(dados: DadosEvento): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO eventos
      (empresa_id, cliente, data_evento, tipo_evento, num_convidados, status, valor, veiculo, observacoes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      dados.empresaId,
      dados.cliente,
      dados.dataEvento,
      dados.tipoEvento,
      dados.numConvidados,
      dados.status,
      dados.valor,
      dados.veiculo,
      dados.observacoes,
    ]
  );
  return rows[0].id;
}

export async function atualizarEvento(
  id: number,
  dados: DadosEvento
): Promise<void> {
  await pool.query(
    `UPDATE eventos SET
      empresa_id = $1, cliente = $2, data_evento = $3, tipo_evento = $4,
      num_convidados = $5, status = $6, valor = $7, veiculo = $8,
      observacoes = $9, updated_at = CURRENT_TIMESTAMP
     WHERE id = $10`,
    [
      dados.empresaId,
      dados.cliente,
      dados.dataEvento,
      dados.tipoEvento,
      dados.numConvidados,
      dados.status,
      dados.valor,
      dados.veiculo,
      dados.observacoes,
      id,
    ]
  );
}
