import "server-only";

// Rate limit simples em memória, por IP. Suficiente pro estágio atual do
// projeto (um único container/instância — ver docker-compose.yml). Se o
// app rodar em múltiplas instâncias no futuro, isso precisa virar um
// contador compartilhado (ex.: Redis) — não é o caso hoje.
const janelas = new Map<string, { contagem: number; expiraEm: number }>();

export type ResultadoRateLimit = { permitido: true } | { permitido: false; retryAfterSegundos: number };

/**
 * Limite fixo por janela de tempo. `chave` normalmente é o IP do cliente.
 */
export function verificarRateLimit(
  chave: string,
  limite: number,
  janelaMs: number
): ResultadoRateLimit {
  const agora = Date.now();
  const atual = janelas.get(chave);

  if (!atual || atual.expiraEm <= agora) {
    janelas.set(chave, { contagem: 1, expiraEm: agora + janelaMs });
    return { permitido: true };
  }

  if (atual.contagem >= limite) {
    return { permitido: false, retryAfterSegundos: Math.ceil((atual.expiraEm - agora) / 1000) };
  }

  atual.contagem += 1;
  return { permitido: true };
}

/**
 * Extrai o IP do cliente a partir dos headers de proxy usuais. Sem um
 * proxy configurado na frente (ver docs/ARQUITETURA.MD), pode não vir
 * nenhum header — nesse caso o limite acaba sendo efetivamente global
 * (todas as chamadas caem na mesma chave), degradação aceitável em vez
 * de travar o rate limit inteiro.
 */
export function obterIpCliente(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();

  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();

  return "desconhecido";
}
