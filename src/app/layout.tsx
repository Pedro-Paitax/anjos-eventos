import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";

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
  title: "Anjos Eventos",
  description:
    "Central de Eventos — Buffet Senhor Churrasco, Anjos Cerimonial, Em Plena Natureza",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${archivo.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-ink text-paper antialiased">
        {children}
      </body>
    </html>
  );
}
