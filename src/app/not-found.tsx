import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="venue-glow flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-sm italic text-brass">Anjos Eventos</p>
        <h1 className="font-display text-4xl italic text-paper">Página não encontrada</h1>
        <p className="max-w-sm text-sm text-paper-dim">
          O endereço não existe ou o registro foi removido.
        </p>
        <Link
          href="/"
          className="rounded-[2px] border border-paper-dim/30 px-4 py-2 text-sm text-paper transition hover:border-paper-dim hover:bg-paper/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
