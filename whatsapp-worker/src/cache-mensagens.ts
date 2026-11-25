/**
 * Guarda as mensagens enviadas para o `getMessage` do Baileys. Quando o destinatário não consegue
 * decifrar (aparece "Aguardando mensagem"), o WhatsApp pede o reenvio e o Baileys precisa do
 * conteúdo original: sem isso o reenvio falha e a mensagem nunca chega.
 * Só em memória (some ao reiniciar o worker), limitada em quantidade e em idade.
 */
export class CacheMensagens<T> {
  private readonly itens = new Map<string, { valor: T; em: number }>();

  constructor(
    private readonly maximo = 1000,
    private readonly ttlMs = 24 * 60 * 60 * 1000,
    private readonly agora: () => number = Date.now,
  ) {}

  get tamanho(): number {
    return this.itens.size;
  }

  guardar(id: string, valor: T): void {
    this.itens.delete(id);
    this.itens.set(id, { valor, em: this.agora() });
    while (this.itens.size > this.maximo) {
      const maisAntigo = this.itens.keys().next().value;
      if (maisAntigo === undefined) break;
      this.itens.delete(maisAntigo);
    }
  }

  obter(id: string): T | undefined {
    const item = this.itens.get(id);
    if (!item) return undefined;
    if (this.agora() - item.em > this.ttlMs) {
      this.itens.delete(id);
      return undefined;
    }
    return item.valor;
  }
}
