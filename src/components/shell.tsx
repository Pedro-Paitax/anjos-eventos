"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { trocarUsuario } from "@/app/actions/usuario";
import { Botao } from "@/components/botao";
import { IndicadorWhatsapp } from "@/components/indicador-whatsapp";

// Links fixos, visíveis de qualquer tela (exceto /login). Novos itens
// globais entram aqui. `prefixos` marca o item como ativo nas telas filhas;
// o hub Senhor Churrasco agrupa Preparos, Insumos, Cardápios Feitos e Simulador.
const links = [
  {
    href: "/",
    rotulo: "Início",
    prefixos: [] as string[],
    icone: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  },
  {
    href: "/agenda",
    rotulo: "Agenda",
    prefixos: ["/agenda"],
    icone: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4",
  },
  {
    href: "/senhor-churrasco",
    rotulo: "Senhor Churrasco",
    prefixos: ["/senhor-churrasco", "/preparos", "/insumos", "/cardapios-modelo", "/simulador-cardapio"],
    icone: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  },
  {
    href: "/colaboradores",
    rotulo: "Colaboradores",
    prefixos: ["/colaboradores"],
    icone: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5 M16 5.5a3 3 0 0 1 0 5.5 M18 15c2 .6 3 2.2 3 5",
  },
];

// O shell dá o espaçamento e o fundo do conteúdo (o <main> da página não tem px/py).
// Única exceção: a Ficha Técnica, que é uma folha branca com o próprio espaçamento e impressão.
function telaComMiolo(pathname: string) {
  return !pathname.endsWith("/fichas-tecnicas");
}

function estaAtivo(pathname: string, link: (typeof links)[number]) {
  if (link.href === "/") return pathname === "/";
  return link.prefixos.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Mesmo ponto de troca do token `rail` (globals.css, --breakpoint-rail).
const CONSULTA_RAIL = "(min-width: 900px)";

function assinarRail(aoMudar: () => void) {
  const mq = window.matchMedia(CONSULTA_RAIL);
  mq.addEventListener("change", aoMudar);
  return () => mq.removeEventListener("change", aoMudar);
}

/** null no servidor e na hidratação (ainda não se sabe qual bloco está visível). */
function useRailVisivel(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    assinarRail,
    () => window.matchMedia(CONSULTA_RAIL).matches,
    () => null
  );
}

function Icone({ caminho }: { caminho: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d={caminho} />
    </svg>
  );
}

function Marca() {
  return (
    <Link
      href="/"
      className="shell-item inline-flex min-h-11 items-center gap-2.5 rounded-controle px-2.5 font-titulo text-xl font-bold leading-none tracking-tight text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffc089,var(--color-brasa)_60%)] shadow-[0_0_16px_2px_rgb(242_117_63/0.55)]"
      />
      Anjos Eventos
    </Link>
  );
}

function TrocarUsuario({ curto = false }: { curto?: boolean }) {
  return (
    <form action={trocarUsuario}>
      <Botao type="submit" variante="link" tamanho="sm">
        {curto ? (
          <>
            Trocar<span className="sr-only">&nbsp;usuário</span>
          </>
        ) : (
          "Trocar usuário"
        )}
      </Botao>
    </form>
  );
}

export function Shell({ nomeUsuario, children }: { nomeUsuario?: string; children: ReactNode }) {
  const pathname = usePathname();
  const railVisivel = useRailVisivel();
  if (pathname === "/login") return <>{children}</>;
  const miolo = telaComMiolo(pathname);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-controle focus:bg-texto focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-fundo focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-foco"
      >
        Ir para o conteúdo
      </a>
      <div className="flex flex-1 flex-col rail:grid rail:grid-cols-[248px_minmax(0,1fr)] print:block">
        {/* Menu lateral (>= 900 px). Hidden no celular: fora do foco e do leitor de tela. */}
        <aside className="sticky top-0 hidden h-dvh font-texto flex-col gap-7 border-r border-borda bg-gradient-to-b from-menu to-fundo px-3.5 py-5 rail:flex print:hidden">
          <Marca />
          <nav aria-label="Navegação principal" className="flex flex-col gap-1">
            {links.map((link) => {
              const ativo = estaAtivo(pathname, link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={ativo ? "page" : undefined}
                  className={`shell-item flex min-h-11 items-center gap-3 rounded-controle px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco ${
                    ativo ? "bg-brasa/[0.16] text-texto" : "text-texto-suave hover:bg-white/[0.06] hover:text-texto"
                  }`}
                >
                  <span className={ativo ? "text-brasa" : ""}>
                    <Icone caminho={link.icone} />
                  </span>
                  {link.rotulo}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            {railVisivel === true && <IndicadorWhatsapp comTexto />}
            <div className="flex flex-col gap-0.5 rounded-linha border border-borda bg-superficie p-3">
              {nomeUsuario && (
                <p className="truncate font-semibold text-texto" title={nomeUsuario}>
                  {nomeUsuario}
                </p>
              )}
              <TrocarUsuario />
            </div>
          </div>
        </aside>

        {/* Topo (< 900 px): marca, usuário e WhatsApp. */}
        <header className="flex h-[60px] items-center bg-fundo font-texto justify-between gap-3 border-b border-borda pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] rail:hidden print:hidden">
          <Marca />
          <div className="flex min-w-0 items-center gap-2">
            {nomeUsuario && (
              <span className="max-w-[7rem] truncate text-sm font-medium text-texto" title={nomeUsuario}>
                {nomeUsuario}
              </span>
            )}
            <TrocarUsuario curto />
            {railVisivel === false && <IndicadorWhatsapp />}
          </div>
        </header>

        {/* Destino do skip link. A fonte do conteúdo NÃO é do shell (a Ficha depende do Archivo do body). */}
        {/* A base livra a barra de abas (64 px + área segura). */}
        <div
          id="conteudo"
          tabIndex={-1}
          className={`flex min-w-0 flex-1 flex-col outline-none print:pb-0 ${
            miolo
              ? "bg-fundo px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 font-texto text-texto rail:px-12 rail:pb-[120px] rail:pt-11"
              : "pb-[calc(4rem+env(safe-area-inset-bottom))] rail:pb-0"
          }`}
        >
          {children}
        </div>

        {/* Barra de abas (< 900 px). Some por CSS com campo de texto em foco (globals.css). */}
        <nav
          aria-label="Navegação principal"
          className="barra-abas font-texto fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-borda-forte bg-superficie pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] rail:hidden print:hidden"
        >
          {links.map((link) => {
            const ativo = estaAtivo(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={ativo ? "page" : undefined}
                className={`shell-item relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 py-1.5 text-center text-xs font-medium leading-[1.15] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foco ${
                  ativo ? "text-texto" : "text-texto-suave"
                }`}
              >
                {ativo && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[28%] top-0 h-[3px] rounded-b-[3px] bg-brasa"
                  />
                )}
                <span className={ativo ? "text-brasa" : ""}>
                  <Icone caminho={link.icone} />
                </span>
                {link.rotulo}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
