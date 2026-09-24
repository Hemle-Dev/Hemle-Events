import { Link } from "@tanstack/react-router";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { audienceLabel } from "@/lib/event-audience";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventDates, formatShortDay, type EventWithCategory } from "@/lib/events";

export function EventCard({ event }: { event: EventWithCategory }) {
  const short = formatShortDay(event.date_debut);

  return (
    <article className="card-lift group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={event.image_alt ?? event.titre}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : null}
        <div className="absolute left-4 top-4 rounded-xl bg-background/95 px-3 py-2 text-center shadow-card">
          <span className="block font-display text-lg font-bold leading-none text-foreground">
            {short.day}
          </span>
          <span className="block text-[0.65rem] uppercase tracking-widest text-muted-foreground">
            {short.month}
          </span>
        </div>
        {event.categories ? (
          <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground">
            {event.categories.nom}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-3 p-5">
        {event.audience ? <Badge variant="secondary">{audienceLabel(event.audience)}</Badge> : null}
        <h3 className="text-balance-tight font-display text-lg font-semibold leading-snug">
          <Link
            to="/evenements/$slug"
            params={{ slug: event.slug }}
            className="after:absolute after:inset-0 hover:text-primary"
          >
            {event.titre}
          </Link>
        </h3>
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {formatEventDates(event)}
        </p>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          {event.ville}, {event.pays}
        </p>
      </div>
    </article>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function EventGrid({ events }: { events: EventWithCategory[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Aucun événement ne correspond à votre recherche.",
  description = "Essayez de modifier vos filtres.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
