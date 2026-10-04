import "server-only";
import { pool } from "@/lib/db";
import { obterEvento } from "@/lib/eventos";
import {
  EMPRESA_SENHOR_CHURRASCO,
  obterDecisoes,
  pendenciasPorEvento,
} from "@/lib/decisoes-operacionais";
import { gerarOrdemAcaoPdf, ROTULO_PAPEL, type PapelOrdem } from "@/lib/ordem-acao";
import { montarMensagemLembrete, type EventoComPendencia } from "@/lib/lembrete-mensagem";
import { enviarDocumento, enviarTexto, statusWorker } from "@/lib/whatsapp-worker";
import { formatarData, formatarHora } from "@/lib/formatacao";

// "Agora/hoje" sempre no fuso do negócio, independente do fuso do servidor/banco
// (`data_evento` é timestamp sem fuso, em horário de São Paulo).
const AGORA_SP = "(NOW() AT TIME ZONE 'America/Sao_Paulo')";
const HOJE_SP = `${AGORA_SP}::date`;

// Ordem de Ação sai quando faltam 2h10 ou menos para o início do evento e
// enquanto ele ainda não começou: quem resolve a pendência dentro da janela
// normal dispara ~2h antes; quem resolve mais tarde dispara na próxima execução
// do cron (melhor atrasada do que nunca). Depois que o evento começa, para de
// tentar. O UPDATE atômico de ordens_disparadas_em impede o envio duplicado.
const ORDEM_ANTECEDENCIA_MAX_MIN = 130;

export type ResultadoEventoOrdem = {
  evento_id: number;
  cliente: string;
  resultado: "enviada" | "ja_enviada" | "pendente" | "sem_destinatarios" | "falha";
  enviados?: number;
  falhas?: number;
  pendencias?: string[];
};

export type ResultadoOrdemAcao =
  | { ok: false; motivo: "worker_desconectado" }
  | { ok: true; eventos: ResultadoEventoOrdem[] };

export type ResultadoLembrete =
  | { ok: false; motivo: "worker_desconectado" | "destinatarios_nao_configurados" }
  | { ok: true; eventos_com_pendencia: number; mensagens_enviadas: number; falhas: number };

async function workerConectado(contexto: string): Promise<boolean> {
  const status = await statusWorker();
  if (status?.status === "connected") return true;
  console.error(
    `[automacao-whatsapp] ${contexto}: worker ${status ? status.status : "inacessível"} — nada foi enviado.`
  );
  return false;
}

async function eventosChurrasco(filtroData: string): Promise<{ id: number; cliente: string; data_evento: string }[]> {
  const { rows } = await pool.query(
    `SELECT e.id, e.cliente, e.data_evento
       FROM eventos e JOIN empresas emp ON emp.id = e.empresa_id
      WHERE emp.nome = $1 AND e.status = 'confirmado' AND ${filtroData}
      ORDER BY e.data_evento`,
    [EMPRESA_SENHOR_CHURRASCO]
  );
  return rows;
}

type Destinatario = { nome: string; funcao: PapelOrdem; telefone: string | null };

async function destinatariosDoEvento(eventoId: number): Promise<Destinatario[]> {
  const { rows } = await pool.query<Destinatario>(
    `SELECT c.nome, c.funcao::text AS funcao, c.telefone_whatsapp AS telefone
       FROM evento_colaboradores ec JOIN colaboradores c ON c.id = ec.colaborador_id
      WHERE ec.evento_id = $1 AND c.ativo
      ORDER BY c.funcao, c.nome`,
    [eventoId]
  );
  return rows;
}

