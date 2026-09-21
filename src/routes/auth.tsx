import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  // Render the public login form immediately; only session detection needs the browser.
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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    try {
      const session = await signInWithIdentifier({ data: { identifier, password } });
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });
      if (sessionError) throw sessionError;
      navigate({ to: "/admin", replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-card">
        <img src="/hemle-logo.png" alt="HEMLÉ" className="mx-auto h-12 w-auto" />
        <h1 className="mt-6 text-center font-display text-2xl font-bold">Espace équipe</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Accès réservé à l'équipe éditoriale HEMLÉ.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier">Identifiant</Label>
            <Input
              id="identifier"
              autoComplete="username"
              required
              minLength={3}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toLowerCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
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
