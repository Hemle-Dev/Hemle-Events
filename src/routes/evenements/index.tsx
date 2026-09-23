import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Filter, Search, X } from "lucide-react";
import { useState } from "react";

import { EmptyState, EventCardSkeleton, EventGrid } from "@/components/event-card";
import { PublicLayout } from "@/components/public-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SITE } from "@/lib/site";
import { socialMeta } from "@/lib/social-meta";
import {
  DATE_FILTERS,
  fetchCategories,
  fetchFilterOptions,
  fetchPublicEvents,
  type DateFilter,
} from "@/lib/events";

type EventSearch = {
  q?: string | undefined;
  date?: DateFilter | undefined;
  pays?: string | undefined;
  ville?: string | undefined;
  categorie?: string | undefined;
  type?: string | undefined;
  page?: number | undefined;
};

const DATE_VALUES = DATE_FILTERS.map((d) => d.value) as readonly string[];

export const Route = createFileRoute("/evenements/")({
  validateSearch: (search: Record<string, unknown>): EventSearch => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    date:
      typeof search["date"] === "string" && DATE_VALUES.includes(search["date"])
        ? (search["date"] as DateFilter)
        : undefined,
    pays: typeof search["pays"] === "string" && search["pays"] ? search["pays"] : undefined,
    ville: typeof search["ville"] === "string" && search["ville"] ? search["ville"] : undefined,
    categorie:
      typeof search["categorie"] === "string" && search["categorie"]
        ? search["categorie"]
        : undefined,
    type: typeof search["type"] === "string" && search["type"] ? search["type"] : undefined,
    page:
      Number.isSafeInteger(Number(search["page"])) && Number(search["page"]) > 1
        ? Number(search["page"])
        : undefined,
  }),
  head: () => ({
    links: [{ rel: "canonical", href: `${SITE.url}/evenements` }],
    meta: [
      { title: "Tous les événements — HEMLÉ Events" },
      {
        name: "description",
        content:
          "Recherchez et filtrez les événements d'Afrique et de la diaspora par date, pays, ville et catégorie.",
      },
      ...socialMeta({
        siteUrl: SITE.url,
        title: "Tous les événements — HEMLÉ Events",
        description:
          "Recherchez et filtrez les événements d'Afrique et de la diaspora par date, pays, ville et catégorie.",
        path: "/evenements",
      }),
    ],
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    events: await fetchPublicEvents({ ...deps, perPage: PER_PAGE }),
    categories: await fetchCategories(),
    options: await fetchFilterOptions(),
  }),
  component: Catalogue,
});

const PER_PAGE = 12;

