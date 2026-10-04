import "server-only";
import { pool } from "@/lib/db";
import {
  calcularItensPendencia,
  type DecisoesParaPendencia,
  type EquipeAlocada,
  type ItemPendencia,
} from "@/lib/pendencias-evento";

export const EMPRESA_SENHOR_CHURRASCO = "Buffet Senhor Churrasco";

export type DecisoesOperacionais = {
  veiculo: string | null;
  modelo_prato: string | null;
  sousplat: boolean;
  tipo_bebida_recipiente: string | null;
  taca_furta_cor: boolean;
  taca_champanhe: boolean;
  tipo_talher: string | null;
  ordens_disparadas_em: string | null;
};

export type DadosDecisoes = {
  veiculo: string | null;
  modeloPrato: string | null;
  sousplat: boolean;
  tipoBebidaRecipiente: string | null;
  tacaFurtaCor: boolean;
  tacaChampanhe: boolean;
  tipoTalher: string | null;
};

export async function obterDecisoes(eventoId: number): Promise<DecisoesOperacionais | null> {
  const { rows } = await pool.query<DecisoesOperacionais>(
    `SELECT veiculo, modelo_prato, sousplat, tipo_bebida_recipiente,
            taca_furta_cor, taca_champanhe, tipo_talher, ordens_disparadas_em
       FROM decisoes_operacionais_evento WHERE evento_id = $1`,
    [eventoId]
  );
  return rows[0] ?? null;
}

export async function salvarDecisoes(eventoId: number, d: DadosDecisoes): Promise<void> {
  await pool.query(
    `INSERT INTO decisoes_operacionais_evento
       (evento_id, veiculo, modelo_prato, sousplat, tipo_bebida_recipiente,
        taca_furta_cor, taca_champanhe, tipo_talher)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (evento_id) DO UPDATE SET
       veiculo = EXCLUDED.veiculo,
       modelo_prato = EXCLUDED.modelo_prato,
       sousplat = EXCLUDED.sousplat,
       tipo_bebida_recipiente = EXCLUDED.tipo_bebida_recipiente,
       taca_furta_cor = EXCLUDED.taca_furta_cor,
       taca_champanhe = EXCLUDED.taca_champanhe,
       tipo_talher = EXCLUDED.tipo_talher,
       updated_at = NOW()`,
    [
      eventoId, d.veiculo, d.modeloPrato, d.sousplat,
      d.tipoBebidaRecipiente, d.tacaFurtaCor, d.tacaChampanhe, d.tipoTalher,
    ]
  );
}

/** IDs dos colaboradores alocados ao evento. */
export async function listarEquipeEvento(eventoId: number): Promise<number[]> {
  const { rows } = await pool.query<{ colaborador_id: number }>(
    "SELECT colaborador_id FROM evento_colaboradores WHERE evento_id = $1",
    [eventoId]
  );
  return rows.map((r) => r.colaborador_id);
}

/** Substitui a equipe do evento (papel_no_evento = função do colaborador). */
export async function definirEquipeEvento(
  eventoId: number,
  colaboradorIds: number[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM evento_colaboradores WHERE evento_id = $1", [eventoId]);
    if (colaboradorIds.length > 0) {
      await client.query(
        `INSERT INTO evento_colaboradores (evento_id, colaborador_id, papel_no_evento)
         SELECT $1, c.id, c.funcao::text FROM colaboradores c WHERE c.id = ANY($2::int[])`,
        [eventoId, colaboradorIds]
      );
    }
    await client.query("COMMIT");
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}

type LinhaPendencia = {
  evento_id: number;
  qtd_garcons: number | null;
  copeiras: number;
  assadores: number;
  garcons: number;
  tem_decisoes: boolean;
  veiculo: string | null;
  modelo_prato: string | null;
  tipo_bebida_recipiente: string | null;
  tipo_talher: string | null;
};

/**
 * Pendências dos eventos informados, por id. Eventos que não são do Senhor
 * Churrasco ou não estão confirmados não entram no resultado (não se aplicam).
 */
export async function itensPendenciaPorEvento(
  eventoIds: number[]
): Promise<Map<number, ItemPendencia[]>> {
  const resultado = new Map<number, ItemPendencia[]>();
  if (eventoIds.length === 0) return resultado;

  const { rows } = await pool.query<LinhaPendencia>(
    `SELECT e.id AS evento_id, e.qtd_garcons,
            COUNT(c.id) FILTER (WHERE c.funcao = 'copeira')::int AS copeiras,
            COUNT(c.id) FILTER (WHERE c.funcao = 'assador')::int AS assadores,
            COUNT(c.id) FILTER (WHERE c.funcao = 'garcom')::int AS garcons,
            (d.id IS NOT NULL) AS tem_decisoes,
            d.veiculo, d.modelo_prato, d.tipo_bebida_recipiente, d.tipo_talher
       FROM eventos e
       JOIN empresas emp ON emp.id = e.empresa_id
       LEFT JOIN evento_colaboradores ec ON ec.evento_id = e.id
       LEFT JOIN colaboradores c ON c.id = ec.colaborador_id AND c.ativo
       LEFT JOIN decisoes_operacionais_evento d ON d.evento_id = e.id
      WHERE e.id = ANY($1::int[])
        AND emp.nome = $2
        AND e.status = 'confirmado'
      GROUP BY e.id, d.id`,
    [eventoIds, EMPRESA_SENHOR_CHURRASCO]
  );

  for (const l of rows) {
    const equipe: EquipeAlocada = {
      copeiras: l.copeiras,
      assadores: l.assadores,
      garcons: l.garcons,
    };
    const decisoes: DecisoesParaPendencia | null = l.tem_decisoes
      ? {
          veiculo: l.veiculo,
          modeloPrato: l.modelo_prato,
          tipoBebidaRecipiente: l.tipo_bebida_recipiente,
          tipoTalher: l.tipo_talher,
        }
      : null;
    resultado.set(
      l.evento_id,
      calcularItensPendencia({ garconsNecessarios: l.qtd_garcons, equipe, decisoes })
    );
  }
  return resultado;
}

export async function pendenciasPorEvento(
  eventoIds: number[]
): Promise<Map<number, string[]>> {
  const itens = await itensPendenciaPorEvento(eventoIds);
  return new Map([...itens].map(([id, lista]) => [id, lista.map((i) => i.texto)]));
}
