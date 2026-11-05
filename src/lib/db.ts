import { Pool } from "pg";

declare global {
  var _pgPool: Pool | undefined;
}

// connectionTimeoutMillis: sem isso, um banco que não responde (túnel/Tailscale fora)
// deixa pool.connect() pendurado para sempre, e o layout (que consulta o usuário em toda
// página) travaria a tela inteira. 5 s: bem acima da latência normal (dezenas de ms) e
// curto o bastante para o layout cair no .catch e mostrar a página. Só vale para obter a
// conexão; não limita a duração de uma query já em andamento.
export const pool =
  global._pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });

if (process.env.NODE_ENV !== "production") {
  global._pgPool = pool;
}
