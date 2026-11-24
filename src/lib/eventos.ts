import "server-only";
import { pool } from "@/lib/db";
import { motivoBloqueioExclusao } from "@/lib/exclusao-evento";

export type StatusEvento = "orcado" | "confirmado" | "realizado" | "cancelado";

export type Evento = {
  id: number;
  empresa_id: number;
  empresa_nome: string;
  cliente: string;
  contato: string | null;
  telefone: string | null;
  endereco_evento: string | null;
  data_evento: string;
  tipo_evento: string | null;
  hora_chegada_equipe: string | null;
  hora_aperitivo: string | null;
  hora_almoco: string | null;
  hora_encerramento: string | null;
  qtd_adultos: number | null;
  qtd_criancas_ate_5: number | null;
  qtd_criancas_5_a_10: number | null;
  qtd_fornecedores: number | null;
  cardapio_entrada: string | null;
  cardapio_carnes: string | null;
  cardapio_acompanhamentos: string | null;
  cardapio_saladas: string | null;
  cardapio_bebidas: string | null;
  cardapio_sobremesa: string | null;
  preco_pessoa: string | null;
  preco_crianca_meia: string | null;
  valor_garcom: string | null;
  taxa_deslocamento: string | null;
  qtd_garcons: number | null;
  qtd_churrasqueiros: number | null;
  qtd_copeiras: number | null;
  regiao_metropolitana_curitiba: boolean | null;
  quantidade_copeira_sugerida: number | null;
  custo_copeira_total: string | null;
  custo_assador_total: string | null;
  prazo_pagamento: string | null;
  chave_pix: string | null;
  caminho_contrato: string | null;
  status: StatusEvento;
  valor: string | null;
  observacoes: string | null;
};

export type DadosEvento = {
  empresaId: number;
  cliente: string;
  contato: string | null;
  telefone: string | null;
  enderecoEvento: string | null;
  dataEvento: string;
  tipoEvento: string | null;
  horaChegadaEquipe: string | null;
  horaAperitivo: string | null;
  horaAlmoco: string | null;
  horaEncerramento: string | null;
  qtdAdultos: number | null;
  qtdCriancasAte5: number | null;
  qtdCriancas5a10: number | null;
  qtdFornecedores: number | null;
  cardapioEntrada: string | null;
  cardapioCarnes: string | null;
  cardapioAcompanhamentos: string | null;
  cardapioSaladas: string | null;
  cardapioBebidas: string | null;
  cardapioSobremesa: string | null;
  precoPessoa: number | null;
  precoCriancaMeia: number | null;
  valorGarcom: number | null;
  taxaDeslocamento: number | null;
  qtdGarcons: number | null;
  qtdChurrasqueiros: number | null;
  qtdCopeiras: number | null;
  /** Calculados no Server Action a partir de qtdAdultos+criancas — não vêm direto do usuário (docs/DECISOES.md, "Precificação por Cardápio..."). */
  regiaoMetropolitanaCuritiba: boolean;
  quantidadeCopeiraSugerida: number;
  custoCopeiraTotal: number;
  custoAssadorTotal: number;
  prazoPagamento: string | null;
  chavePix: string | null;
  caminhoContrato: string | null;
  status: StatusEvento;
  valor: number | null;
  observacoes: string | null;
};

const SELECT_BASE = `
  SELECT
    e.id, e.empresa_id, emp.nome AS empresa_nome, e.cliente,
    e.contato, e.telefone, e.endereco_evento, e.data_evento, e.tipo_evento,
    e.hora_chegada_equipe, e.hora_aperitivo, e.hora_almoco, e.hora_encerramento,
    e.qtd_adultos, e.qtd_criancas_ate_5, e.qtd_criancas_5_a_10, e.qtd_fornecedores,
    e.cardapio_entrada, e.cardapio_carnes, e.cardapio_acompanhamentos,
    e.cardapio_saladas, e.cardapio_bebidas, e.cardapio_sobremesa,
    e.preco_pessoa, e.preco_crianca_meia, e.valor_garcom, e.taxa_deslocamento,
    e.qtd_garcons, e.qtd_churrasqueiros, e.qtd_copeiras,
    e.regiao_metropolitana_curitiba, e.quantidade_copeira_sugerida,
    e.custo_copeira_total, e.custo_assador_total,
    e.prazo_pagamento, e.chave_pix, e.caminho_contrato,
    e.status, e.valor, e.observacoes
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

const COLUNAS = [
  "empresa_id",
  "cliente",
  "contato",
  "telefone",
  "endereco_evento",
  "data_evento",
  "tipo_evento",
  "hora_chegada_equipe",
  "hora_aperitivo",
  "hora_almoco",
  "hora_encerramento",
  "qtd_adultos",
  "qtd_criancas_ate_5",
  "qtd_criancas_5_a_10",
  "qtd_fornecedores",
  "cardapio_entrada",
  "cardapio_carnes",
  "cardapio_acompanhamentos",
  "cardapio_saladas",
  "cardapio_bebidas",
  "cardapio_sobremesa",
  "preco_pessoa",
  "preco_crianca_meia",
  "valor_garcom",
  "taxa_deslocamento",
  "qtd_garcons",
  "qtd_churrasqueiros",
  "qtd_copeiras",
  "regiao_metropolitana_curitiba",
  "quantidade_copeira_sugerida",
  "custo_copeira_total",
  "custo_assador_total",
  "prazo_pagamento",
  "chave_pix",
  "caminho_contrato",
  "status",
  "valor",
  "observacoes",
] as const;

function valoresNaOrdem(dados: DadosEvento): unknown[] {
  return [
    dados.empresaId,
    dados.cliente,
    dados.contato,
    dados.telefone,
    dados.enderecoEvento,
    dados.dataEvento,
    dados.tipoEvento,
    dados.horaChegadaEquipe,
    dados.horaAperitivo,
    dados.horaAlmoco,
    dados.horaEncerramento,
    dados.qtdAdultos,
    dados.qtdCriancasAte5,
    dados.qtdCriancas5a10,
    dados.qtdFornecedores,
    dados.cardapioEntrada,
    dados.cardapioCarnes,
    dados.cardapioAcompanhamentos,
    dados.cardapioSaladas,
    dados.cardapioBebidas,
    dados.cardapioSobremesa,
    dados.precoPessoa,
    dados.precoCriancaMeia,
    dados.valorGarcom,
    dados.taxaDeslocamento,
    dados.qtdGarcons,
    dados.qtdChurrasqueiros,
    dados.qtdCopeiras,
    dados.regiaoMetropolitanaCuritiba,
    dados.quantidadeCopeiraSugerida,
    dados.custoCopeiraTotal,
    dados.custoAssadorTotal,
    dados.prazoPagamento,
    dados.chavePix,
    dados.caminhoContrato,
    dados.status,
    dados.valor,
    dados.observacoes,
  ];
}

export async function criarEvento(dados: DadosEvento): Promise<number> {
  const placeholders = COLUNAS.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO eventos (${COLUNAS.join(", ")})
     VALUES (${placeholders})
     RETURNING id`,
    valoresNaOrdem(dados)
  );
  return rows[0].id;
}

