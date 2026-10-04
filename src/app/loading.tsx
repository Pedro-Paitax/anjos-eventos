// Esqueleto genérico (sem título nem texto de conteúdo): rotas protegidas sem
// sessão respondem com este shell + NEXT_REDIRECT, e o smoke test do deploy
// falha se houver <h1> aqui. Não adicionar <h1>.
// O espaçamento (px/py) é do shell; este <main> só limita a largura.
export default function Carregando() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-pagina-documento flex-col gap-8"
    >
      <p role="status" className="sr-only">
        Carregando…
      </p>
      <div aria-hidden className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-24 rounded-chip bg-elevada motion-safe:animate-pulse" />
          <div className="h-9 w-2/3 rounded-chip bg-elevada motion-safe:animate-pulse" />
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-linha bg-superficie motion-safe:animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
