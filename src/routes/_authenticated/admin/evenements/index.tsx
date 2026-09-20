import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteEvent, fetchAdminEvents, fetchMyAccess, setEventStatus } from "@/lib/admin";
import { EVENT_STATUS_LABELS, formatEventDates, type EventStatus } from "@/lib/events";

export const Route = createFileRoute("/_authenticated/admin/evenements/")({
  component: AdminEvents,
});

const STATUS_OPTIONS: (EventStatus | "tous")[] = [
  "tous",
  "brouillon",
  "programme",
  "publie",
  "suspendu",
  "archive",
];

function AdminEvents() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState<EventStatus | "tous">("tous");

  const events = useQuery({
    queryKey: ["admin", "events", q, statut],
    queryFn: () => fetchAdminEvents({ q, statut }),
  });
  const access = useQuery({ queryKey: ["admin", "my-access"], queryFn: fetchMyAccess });
  const isAdmin = access.data?.roles.includes("administrateur") ?? false;
  const canCreate = access.data?.roles.some(
    (role) => role === "administrateur" || role === "editeur",
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: EventStatus }) => setEventStatus(id, next),
    onSuccess: () => {
      toast.success("Statut mis à jour");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      toast.success("Événement supprimé");
      invalidate();
    },
    onError: () => toast.error("Suppression réservée aux administrateurs."),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Événements</h1>
        {canCreate ? (
          <Button asChild className="ml-auto">
            <Link to="/admin/evenements/$id" params={{ id: "nouveau" }}>
              Nouvel événement
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Rechercher un titre, une ville…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={statut} onValueChange={(value) => setStatut(value as EventStatus | "tous")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "tous" ? "Tous les statuts" : EVENT_STATUS_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {events.isLoading ? (
            <li className="px-5 py-4 text-sm text-muted-foreground">Chargement…</li>
          ) : null}
          {(events.data ?? []).map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-56">
                <Link
                  to="/admin/evenements/$id"
                  params={{ id: event.id }}
                  className="font-medium hover:underline"
                >
                  {event.titre}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatEventDates(event)} · {event.ville}, {event.pays}
                </p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">
                {EVENT_STATUS_LABELS[event.statut]}
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                {event.statut !== "publie" ? (
                  <Button
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: event.id, next: "publie" })}
                  >
                    Publier
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => statusMutation.mutate({ id: event.id, next: "suspendu" })}
                  >
                    Suspendre
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => statusMutation.mutate({ id: event.id, next: "archive" })}
                >
                  Archiver
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/evenements/$slug" params={{ slug: event.slug }} target="_blank">
                    Aperçu
                  </Link>
                </Button>
                {isAdmin ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Supprimer « ${event.titre} » ?`))
                        deleteMutation.mutate(event.id);
                    }}
                  >
                    Supprimer
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {!events.isLoading && (events.data ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">
              Aucun événement pour ces critères.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
