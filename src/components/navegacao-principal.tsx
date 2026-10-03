"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trocarUsuario } from "@/app/actions/usuario";
import { Botao } from "@/components/botao";
import { IndicadorWhatsapp } from "@/components/indicador-whatsapp";

// Links fixos, visíveis de qualquer tela (exceto /login). Novos itens
// globais entram aqui. `prefixos` marca o item como ativo nas telas filhas;
// o hub Senhor Churrasco agrupa Preparos, Insumos, Cardápios Feitos e Simulador.
const links = [
  { href: "/", rotulo: "Início", prefixos: [] as string[] },
  { href: "/agenda", rotulo: "Agenda", prefixos: ["/agenda"] },
  {
    href: "/senhor-churrasco",
    rotulo: "Senhor Churrasco",
    prefixos: ["/senhor-churrasco", "/preparos", "/insumos", "/cardapios-modelo", "/simulador-cardapio"],
  },
  { href: "/colaboradores", rotulo: "Colaboradores", prefixos: ["/colaboradores"] },
];

function estaAtivo(pathname: string, link: (typeof links)[number]) {
  if (link.href === "/") return pathname === "/";
  return link.prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function NavegacaoPrincipal({ nomeUsuario }: { nomeUsuario?: string }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-[2px] focus:bg-paper focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper-ink focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-paper-ink"
      >
        Ir para o conteúdo
      </a>
      <header className="border-b border-paper-dim/15 px-4 py-1 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-4 sm:gap-x-2 lg:gap-x-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-display text-lg italic text-brass transition hover:text-paper"
          >
            Anjos Eventos
          </Link>

          <nav
            aria-label="Navegação principal"
            className="-mx-2 order-3 flex w-full overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto sm:flex-1 sm:justify-center"
          >
            {links.map((link) => {
              const ativo = estaAtivo(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center px-2.5 text-sm transition hover:text-paper sm:px-2 lg:px-2.5 ${
                    ativo
                      ? "text-paper shadow-[inset_0_-2px_0_0_var(--color-brass)]"
                      : "text-paper-dim"
                  }`}
                >
                  {link.rotulo}
                </Link>
              );
            })}
          </nav>

          <div className="order-2 flex items-center gap-2 sm:order-3">
            {nomeUsuario && (
              <span className="max-w-[4.5rem] truncate text-sm text-paper sm:max-w-[6rem] lg:max-w-[10rem]" title={nomeUsuario}>
                {nomeUsuario}
              </span>
            )}
            <form action={trocarUsuario}>
              <Botao type="submit" variante="link" tamanho="sm">
                Trocar<span className="sr-only sm:not-sr-only">&nbsp;usuário</span>
              </Botao>
            </form>
            <IndicadorWhatsapp />
          </div>
        </div>
      </header>
      {/* Destino do skip link: o foco cai aqui e o próximo Tab segue para o conteúdo. */}
      <div id="conteudo" tabIndex={-1} className="outline-none" />
    </>
  );
}
