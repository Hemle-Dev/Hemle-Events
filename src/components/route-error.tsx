export function RouteError() {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Contenu temporairement indisponible</h1>
      <p className="max-w-md text-muted-foreground">
        La connexion au service n’a pas abouti. Réessayez dans quelques instants.
      </p>
      <button
        className="rounded-md bg-primary px-5 py-3 text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Réessayer
      </button>
      <a href="/" className="underline underline-offset-4">
        Retour à l’accueil
      </a>
    </main>
  );
}
