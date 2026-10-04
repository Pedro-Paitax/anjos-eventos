import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarEventosProximos } from "@/lib/eventos";
import { listarEmpresas } from "@/lib/empresas";
import { itensPendenciaPorEvento } from "@/lib/decisoes-operacionais";
import { listarColaboradoresAtivos } from "@/lib/colaboradores";
import type { AtivosPorFuncao } from "@/lib/pendencias-evento";
import { diasAteEvento, formatarHora, partesDataEvento } from "@/lib/formatacao";
import { HomeConteudo, type EventoHome, type PendenciaHome } from "@/components/home-conteudo";

const DIAS_PROXIMOS_EVENTOS = 15;

export default async function Home() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const eventosProximos = await listarEventosProximos(DIAS_PROXIMOS_EVENTOS);
  const pendencias = await itensPendenciaPorEvento(eventosProximos.map((e) => e.id));
  const temPendencia = [...pendencias.values()].some((l) => l.length > 0);
  const ativosPorFuncao: AtivosPorFuncao = { copeira: 0, assador: 0, garcom: 0 };
  if (temPendencia) {
    for (const c of await listarColaboradoresAtivos()) ativosPorFuncao[c.funcao] += 1;
  }
  // Atalhos "Novo orçamento": uma empresa por atalho (mesma consulta de /agenda/novo).
  const empresas = await listarEmpresas();

  const agora = new Date();
  const eventos: EventoHome[] = eventosProximos.map((e) => ({
    id: e.id,
    cliente: e.cliente,
    empresaNome: e.empresa_nome,
    tipo: e.tipo_evento,
    status: e.status,
    ...partesDataEvento(e.data_evento),
    hora: formatarHora(e.data_evento),
    emDias: diasAteEvento(e.data_evento, agora),
  }));
  const comPendencia: PendenciaHome[] = eventos
    .map((evento) => ({ evento, itens: pendencias.get(evento.id) ?? [] }))
    .filter((p) => p.itens.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-pagina flex-col gap-10">
      <HomeConteudo
        nome={usuarioAtual.nome}
        dias={DIAS_PROXIMOS_EVENTOS}
        eventos={eventos}
        pendencias={comPendencia}
        empresas={empresas}
        ativosPorFuncao={ativosPorFuncao}
      />
    </main>
  );
}
