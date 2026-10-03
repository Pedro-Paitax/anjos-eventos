import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";
import { NavegacaoPrincipal } from "@/components/navegacao-principal";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Anjos Eventos", template: "%s · Anjos Eventos" },
  description:
    "Central de Eventos — Buffet Senhor Churrasco, Anjos Cerimonial, Em Plena Natureza",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Só para exibir o nome no header; a proteção das páginas continua em cada página.
  const usuario = await obterUsuarioAtual().catch(() => null);
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${archivo.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-ink text-paper antialiased">
        <NavegacaoPrincipal nomeUsuario={usuario?.nome} />
        {children}
      </body>
    </html>
  );
}
