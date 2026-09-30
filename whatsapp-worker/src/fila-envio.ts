/**
 * Fila estritamente sequencial: uma tarefa por vez, com intervalo mínimo
 * entre o fim de um envio e o início do próximo. Nunca dispara envios em
 * paralelo (rajadas aceleram a detecção de automação pelo WhatsApp).
 */
export class FilaEnvio {
  private cauda: Promise<unknown> = Promise.resolve();
  private ultimoFim: number | null = null;
  private pendentes = 0;

  constructor(
    private readonly atrasoMs: number,
    private readonly limitePendentes = 50,
    private readonly dormir: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly agora: () => number = Date.now,
  ) {}

  get tamanho(): number {
    return this.pendentes;
  }

  enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    if (this.pendentes >= this.limitePendentes) {
      return Promise.reject(new Error("Fila de envio cheia."));
    }
    this.pendentes++;
    const execucao = this.cauda.then(async () => {
      try {
        if (this.ultimoFim !== null) {
          const espera = this.atrasoMs - (this.agora() - this.ultimoFim);
          if (espera > 0) await this.dormir(espera);
        }
        return await tarefa();
      } finally {
        this.ultimoFim = this.agora();
        this.pendentes--;
      }
    });
    this.cauda = execucao.catch(() => undefined);
    return execucao;
  }
}
