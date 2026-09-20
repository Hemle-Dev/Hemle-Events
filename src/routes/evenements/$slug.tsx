import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  ExternalLink,
  Facebook,
  Link2,
  Linkedin,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EventGrid } from "@/components/event-card";
import { PublicLayout, SectionHeading } from "@/components/public-layout";
import { AddEventButton } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchEventBySlug,
  fetchSimilarEvents,
  formatEventDates,
  type EventWithCategory,
} from "@/lib/events";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/evenements/$slug")({
  loader: async ({ params }) => {
    const event = await fetchEventBySlug(params.slug);
    if (!event) throw notFound();
    const similaires = await fetchSimilarEvents(event);
    return { event, similaires };
  },
  head: ({ loaderData }) => {
    const event = loaderData?.event;
    if (!event) return {};
    const title = `${event.titre} — HEMLÉ Events`;
    const description = event.description.slice(0, 155);
    const url = `${SITE.url}/evenements/${event.slug}`;
    const image = event.image_url ?? undefined;
    return {
      meta: [
        ...(event.demo ? [{ name: "robots", content: "noindex, follow" }] : []),
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.titre,
            description: event.description,
            startDate: event.heure_debut
              ? `${event.date_debut}T${event.heure_debut}`
              : event.date_debut,
            endDate: event.date_fin ?? event.date_debut,
            image: image ? [image] : undefined,
            eventStatus: "https://schema.org/EventScheduled",
            location: {
              "@type": "Place",
              name: event.lieu ?? event.ville,
              address: {
                "@type": "PostalAddress",
                addressLocality: event.ville,
                addressCountry: event.pays,
              },
            },
            organizer: event.organisateur
              ? {
                  "@type": "Organization",
                  name: event.organisateur,
                  url: event.site_web ?? undefined,
                }
              : undefined,
            url,
          }).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
  component: EventDetail,
  notFoundComponent: () => (
    <PublicLayout>
      <div className="container-page py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Événement introuvable</h1>
        <p className="mt-3 text-muted-foreground">
          Cet événement n'existe pas, n'est plus publié ou a été archivé.
        </p>
        <Button asChild className="mt-6">
          <Link to="/evenements">Voir tous les événements</Link>
        </Button>
      </div>
    </PublicLayout>
  ),
});

function ShareBar({ event }: { event: EventWithCategory }) {
  const [url, setUrl] = useState(`${SITE.url}/evenements/${event.slug}`);
  useEffect(() => setUrl(window.location.href), []);
  const text = encodeURIComponent(`${event.titre} — HEMLÉ Events`);

  const items = [
    {
      label: "Partager sur Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      Icon: Facebook,
    },
    {
      label: "Partager sur LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      Icon: Linkedin,
    },
    {
      label: "Partager sur WhatsApp",
      href: `https://wa.me/?text=${text}%20${encodeURIComponent(url)}`,
      Icon: MessageCircle,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ label, href, Icon }) => (
        <Button key={label} asChild variant="outline" size="icon" aria-label={label} title={label}>
          <a href={href} target="_blank" rel="noreferrer noopener">
            <Icon aria-hidden="true" />
          </a>
        </Button>
      ))}
      <Button
        variant="outline"
        size="icon"
        aria-label="Copier le lien"
        title="Copier le lien"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => toast.success("Lien copié"));
        }}
      >
        <Link2 aria-hidden="true" />
      </Button>
    </div>
  );
}

function EventDetail() {
  const { event, similaires } = Route.useLoaderData();

  return (
    <PublicLayout>
      <article>
        <div className="relative h-[42vh] min-h-72 w-full overflow-hidden bg-neutral-900">
          {event.image_url ? (
            <>
              {/* Fond flouté : l'affiche reste entière et non déformée, même en format carré. */}
              <img
                src={event.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
              />
              <img
                src={event.image_url}
                alt={event.image_alt ?? event.titre}
                className="relative mx-auto h-full w-auto max-w-full object-contain"
              />
            </>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
          <div className="container-page absolute inset-x-0 bottom-0 pb-8">
            {event.categories ? (
              <Badge className="bg-primary text-primary-foreground">{event.categories.nom}</Badge>
            ) : null}
            <h1 className="mt-3 max-w-3xl text-balance-tight font-display text-3xl font-bold text-white sm:text-5xl">
              {event.titre}
            </h1>
          </div>
        </div>

        <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_320px]">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
              <Link to="/evenements">
                <ArrowLeft aria-hidden="true" /> Retour à l'agenda
              </Link>
            </Button>

            <div className="prose-none space-y-4 whitespace-pre-line text-base leading-relaxed text-foreground/90">
              {event.description}
            </div>

            {event.organisateur ? (
              <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Users className="size-4 text-primary" aria-hidden="true" />
                  Organisateur
                </h2>
                <p className="mt-2 font-medium">{event.organisateur}</p>
                {event.organisateur_description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {event.organisateur_description}
                  </p>
                ) : null}
                {event.site_web ? (
                  <a
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    href={event.site_web}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Site web <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ) : null}

            {event.mots_cles.length ? (
              <ul className="mt-8 flex flex-wrap gap-2">
                {event.mots_cles.map((mot) => (
                  <li key={mot}>
                    <Badge variant="secondary">{mot}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <dl className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <CalendarDays
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="font-semibold">Dates</dt>
                    <dd className="text-muted-foreground">{formatEventDates(event)}</dd>
                  </div>
                </div>
                {event.heure_debut ? (
                  <div className="flex gap-3">
                    <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div>
                      <dt className="font-semibold">Horaires</dt>
                      <dd className="text-muted-foreground">
                        {event.heure_debut.slice(0, 5)}
                        {event.heure_fin ? ` – ${event.heure_fin.slice(0, 5)}` : ""}
                      </dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <dt className="font-semibold">Lieu</dt>
                    <dd className="text-muted-foreground">
                      {event.lieu ? `${event.lieu}, ` : ""}
                      {event.ville}, {event.pays}
                    </dd>
                  </div>
                </div>
              </dl>

              {event.lien_inscription ? (
                <Button asChild className="mt-6 w-full" size="lg">
                  <a href={event.lien_inscription} target="_blank" rel="noreferrer noopener">
                    S'inscrire / En savoir plus
                    <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
              ) : null}

              <div className="mt-6">
                <p className="mb-2 text-sm font-semibold">Partager</p>
                <ShareBar event={event} />
              </div>
            </div>

            <div className="surface-ink rounded-2xl p-6">
              <p className="font-display text-lg font-semibold text-ink-foreground">
                Vous organisez un événement ?
              </p>
              <p className="mt-2 text-sm text-ink-foreground/75">
                Proposez-le à la rédaction HEMLÉ.
              </p>
              <AddEventButton variant="secondary" className="mt-4 w-full" />
            </div>
          </aside>
        </div>

        {similaires.length ? (
          <div className="container-page pb-8">
            <SectionHeading eyebrow="À découvrir" title="Événements similaires" />
            <EventGrid events={similaires} />
          </div>
        ) : null}
      </article>
    </PublicLayout>
  );
}
