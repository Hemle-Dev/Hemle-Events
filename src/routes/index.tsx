import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";

import heroImage from "@/assets/hero.jpg.asset.json";
import { EmptyState, EventGrid } from "@/components/event-card";
import { PublicLayout, SectionHeading } from "@/components/public-layout";
import { AddEventButton } from "@/components/site-header";
import { SocialLinks } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchCategoriesWithCounts, fetchHighlights } from "@/lib/events";
import { SITE } from "@/lib/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HEMLÉ Events — l'agenda de l'Afrique et de sa diaspora" },
      {
        name: "description",
        content:
          "Découvrez les événements qui font vibrer l'Afrique et sa diaspora : festivals, conférences, salons, formations et rendez-vous communautaires.",
      },
      { property: "og:title", content: "HEMLÉ Events — l'agenda de l'Afrique et de sa diaspora" },
      {
        property: "og:description",
        content: "Recherchez, filtrez et découvrez les événements africains et diasporiques.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const [highlights, categories] = await Promise.all([fetchHighlights(), fetchCategoriesWithCounts()]);
    return { ...highlights, categories };
  },
  component: Home,
});

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <form
      className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        void navigate({ to: "/evenements", search: q.trim() ? { q: q.trim() } : {} });
      }}
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <label className="sr-only" htmlFor="hero-search">
          Rechercher un événement
        </label>
        <Input
          id="hero-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, ville, pays ou mot-clé"
          className="h-12 bg-background pl-9"
        />
      </div>
      <Button type="submit" size="lg" className="h-12">
        Rechercher
      </Button>
    </form>
  );
}

function Home() {
  const { aLaUne, ceWeekEnd, prochains, categories } = Route.useLoaderData();

  return (
    <PublicLayout>
      <section className="hero-gradient relative overflow-hidden">
        <img
          src={heroImage.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-35"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="container-page animate-rise relative py-20 text-center sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            Afrique · Diasporas · Nations
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance-tight font-display text-4xl font-bold text-white sm:text-6xl">
            HEMLÉ Events
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{SITE.tagline}</p>
          <HeroSearch />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/evenements">
                Découvrir les événements
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <AddEventButton size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20" />
          </div>
        </div>
      </section>

      <div className="container-page py-16 sm:py-20">
        <section aria-labelledby="a-la-une">
          <SectionHeading
            eyebrow="À la une"
            title="Les rendez-vous à ne pas manquer"
            description="Une sélection éditoriale de la rédaction HEMLÉ."
          />
          <div id="a-la-une" />
          {aLaUne.length ? <EventGrid events={aLaUne} /> : <EmptyState title="Aucune mise en avant pour le moment." description="Revenez bientôt." />}
        </section>

        {ceWeekEnd.length ? (
          <section className="mt-20" aria-labelledby="ce-week-end">
            <SectionHeading
              eyebrow="Ce week-end"
              title="Ce qui se passe ce week-end"
              action={
                <Button asChild variant="ghost">
                  <Link to="/evenements" search={{ date: "week-end" }}>
                    Tout voir <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              }
            />
            <div id="ce-week-end" />
            <EventGrid events={ceWeekEnd} />
          </section>
        ) : null}

        <section className="mt-20" aria-labelledby="prochains">
          <SectionHeading
            eyebrow="Agenda"
            title="Prochains événements"
            action={
              <Button asChild variant="ghost">
                <Link to="/evenements">
                  Tous les événements <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <div id="prochains" />
          {prochains.length ? <EventGrid events={prochains} /> : <EmptyState />}
        </section>

        <section className="mt-20" aria-labelledby="categories-home">
          <SectionHeading eyebrow="Explorer" title="Découvrir par catégorie" />
          <div id="categories-home" />
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to="/evenements"
                search={{ categorie: cat.slug }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {cat.nom}
                <span className="ml-2 text-xs text-muted-foreground">{cat.count}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <p className="eyebrow">HEMLÉ Events</p>
            <h2 className="mt-3 font-display text-2xl font-bold">
              L'agenda porté par HEMLÉ Magazine
            </h2>
            <p className="mt-4 text-muted-foreground">
              HEMLÉ Events met en visibilité les événements qui animent le continent africain et ses
              diasporas : culture, business, formation, festivals, initiatives communautaires. Une
              consultation libre, sans compte ni inscription.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/a-propos">En savoir plus sur HEMLÉ</Link>
            </Button>
          </div>

          <div className="surface-ink rounded-3xl p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-foreground/60">
              Vous organisez un événement ?
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink-foreground">
              Proposez-le à la rédaction HEMLÉ
            </h2>
            <p className="mt-4 text-ink-foreground/75">
              Remplissez le formulaire de proposition : l'équipe HEMLÉ revient vers vous pour les
              modalités de publication.
            </p>
            <AddEventButton size="lg" variant="secondary" className="mt-6" />
          </div>
        </section>

        <section className="mt-20 text-center" aria-labelledby="suivez-hemle">
          <SectionHeading eyebrow="Communauté" title="Suivez HEMLÉ" />
          <div id="suivez-hemle" />
          <SocialLinks className="justify-center" />
        </section>
      </div>
    </PublicLayout>
  );
}
