import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import logo from "@/assets/hemle-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyAccess } from "@/lib/admin";
import { ROLE_LABELS, type AppRole } from "@/lib/events";

const ADMIN_LINKS = [
  { to: "/admin", label: "Tableau de bord", exact: true },
  { to: "/admin/evenements", label: "Événements", exact: false },
  { to: "/admin/categories", label: "Catégories", exact: false },
  { to: "/admin/equipe", label: "Équipe", exact: false },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<{
    email: string | null;
    roles: AppRole[];
    actif: boolean;
    ready: boolean;
  }>({ email: null, roles: [], actif: true, ready: false });

  useEffect(() => {
    fetchMyAccess().then(({ user, profile, roles }) => {
      setAccess({
        email: profile?.email ?? user?.email ?? null,
        roles,
        actif: profile?.actif ?? true,
        ready: true,
      });
    });
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isStaff = access.roles.length > 0 && access.actif;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <Link to="/admin" className="flex items-center gap-3">
            <img src={logo.url} alt="HEMLÉ" className="h-9 w-auto" />
            <span className="font-display text-lg font-bold">Espace équipe</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                activeOptions={{ exact: link.exact }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="rounded-full px-3 py-1.5 font-medium text-muted-foreground hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span className="hidden sm:inline">
              {access.email}
              {access.roles.length ? ` · ${access.roles.map((r) => ROLE_LABELS[r]).join(", ")}` : ""}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      <main className="container-page py-8">
        {!access.ready ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : isStaff ? (
          <Outlet />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h1 className="font-display text-xl font-bold">Accès non autorisé</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre compte n'a pas de rôle actif sur HEMLÉ Events. Contactez un administrateur.
            </p>
            <Button className="mt-6" variant="outline" onClick={signOut}>
              Se déconnecter
            </Button>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
