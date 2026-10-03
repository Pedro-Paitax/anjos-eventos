// Esqueleto genérico (sem título nem texto de conteúdo): rotas protegidas sem
// sessão respondem com este shell + NEXT_REDIRECT, e o smoke test do deploy
// falha se houver <h1> aqui. Não adicionar <h1>.
export default function Carregando() {
  return (
    <main
      aria-busy="true"
      className="sem-enter venue-glow flex flex-1 flex-col items-center px-4 py-6 sm:px-6 sm:py-16"
    >
      <p role="status" className="sr-only">
        Carregando…
      </p>
      <div aria-hidden className="flex w-full max-w-2xl flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 rounded-[2px] bg-paper-dim/10 motion-safe:animate-pulse" />
          <div className="h-9 w-2/3 rounded-[2px] bg-paper-dim/10 motion-safe:animate-pulse" />
        </div>
        <div className="flex flex-col gap-px overflow-hidden rounded-[2px] bg-paper-dim/10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 bg-ink-soft motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
