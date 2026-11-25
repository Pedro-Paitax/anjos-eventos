import { chmod, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";
import { CacheMensagens } from "./cache-mensagens.js";
import { ConfirmacaoEntrega } from "./entrega.js";
import { jidDoWhatsapp } from "./telefone.js";

export type StatusConexao = "connected" | "disconnected" | "connecting";

export type Status = { status: StatusConexao; qr_code: string | null };

/** Contrato usado pelo servidor HTTP — permite testar sem o Baileys. */
export interface ClienteWhatsapp {
  obterStatus(): Status;
  enviarTexto(jid: string, texto: string): Promise<void>;
  enviarDocumento(
    jid: string,
    arquivo: Buffer,
    nomeArquivo: string,
    legenda?: string,
  ): Promise<void>;
  deslogar(): Promise<void>;
}

export class NaoConectadoError extends Error {
  constructor() {
    super("WhatsApp não está conectado.");
  }
}

type Socket = ReturnType<typeof makeWASocket>;
type MensagemEnviada = NonNullable<Awaited<ReturnType<Socket["sendMessage"]>>>;
type ConteudoMensagem = Parameters<Socket["sendMessage"]>[1];

/** Quanto esperar a confirmação do servidor (status >= 2) antes de dar o envio como falho. */
export const ACK_TIMEOUT_PADRAO_MS = 30_000;

// Só transições de estado são logadas — nunca números, textos ou conteúdo.
const logger = pino({ level: process.env.WORKER_LOG_LEVEL ?? "warn" });

/** Gerencia a conexão Baileys, com sessão em disco (useMultiFileAuthState). */
export class GerenciadorWhatsapp implements ClienteWhatsapp {
  private socket: Socket | null = null;
  private status: StatusConexao = "connecting";
  private qrDataUrl: string | null = null;
  private tentativas = 0;
  private encerrado = false;
  private timerReconexao: NodeJS.Timeout | null = null;

  private readonly enviadas = new CacheMensagens<NonNullable<MensagemEnviada["message"]>>();
  private readonly confirmacao = new ConfirmacaoEntrega();
  /** JID montado a partir do número → JID canônico devolvido pelo WhatsApp (onWhatsApp). */
  private readonly jidsResolvidos = new Map<string, { jid: string; em: number }>();

  constructor(
    private readonly authDir: string,
    private readonly ackTimeoutMs: number = ACK_TIMEOUT_PADRAO_MS,
  ) {}

  obterStatus(): Status {
    return { status: this.status, qr_code: this.qrDataUrl };
  }

  async iniciar(): Promise<void> {
    await this.prepararPastaAuth();
    await this.conectar();
  }

  /** Pasta da sessão só para o dono (chmod 700 — sem efeito no Windows). */
  private async prepararPastaAuth(): Promise<void> {
    await mkdir(this.authDir, { recursive: true, mode: 0o700 });
    await chmod(this.authDir, 0o700).catch(() => undefined);
  }

  private async limparPastaAuth(): Promise<void> {
    const itens = await readdir(this.authDir).catch(() => [] as string[]);
    await Promise.all(
      itens.map((item) => rm(path.join(this.authDir, item), { recursive: true, force: true })),
    );
  }

  private async conectar(): Promise<void> {
    this.status = "connecting";
    this.qrDataUrl = null;

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
    const socket = makeWASocket({
      auth: state,
      // Versão do WhatsApp Web: a padrão da própria biblioteca (a mais recente pode ser incompatível).
      // Diagnóstico: WORKER_BAILEYS_LOG_LEVEL=debug mostra os eventos internos do Baileys
      // (podem conter JIDs). Deixe em silent no uso normal.
      logger: logger.child({ modulo: "baileys" }, { level: process.env.WORKER_BAILEYS_LOG_LEVEL ?? "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // Atende o pedido de reenvio do destinatário ("Aguardando mensagem"): devolve o conteúdo original.
      getMessage: async (chave) => (chave.id ? this.enviadas.obter(chave.id) : undefined),
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);
    // Diagnóstico: status de entrega de cada mensagem (1 pendente, 2 servidor, 3 entregue, 4 lida).
    // Só id e status — nunca JID ou conteúdo.
    socket.ev.on("messages.update", (atualizacoes) => {
      if (this.socket !== socket) return;
      for (const a of atualizacoes) {
        logger.warn({ id: a.key.id, status: a.update.status }, "Atualização de entrega.");
        if (a.key.id && typeof a.update.status === "number") this.confirmacao.registrar(a.key.id, a.update.status);
      }
    });
    socket.ev.on("connection.update", (update) => {
      // Ignora eventos de um socket que já foi substituído.
      if (this.socket !== socket) return;
      void this.aoAtualizarConexao(update);
    });
  }

  private async aoAtualizarConexao(update: {
    connection?: "open" | "connecting" | "close";
    qr?: string;
    lastDisconnect?: { error?: unknown };
  }): Promise<void> {
    if (update.qr) {
      this.qrDataUrl = await QRCode.toDataURL(update.qr);
      this.status = "disconnected"; // aguardando leitura do QR
      logger.warn("QR Code disponível para leitura.");
    }

    if (update.connection === "connecting" && !this.qrDataUrl) {
      this.status = "connecting";
    }

    if (update.connection === "open") {
      this.status = "connected";
      this.qrDataUrl = null;
      this.tentativas = 0;
      logger.warn("WhatsApp conectado.");
    }

    if (update.connection === "close") {
      const codigo = (update.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)
        ?.output?.statusCode;
      this.status = "connecting";
      this.qrDataUrl = null;
      if (this.encerrado) return;

      if (codigo === DisconnectReason.loggedOut) {
        logger.warn("Sessão deslogada pelo celular; limpando credenciais para novo QR.");
        await this.limparPastaAuth();
        this.agendarReconexao(1000);
      } else {
        const espera = Math.min(30_000, 2000 * 2 ** this.tentativas++);
        logger.warn({ codigo, espera }, "Conexão fechada; reconectando.");
        this.agendarReconexao(espera);
      }
    }
  }

  private agendarReconexao(ms: number): void {
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    this.timerReconexao = setTimeout(() => {
      this.timerReconexao = null;
      this.conectar().catch((erro: unknown) => {
        logger.error({ erro: String(erro) }, "Falha ao reconectar.");
        this.agendarReconexao(30_000);
      });
    }, ms);
  }

  private socketConectado(): Socket {
    if (this.status !== "connected" || !this.socket) throw new NaoConectadoError();
    return this.socket;
  }

  /**
   * JID que o WhatsApp reconhece para o número (onWhatsApp). Não dá para usar só os dígitos: no
   * Brasil há contas sem o nono dígito. O Baileys 7 cuida sozinho da troca PN -> LID nas sessões.
   * Número sem WhatsApp vira NumeroSemWhatsappError (422).
   */
  private async resolverJid(socket: Socket, jidMontado: string): Promise<string> {
    const cache = this.jidsResolvidos.get(jidMontado);
    if (cache && Date.now() - cache.em < 60 * 60 * 1000) return cache.jid;
    const jid = jidDoWhatsapp(await socket.onWhatsApp(jidMontado));
    this.jidsResolvidos.set(jidMontado, { jid, em: Date.now() });
    return jid;
  }

  /**
   * Envia e só devolve quando o servidor confirma (status >= 2) dentro do tempo limite.
   * Sem confirmação: erro (o app não deve dar como enviado) e registro no log, sem número nem texto.
   */
  private async enviarConfirmado(jidMontado: string, conteudo: ConteudoMensagem, tipo: string): Promise<void> {
    const socket = this.socketConectado();
    const jid = await this.resolverJid(socket, jidMontado);
    const enviada = await socket.sendMessage(jid, conteudo);
    const id = enviada?.key.id;
    if (!id) throw new Error("Envio sem id de mensagem.");
    if (enviada.message) this.enviadas.guardar(id, enviada.message);
    try {
      await this.confirmacao.aguardar(id, this.ackTimeoutMs);
    } catch (erro) {
      logger.error({ id, tipo, erro: (erro as Error).name }, "Envio sem confirmação do WhatsApp.");
      throw erro;
    }
    logger.warn({ id, tipo }, "Envio confirmado pelo WhatsApp.");
  }

  async enviarTexto(jid: string, texto: string): Promise<void> {
    await this.enviarConfirmado(jid, { text: texto }, "texto");
  }

  async enviarDocumento(
    jid: string,
    arquivo: Buffer,
    nomeArquivo: string,
    legenda?: string,
  ): Promise<void> {
    await this.enviarConfirmado(
      jid,
      { document: arquivo, mimetype: "application/pdf", fileName: nomeArquivo, caption: legenda },
      "documento",
    );
  }

  /** Desvincula o aparelho (logout real), apaga a sessão local e volta a esperar um novo QR. */
  async deslogar(): Promise<void> {
    const socket = this.socket;
    this.socket = null;
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    if (socket) {
      await socket.logout().catch(() => undefined);
      socket.end(undefined);
    }
    await this.limparPastaAuth();
    logger.warn("Sessão encerrada e credenciais removidas.");
    await this.conectar();
  }

  /** Encerra o processo de forma limpa, sem deslogar (mantém a sessão em disco). */
  async parar(): Promise<void> {
    this.encerrado = true;
    if (this.timerReconexao) clearTimeout(this.timerReconexao);
    this.socket?.end(undefined);
    this.socket = null;
  }
}