/** Reserva o disparo do dia de forma atômica: só quem vê NULL consegue. */
async function reservarDisparo(eventoId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE decisoes_operacionais_evento SET ordens_disparadas_em = NOW()
      WHERE evento_id = $1 AND ordens_disparadas_em IS NULL`,
    [eventoId]
  );
  return (rowCount ?? 0) > 0;
}

async function liberarDisparo(eventoId: number): Promise<void> {
  await pool.query(
    "UPDATE decisoes_operacionais_evento SET ordens_disparadas_em = NULL WHERE evento_id = $1",
    [eventoId]
  );
}

/**
 * Ordem de Ação (automática). Eventos confirmados do Senhor Churrasco que
 * ainda não começaram e cujo início está a 2h10 ou menos, sem pendência e ainda
 * sem disparo. Envio estritamente
 * sequencial (a fila de 3 s vive no worker). Só marca `ordens_disparadas_em`
 * se ao menos um envio saiu: se tudo falhou, libera para o próximo ciclo; se
 * foi parcial, mantém a marca (evita duplicar a quem já recebeu) e reporta as
 * falhas no retorno/log — uma ordem já enviada não é recolhida nem atualizada.
 */
export async function executarOrdemAcao(): Promise<ResultadoOrdemAcao> {
  if (!(await workerConectado("ordem de ação"))) return { ok: false, motivo: "worker_desconectado" };

  const hoje = await eventosChurrasco(
    `e.data_evento > ${AGORA_SP}
     AND e.data_evento <= ${AGORA_SP} + interval '${ORDEM_ANTECEDENCIA_MAX_MIN} minutes'`
  );
  const pendencias = await pendenciasPorEvento(hoje.map((e) => e.id));
  const resultados: ResultadoEventoOrdem[] = [];

  for (const { id, cliente } of hoje) {
    const pend = pendencias.get(id) ?? [];
    if (pend.length > 0) {
      console.error(`[automacao-whatsapp] ordem NÃO enviada (evento ${id}, ${cliente}): ${pend.join("; ")}`);
      resultados.push({ evento_id: id, cliente, resultado: "pendente", pendencias: pend });
      continue;
    }

    if (!(await reservarDisparo(id))) {
      resultados.push({ evento_id: id, cliente, resultado: "ja_enviada" });
      continue;
    }

    const destinatarios = await destinatariosDoEvento(id);
    const comTelefone = destinatarios.filter((d) => d.telefone);
    if (comTelefone.length === 0) {
      await liberarDisparo(id);
      console.error(`[automacao-whatsapp] evento ${id}: nenhum colaborador alocado com WhatsApp.`);
      resultados.push({ evento_id: id, cliente, resultado: "sem_destinatarios" });
      continue;
    }

    const evento = await obterEvento(id);
    const decisoes = await obterDecisoes(id);
    let enviados = 0;
    let falhas = destinatarios.length - comTelefone.length; // sem WhatsApp cadastrado
    for (const d of comTelefone) {
      try {
        const pdf = await gerarOrdemAcaoPdf({
          papel: d.funcao,
          nomeColaborador: d.nome,
          cliente,
          dataHora: `${formatarData(evento!.data_evento)}, ${formatarHora(evento!.data_evento)}`,
          tipoEvento: evento!.tipo_evento,
          endereco: evento!.endereco_evento,
          horaInicio: formatarHora(evento!.data_evento),
          qtdAdultos: evento!.qtd_adultos,
          qtdCriancasAte5: evento!.qtd_criancas_ate_5,
          qtdCriancas5a10: evento!.qtd_criancas_5_a_10,
          qtdFornecedores: evento!.qtd_fornecedores,
          horaChegadaEquipe: evento!.hora_chegada_equipe,
          horaAperitivo: evento!.hora_aperitivo,
          horaAlmoco: evento!.hora_almoco,
          horaEncerramento: evento!.hora_encerramento,
          cardapioCarnes: evento!.cardapio_carnes,
          cardapioBebidas: evento!.cardapio_bebidas,
          veiculo: decisoes!.veiculo,
          modeloPrato: decisoes!.modelo_prato,
          sousplat: decisoes!.sousplat,
          tipoBebidaRecipiente: decisoes!.tipo_bebida_recipiente,
          tacaFurtaCor: decisoes!.taca_furta_cor,
          tacaChampanhe: decisoes!.taca_champanhe,
          tipoTalher: decisoes!.tipo_talher,
        });
        await enviarDocumento(
          d.telefone!,
          `ordem-de-acao-${ROTULO_PAPEL[d.funcao].toLowerCase()}.pdf`,
          pdf,
          `Ordem de Ação — ${cliente}`
        );
        enviados++;
      } catch (erro) {
        falhas++;
        console.error(`[automacao-whatsapp] falha ao enviar ordem (evento ${id}, ${d.funcao}): ${(erro as Error).message}`);
      }
    }

    if (enviados === 0) await liberarDisparo(id);
    resultados.push({
      evento_id: id,
      cliente,
      resultado: enviados === 0 ? "falha" : "enviada",
      enviados,
      falhas,
    });
  }
  return { ok: true, eventos: resultados };
}

function numerosFamilia(): string[] {
  return (process.env.FAMILIA_WHATSAPP_NUMEROS ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
}

/**
 * Lembrete de 7 dias: eventos confirmados do Senhor Churrasco entre hoje e
 * hoje+7 com qualquer pendência → 1 mensagem consolidada para cada um dos
 * números da família (FAMILIA_WHATSAPP_NUMEROS, só em variável de ambiente).
 */
export async function executarLembrete7Dias(): Promise<ResultadoLembrete> {
  const numeros = numerosFamilia();
  if (numeros.length === 0) {
    console.error("[automacao-whatsapp] lembrete: FAMILIA_WHATSAPP_NUMEROS não configurado.");
    return { ok: false, motivo: "destinatarios_nao_configurados" };
  }
  if (!(await workerConectado("lembrete de 7 dias"))) return { ok: false, motivo: "worker_desconectado" };

  const proximos = await eventosChurrasco(
    `e.data_evento::date BETWEEN ${HOJE_SP} AND ${HOJE_SP} + 7`
  );
  const pendencias = await pendenciasPorEvento(proximos.map((e) => e.id));
  const comPendencia: EventoComPendencia[] = [];
  for (const e of proximos) {
    const pend = pendencias.get(e.id) ?? [];
    if (pend.length > 0) {
      comPendencia.push({
        cliente: e.cliente,
        data: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(e.data_evento)),
        pendencias: pend,
      });
    }
  }
  if (comPendencia.length === 0) return { ok: true, eventos_com_pendencia: 0, mensagens_enviadas: 0, falhas: 0 };

  const mensagem = montarMensagemLembrete(comPendencia);
  let enviadas = 0;
  let falhas = 0;
  for (const numero of numeros) {
    try {
      await enviarTexto(numero, mensagem);
      enviadas++;
    } catch (erro) {
      falhas++;
      console.error(`[automacao-whatsapp] falha ao enviar lembrete: ${(erro as Error).message}`);
    }
  }
  return { ok: true, eventos_com_pendencia: comPendencia.length, mensagens_enviadas: enviadas, falhas };
}
