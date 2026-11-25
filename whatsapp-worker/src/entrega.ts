/**
 * Confirmação de entrega. `sendMessage` devolve assim que a mensagem sai do socket (status 1,
 * pendente): isso NÃO prova que o WhatsApp a aceitou. Só tratamos como enviada quando chega um
 * status >= 2 (servidor/entregue/lida) para o id, dentro de um tempo limite.
 */

/** Espelha proto.WebMessageInfo.Status (0 erro, 1 pendente, 2 servidor, 3 entregue, 4 lida, 5 reproduzida). */
export const STATUS_ERRO = 0;
export const STATUS_SERVIDOR = 2;

export class SemConfirmacaoError extends Error {
  constructor() {
    super("O WhatsApp não confirmou o envio a tempo.");
    this.name = "SemConfirmacaoError";
  }
}

export class EntregaFalhouError extends Error {
  constructor() {
    super("O WhatsApp recusou o envio.");
    this.name = "EntregaFalhouError";
  }
}

type Espera = { resolver: () => void; rejeitar: (erro: Error) => void; timer: NodeJS.Timeout };

export class ConfirmacaoEntrega {
  private readonly vistos = new Map<string, number>();
  private readonly esperas = new Map<string, Espera>();

  constructor(private readonly limiteVistos = 500) {}

  /** Chamado a cada `messages.update`. O evento pode chegar antes de alguém aguardar o id. */
  registrar(id: string, status: number): void {
    const anterior = this.vistos.get(id) ?? -1;
    if (status > anterior || status === STATUS_ERRO) {
      this.vistos.delete(id);
      this.vistos.set(id, status);
      if (this.vistos.size > this.limiteVistos) {
        const maisAntigo = this.vistos.keys().next().value;
        if (maisAntigo !== undefined) this.vistos.delete(maisAntigo);
      }
    }
    const espera = this.esperas.get(id);
    if (!espera) return;
    if (status === STATUS_ERRO) this.concluir(id, espera, new EntregaFalhouError());
    else if (status >= STATUS_SERVIDOR) this.concluir(id, espera);
  }

  /** Resolve quando o id chegar a status >= 2; rejeita em erro (0) ou ao estourar o tempo. */
  aguardar(id: string, timeoutMs: number): Promise<void> {
    const visto = this.vistos.get(id);
    if (visto === STATUS_ERRO) return Promise.reject(new EntregaFalhouError());
    if (visto !== undefined && visto >= STATUS_SERVIDOR) return Promise.resolve();
    return new Promise<void>((resolver, rejeitar) => {
      const timer = setTimeout(() => {
        this.esperas.delete(id);
        rejeitar(new SemConfirmacaoError());
      }, timeoutMs);
      this.esperas.set(id, { resolver, rejeitar, timer });
    });
  }

  private concluir(id: string, espera: Espera, erro?: Error): void {
    clearTimeout(espera.timer);
    this.esperas.delete(id);
    if (erro) espera.rejeitar(erro);
    else espera.resolver();
  }
}
