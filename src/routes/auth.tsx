import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import logo from "@/assets/hemle-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Espace équipe — HEMLÉ Events" },
      { name: "description", content: "Connexion réservée à l'équipe éditoriale de HEMLÉ Events." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Espace équipe — HEMLÉ Events" },
      { property: "og:description", content: "Connexion réservée à l'équipe éditoriale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError("Identifiants incorrects ou compte inactif.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <img src={logo.url} alt="HEMLÉ" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-center font-display text-2xl font-bold">Espace équipe</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Accès réservé à l'équipe éditoriale HEMLÉ.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:underline">
            Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
