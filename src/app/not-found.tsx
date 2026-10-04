import Link from "next/link";
import { botaoClasse } from "@/components/botao";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-texto-suave">Anjos Eventos</p>
        <h1 className="font-titulo text-[clamp(30px,4vw,42px)] font-bold leading-[1.05] tracking-[-0.025em]">Página não encontrada</h1>
        <p className="max-w-sm text-texto-suave">
          O endereço não existe ou o registro foi removido.
        </p>
        <Link
          href="/"
          className={botaoClasse("secundario")}
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
