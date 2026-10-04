import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavegacaoPrincipal } from "@/components/navegacao-principal";
import { obterUsuarioAtual } from "@/lib/usuario-atual";

// Fontes locais (src/app/fonts/): o build não depende de rede. Fraunces e Archivo
// são as fontes antigas, as mesmas variáveis (100-900) que o build com Google Fonts gerava (só o recorte latino);
// a Ficha Técnica depende delas, então os nomes --font-fraunces/--font-archivo ficam.
const fraunces = localFont({
  variable: "--font-fraunces",
  src: [
    { path: "./fonts/fraunces-latin-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/fraunces-latin-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const archivo = localFont({
  variable: "--font-archivo",
  src: [{ path: "./fonts/archivo-latin-normal.woff2", weight: "100 900", style: "normal" }],
});

// Fontes do redesign (direção Brasa). Ainda sem uso: sem preload até a Etapa 2.
const bricolage = localFont({
  variable: "--font-bricolage",
  preload: false,
  src: [
    { path: "./fonts/bricolage-grotesque-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/bricolage-grotesque-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const instrument = localFont({
  variable: "--font-instrument",
  preload: false,
  src: [
    { path: "./fonts/instrument-sans-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-sans-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/instrument-sans-600-normal.woff2", weight: "600", style: "normal" },
  ],
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
      className={`${fraunces.variable} ${archivo.variable} ${bricolage.variable} ${instrument.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-ink text-paper antialiased">
        <NavegacaoPrincipal nomeUsuario={usuario?.nome} />
        {children}
      </body>
    </html>
  );
}
