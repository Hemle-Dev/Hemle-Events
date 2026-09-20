import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PublicLayout } from "@/components/public-layout";
import { fetchCategoriesWithCounts } from "@/lib/events";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Catégories d'événements — HEMLÉ Events" },
      {
        name: "description",
        content:
          "Culture, business, festivals, formations, sport, mode : explorez l'agenda HEMLÉ Events par catégorie.",
      },
      { property: "og:title", content: "Catégories d'événements — HEMLÉ Events" },
      {
        property: "og:description",
        content: "Explorez les événements d'Afrique et de la diaspora par catégorie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: () => fetchCategoriesWithCounts(),
  component: Categories,
});

function Categories() {
  const categories = Route.useLoaderData();

  return (
    <PublicLayout>
      <div className="border-b border-border bg-muted/40">
        <div className="container-page py-12">
          <p className="eyebrow">Explorer</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Catégories</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Parcourez l'agenda par thématique et retrouvez les rendez-vous qui vous ressemblent.
          </p>
        </div>
      </div>

      <div className="container-page grid gap-5 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to="/evenements"
            search={{ categorie: cat.slug }}
            className="card-lift group rounded-2xl border border-border bg-card p-6 shadow-card hover:-translate-y-1 hover:border-primary hover:shadow-lift"
          >
            <h2 className="font-display text-xl font-semibold group-hover:text-primary">{cat.nom}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {cat.count} événement{cat.count > 1 ? "s" : ""} à venir
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Voir les événements <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </PublicLayout>
  );
}
