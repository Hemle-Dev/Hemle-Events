import React from "react";
import { createRoot } from "react-dom/client";
import { createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { FeaturedCarousel } from "../../src/components/featured-carousel";
import { fetchHighlights, fetchPublicEvents, type EventWithCategory } from "../../src/lib/events";
import "../../src/styles.css";

const events = Array.from({ length: 14 }, (_, index) => ({
  id: String(index).padStart(4, "0"),
  titre: `Événement ${index + 1}`,
  slug: `event-${index + 1}`,
  audience: index === 13 ? null : index % 2 ? "diaspora" : "afrique",
  date_debut: `2030-12-${String(index + 1).padStart(2, "0")}`,
  occurrence_start: `2030-12-${String(index + 1).padStart(2, "0")}`,
  occurrence_end: `2030-12-${String(index + 1).padStart(2, "0")}`,
  date_fin: null,
  heure_debut: null,
  heure_fin: null,
  annuel: false,
  categories: null,
  image_url: null,
  ville: "Ville test",
  pays: "Pays test",
  mise_en_avant: true,
  statut: "publie",
})) as unknown as EventWithCategory[];
const requests: string[] = [];
globalThis.fetch = async (input) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.pathname !== "/rest/v1/event_occurrences")
    throw new Error("No external requests allowed in fixture");
  requests.push(url.search);
  let rows = events;
  const audience = url.searchParams.get("audience")?.slice(3);
  if (audience) rows = rows.filter((event) => event.audience === audience);
  const total = rows.length;
  const limit = Number(url.searchParams.get("limit"));
  if (limit) rows = rows.slice(0, limit);
  return new Response(JSON.stringify(rows), {
    headers: {
      "Content-Type": "application/json",
      "Content-Range": `0-${rows.length - 1}/${total}`,
    },
  });
};
void Promise.all([
  fetchHighlights(),
  fetchHighlights("diaspora"),
  fetchPublicEvents({ audience: "afrique" }),
]).then(([all, diaspora, africa]) => {
  Object.assign(window, {
    carouselQueries: {
      all: all.aLaUne,
      diaspora: diaspora.aLaUne,
      africa: africa.events,
      requests,
    },
  });
});
export function CarouselFixture() {
  const count = Number(new URLSearchParams(window.location.search).get("count") || "12");
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-4">À la une</h1>
      <FeaturedCarousel events={events.slice(0, count)} />
    </main>
  );
}
const routeTree = createRootRoute({ component: CarouselFixture });
const router = createRouter({ routeTree });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