function Catalogue() {
  const search = Route.useSearch();
  const { categories, options, events } = Route.useLoaderData();
  const navigate = useNavigate();
  const [term, setTerm] = useState(search.q ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setSearch = (patch: Partial<EventSearch>) =>
    void navigate({ to: "/evenements", search: { ...search, ...patch, page: undefined } });

  const query = useQuery({
    queryKey: ["events", search],
    queryFn: () => fetchPublicEvents({ ...search, perPage: PER_PAGE }),
    initialData: events,
  });

  const activeTags = [
    search.date
      ? { key: "date", label: DATE_FILTERS.find((d) => d.value === search.date)?.label ?? "" }
      : null,
    search.pays ? { key: "pays", label: search.pays } : null,
    search.ville ? { key: "ville", label: search.ville } : null,
    search.categorie
      ? {
          key: "categorie",
          label: categories.find((c) => c.slug === search.categorie)?.nom ?? search.categorie,
        }
      : null,
    search.type ? { key: "type", label: search.type } : null,
    search.q ? { key: "q", label: `« ${search.q} »` } : null,
  ].filter(Boolean) as { key: keyof EventSearch; label: string }[];

  const total = query.data?.total ?? 0;
  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const filtersPanel = (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Quand ?</legend>
        <div className="flex flex-wrap gap-2">
          {DATE_FILTERS.map((d) => (
            <Button
              key={d.value}
              type="button"
              size="sm"
              variant={search.date === d.value ? "default" : "outline"}
              onClick={() => setSearch({ date: search.date === d.value ? undefined : d.value })}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="filtre-pays">Pays</Label>
          <Select
            value={search.pays ?? "all"}
            onValueChange={(v) => setSearch({ pays: v === "all" ? undefined : v })}
          >
            <SelectTrigger id="filtre-pays" className="mt-1.5 w-full">
              <SelectValue placeholder="Tous les pays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les pays</SelectItem>
              {options.pays.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="filtre-ville">Ville</Label>
          <Select
            value={search.ville ?? "all"}
            onValueChange={(v) => setSearch({ ville: v === "all" ? undefined : v })}
          >
            <SelectTrigger id="filtre-ville" className="mt-1.5 w-full">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {options.villes.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="filtre-categorie">Catégorie</Label>
          <Select
            value={search.categorie ?? "all"}
            onValueChange={(v) => setSearch({ categorie: v === "all" ? undefined : v })}
          >
            <SelectTrigger id="filtre-categorie" className="mt-1.5 w-full">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {options.types.length ? (
          <div>
            <Label htmlFor="filtre-type">Type d'événement</Label>
            <Select
              value={search.type ?? "all"}
              onValueChange={(v) => setSearch({ type: v === "all" ? undefined : v })}
            >
              <SelectTrigger id="filtre-type" className="mt-1.5 w-full">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {options.types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <PublicLayout>
      <div className="border-b border-border bg-muted/40">
        <div className="container-page py-12">
          <p className="eyebrow">Agenda</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Tous les événements</h1>
          <form
            role="search"
            className="mt-6 flex flex-col gap-3 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch({ q: term.trim() || undefined });
            }}
          >
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <label className="sr-only" htmlFor="catalog-search">
                Rechercher un événement
              </label>
              <Input
                id="catalog-search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Nom, ville, pays, organisateur ou mot-clé"
                className="h-12 bg-background pl-9"
              />
            </div>
            <Button type="submit" size="lg" className="h-12">
              Rechercher
            </Button>
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="lg" className="h-12 lg:hidden">
                  <Filter aria-hidden="true" />
                  Filtrer
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                <SheetTitle>Filtrer les événements</SheetTitle>
                <div className="mt-6">{filtersPanel}</div>
                <Button className="mt-6 w-full" onClick={() => setDrawerOpen(false)}>
                  Voir les résultats
                </Button>
              </SheetContent>
            </Sheet>
          </form>
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block" aria-label="Filtres">
          <h2 className="mb-4 font-display text-lg font-semibold">Filtres</h2>
          {filtersPanel}
        </aside>

        <div>
          {activeTags.length ? (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {activeTags.map((tag) => (
                <Badge key={tag.key} variant="secondary" className="gap-1 py-1 pl-3 pr-1">
                  {tag.label}
                  <button
                    type="button"
                    aria-label={`Retirer le filtre ${tag.label}`}
                    className="ml-1 rounded-full p-1 hover:bg-background"
                    onClick={() => {
                      if (tag.key === "q") setTerm("");
                      setSearch({ [tag.key]: undefined } as Partial<EventSearch>);
                    }}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTerm("");
                  void navigate({ to: "/evenements", search: {} });
                }}
              >
                Réinitialiser
              </Button>
            </div>
          ) : null}

          <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">
            {query.isLoading ? "Chargement…" : `${total} événement${total > 1 ? "s" : ""}`}
          </p>

          {query.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : query.isError ? (
            <EmptyState
              title="Les événements n'ont pas pu être chargés."
              description="Vérifiez votre connexion et réessayez."
            />
          ) : query.data && query.data.events.length ? (
            <>
              <EventGrid events={query.data.events} />
              {pages > 1 ? (
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() =>
                      void navigate({ to: "/evenements", search: { ...search, page: page - 1 } })
                    }
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} / {pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= pages}
                    onClick={() =>
                      void navigate({ to: "/evenements", search: { ...search, page: page + 1 } })
                    }
                  >
                    Suivant
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
