import { chmod, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";
import QRCode from "qrcode";

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

  constructor(private readonly authDir: string) {}

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
    let version: [number, number, number] | undefined;
    try {
      version = (await fetchLatestBaileysVersion()).version;
    } catch {
      logger.warn("Não foi possível obter a versão mais recente do WhatsApp Web; usando a padrão.");
    }

    const socket = makeWASocket({
      auth: state,
      version,
      logger: logger.child({ modulo: "baileys" }, { level: "silent" }),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    this.socket = socket;

    socket.ev.on("creds.update", saveCreds);
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

  async enviarTexto(jid: string, texto: string): Promise<void> {
    await this.socketConectado().sendMessage(jid, { text: texto });
  }

  async enviarDocumento(
    jid: string,
    arquivo: Buffer,
    nomeArquivo: string,
    legenda?: string,
  ): Promise<void> {
    await this.socketConectado().sendMessage(jid, {
      document: arquivo,
      mimetype: "application/pdf",
      fileName: nomeArquivo,
      caption: legenda,
    });
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