/**
 * Exclui o evento e o que só existe por causa dele, numa transação:
 * quantidades congeladas (itens_evento_confirmados), orçamentos ligados e
 * seus itens. Decisões operacionais, equipe e contratos caem em cascata.
 *
 * Antes era um DELETE simples, que falhava na chave estrangeira de
 * itens_evento_confirmados/orcamentos para todo evento criado pelo fluxo de
 * orçamento (auditoria de 23/11, defeito D6). Recusa, sem apagar nada,
 * depois de lista de compras ou Ordem de Ação enviadas (motivoBloqueioExclusao).
 */
export async function excluirEvento(id: number): Promise<{ erro: string } | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const evento = await client.query(`SELECT id FROM eventos WHERE id = $1 FOR UPDATE`, [id]);
    if (evento.rowCount === 0) {
      await client.query("ROLLBACK");
      return { erro: "Evento não encontrado. Talvez já tenha sido excluído." };
    }

    const { rows: marcas } = await client.query<{
      lista_compras_enviada_em: Date | null;
      ordens_disparadas_em: Date | null;
    }>(
      `SELECT lista_compras_enviada_em, ordens_disparadas_em
         FROM decisoes_operacionais_evento WHERE evento_id = $1`,
      [id]
    );
    const motivo = motivoBloqueioExclusao(
      marcas[0]
        ? { listaComprasEnviadaEm: marcas[0].lista_compras_enviada_em, ordensDisparadasEm: marcas[0].ordens_disparadas_em }
        : null
    );
    if (motivo) {
      await client.query("ROLLBACK");
      return { erro: motivo };
    }

    const { rows: orcs } = await client.query<{ id: number }>(
      `SELECT id FROM orcamentos WHERE evento_id = $1`,
      [id]
    );
    const orcamentoIds = orcs.map((o) => o.id);

    await client.query(
      `DELETE FROM itens_evento_confirmados WHERE evento_id = $1 OR orcamento_origem_id = ANY($2::int[])`,
      [id, orcamentoIds]
    );
    if (orcamentoIds.length > 0) {
      await client.query(`DELETE FROM itens_orcamento WHERE orcamento_id = ANY($1::int[])`, [orcamentoIds]);
      await client.query(`DELETE FROM orcamento_itens_adicionais WHERE orcamento_id = ANY($1::int[])`, [orcamentoIds]);
      await client.query(`DELETE FROM orcamentos WHERE id = ANY($1::int[])`, [orcamentoIds]);
    }
    await client.query(`DELETE FROM eventos WHERE id = $1`, [id]);
    await client.query("COMMIT");
    return null;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function atualizarEvento(
  id: number,
  dados: DadosEvento
): Promise<void> {
  const atribuicoes = COLUNAS.map((coluna, i) => `${coluna} = $${i + 1}`).join(
    ", "
  );
  await pool.query(
    `UPDATE eventos SET ${atribuicoes}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${COLUNAS.length + 1}`,
    [...valoresNaOrdem(dados), id]
  );
}

export type EventoProximo = Pick<
  Evento,
  "id" | "cliente" | "empresa_id" | "empresa_nome" | "data_evento" | "tipo_evento" | "status"
>;

/** Eventos não cancelados de hoje até hoje+`dias` (inclusive), em ordem de data. */
export async function listarEventosProximos(dias: number): Promise<EventoProximo[]> {
  const { rows } = await pool.query<EventoProximo>(
    `SELECT e.id, e.cliente, e.empresa_id, emp.nome AS empresa_nome,
            e.data_evento, e.tipo_evento, e.status
       FROM eventos e
       JOIN empresas emp ON emp.id = e.empresa_id
      WHERE e.status <> 'cancelado'
        AND e.data_evento >= CURRENT_DATE
        AND e.data_evento < CURRENT_DATE + ($1::int + 1)
      ORDER BY e.data_evento ASC`,
    [dias]
  );
  return rows;
}
