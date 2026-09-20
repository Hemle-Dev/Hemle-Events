import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { fetchAdminEvents, fetchAdminStats } from "@/lib/admin";
import { EVENT_STATUS_LABELS, formatEventDates } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: fetchAdminStats });
  const recents = useQuery({
    queryKey: ["admin", "events", "recents"],
    queryFn: () => fetchAdminEvents(),
  });

  const cards = [
    { label: "Publiés", value: stats.data?.counts["publie"] ?? 0 },
    { label: "À venir", value: stats.data?.aVenir ?? 0 },
    { label: "Programmés", value: stats.data?.counts["programme"] ?? 0 },
    { label: "Brouillons", value: stats.data?.counts["brouillon"] ?? 0 },
    { label: "Suspendus", value: stats.data?.counts["suspendu"] ?? 0 },
    { label: "Archivés", value: stats.data?.counts["archive"] ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-2xl font-bold">Tableau de bord</h1>
        <Button asChild className="ml-auto">
          <Link to="/admin/evenements/$id" params={{ id: "nouveau" }}>
            Nouvel événement
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 font-display text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-lg font-bold">Derniers événements</h2>
          <Link to="/admin/evenements" className="text-sm text-primary hover:underline">
            Tout voir
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {(recents.data ?? []).slice(0, 8).map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Link
                to="/admin/evenements/$id"
                params={{ id: event.id }}
                className="font-medium hover:underline"
              >
                {event.titre}
              </Link>
              <span className="text-sm text-muted-foreground">
                {formatEventDates(event)} · {event.ville}
              </span>
              <span className="ml-auto rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {EVENT_STATUS_LABELS[event.statut]}
              </span>
            </li>
          ))}
          {recents.isLoading ? (
            <li className="px-5 py-4 text-sm text-muted-foreground">Chargement…</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
