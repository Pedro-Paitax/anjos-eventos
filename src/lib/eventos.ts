import "server-only";
import { pool } from "@/lib/db";

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
