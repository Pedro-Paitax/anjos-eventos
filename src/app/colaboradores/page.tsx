import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarColaboradores } from "@/lib/colaboradores";
import { ROTULOS_FUNCAO } from "@/lib/colaboradores-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";

export default async function ColaboradoresPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const colaboradores = await listarColaboradores();

  return (
    <main className="venue-glow flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <CabecalhoPagina
          titulo="Colaboradores"
          subtitulo="Copeiras, assadores e garçons da equipe."
          voltarPara={{ href: "/", rotulo: "← Início" }}
          acao={
            <Link
              href="/colaboradores/novo"
              className="rounded-[2px] bg-ember px-4 py-2 text-sm font-medium text-paper transition hover:brightness-110"
            >
              Novo colaborador
            </Link>
          }
        />

        <div className="rounded-[2px] bg-paper text-paper-ink shadow-[0_20px_40px_-20px_rgba(0,0,0,0.6)]">
          {colaboradores.length === 0 ? (
            <p className="px-6 py-8 text-sm text-paper-ink/70">
              Nenhum colaborador cadastrado.
            </p>
          ) : (
            <ul className="divide-y divide-paper-ink/10">
              {colaboradores.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className={c.ativo ? "" : "opacity-50"}>
                    <p className="font-display text-lg italic">{c.nome}</p>
                    <p className="text-sm text-paper-ink/70">
                      {ROTULOS_FUNCAO[c.funcao]} · {c.telefone_whatsapp ?? "sem WhatsApp"}
                      {c.ativo ? "" : " · inativo"}
                    </p>
                  </div>
                  <Link
                    href={`/colaboradores/${c.id}`}
                    className="text-sm underline decoration-paper-ink/30 underline-offset-4 transition hover:decoration-paper-ink"
                  >
                    Editar
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
