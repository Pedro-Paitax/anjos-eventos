"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Links fixos, visíveis de qualquer tela (exceto /login). Novos itens
// globais entram aqui.
const links = [{ href: "/colaboradores", rotulo: "Colaboradores" }];

export function NavegacaoPrincipal() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-paper-dim/15 px-6 py-3 print:hidden">
      <Link
        href="/"
        className="font-display text-sm italic text-brass transition hover:text-paper"
      >
        Anjos Eventos
      </Link>
      <nav aria-label="Navegação principal" className="flex items-center gap-4">
        {links.map((link) => {
          const ativo = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={ativo ? "page" : undefined}
              className={`text-sm underline-offset-4 transition hover:text-paper hover:underline ${
                ativo ? "text-paper underline" : "text-paper-dim"
              }`}
            >
              {link.rotulo}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
