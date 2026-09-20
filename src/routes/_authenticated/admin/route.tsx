import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyAccess } from "@/lib/admin";
import { ROLE_LABELS, type AppRole } from "@/lib/events";

const ADMIN_LINKS = [
  {
    to: "/admin",
    label: "Tableau de bord",
    exact: true,
    roles: ["administrateur", "editeur", "moderateur"],
  },
  {
    to: "/admin/evenements",
    label: "Événements",
    exact: false,
    roles: ["administrateur", "editeur", "moderateur"],
  },
  {
    to: "/admin/categories",
    label: "Catégories",
    exact: false,
    roles: ["administrateur", "editeur"],
  },
  { to: "/admin/equipe", label: "Équipe", exact: false, roles: ["administrateur"] },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<{
    identifier: string | null;
    roles: AppRole[];
    actif: boolean;
    ready: boolean;
  }>({ identifier: null, roles: [], actif: false, ready: false });

  useEffect(() => {
    fetchMyAccess().then(({ user, profile, roles }) => {
      setAccess({
        identifier: profile?.identifiant ?? null,
        roles,
        actif: profile?.actif ?? false,
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
      <a
        href="#admin-content"
        className="sr-only z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <header className="border-b border-border bg-card">
        <div className="container-page flex flex-wrap items-center gap-4 py-4">
          <Link to="/admin" className="flex items-center gap-3">
            <img src="/hemle-logo.png" alt="HEMLÉ" className="h-9 w-auto" />
            <span className="font-display text-lg font-bold">Espace équipe</span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {ADMIN_LINKS.filter((link) =>
              link.roles.some((role) => access.roles.includes(role)),
            ).map((link) => (
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
              {access.identifier}
              {access.roles.length
                ? ` · ${access.roles.map((r) => ROLE_LABELS[r]).join(", ")}`
                : ""}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Se déconnecter
            </Button>
          </div>
        </div>
      </header>

      <main id="admin-content" tabIndex={-1} className="container-page py-8">
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
