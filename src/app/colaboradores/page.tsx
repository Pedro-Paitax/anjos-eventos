import Link from "next/link";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/usuario-atual";
import { listarColaboradores } from "@/lib/colaboradores";
import { ROTULOS_FUNCAO } from "@/lib/colaboradores-opcoes";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { botaoClasse } from "@/components/botao";
import type { Metadata } from "next";
import { Vazio } from "@/components/vazio";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function ColaboradoresPage() {
  const usuarioAtual = await obterUsuarioAtual();
  if (!usuarioAtual) {
    redirect("/login");
  }

  const colaboradores = await listarColaboradores();

  return (
    <main className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8">
      <CabecalhoPagina
        titulo="Colaboradores"
        subtitulo="Copeiras, assadores e garçons da equipe."
        voltarPara={{ href: "/", rotulo: "← Início" }}
        acao={
          <Link
            href="/colaboradores/novo"
            className={botaoClasse()}
          >
            Novo colaborador
          </Link>
        }
      />

      <div className="overflow-hidden rounded-cartao border border-borda bg-superficie shadow-realce">
        {colaboradores.length === 0 ? (
          <Vazio
            acao={
              <Link href="/colaboradores/novo" className={botaoClasse()}>
                Novo colaborador
              </Link>
            }
          >
            Nenhum colaborador cadastrado.
          </Vazio>
        ) : (
          <ul className="divide-y divide-borda">
            {colaboradores.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className={c.ativo ? "" : "opacity-50"}>
                  <p className="text-[17px] font-semibold">{c.nome}</p>
                  <p className="text-sm text-texto-suave">
                    {ROTULOS_FUNCAO[c.funcao]} · {c.telefone_whatsapp ?? "sem WhatsApp"}
                    {c.ativo ? "" : " · inativo"}
                  </p>
                </div>
                <Link
                  href={`/colaboradores/${c.id}`}
                  aria-label={`Editar ${c.nome}`}
                  className={botaoClasse("link", "sm")}
                >
                  Editar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
