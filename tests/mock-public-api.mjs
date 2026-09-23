// Production SSR test only: no real Supabase request or credentials are used.
process.env.SUPABASE_URL = "https://supabase.example.test";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
const event = {
  id: "00000000-0000-0000-0000-000000000001",
  titre: "Festival test SSR",
  slug: "festival-test-ssr",
  description: "[b]Bienvenue[/b] au [i]festival[/i] [u]annuel[/u].",
  description_format: "formatted",
  date_debut: "2020-12-25",
  date_fin: null,
  date_fin_effective: "2020-12-25",
  occurrence_start: "2030-12-25",
  occurrence_end: "2030-12-25",
  annuel: true,
  heure_debut: "18:00:00",
  heure_fin: null,
  image_url: "https://images.example.test/festival.png",
  image_alt: "Affiche du festival",
  categories: null,
  category_id: null,
  statut: "publie",
  demo: false,
  mise_en_avant: true,
  ville: "Douala",
  pays: "Cameroun",
  organisateur: "Association test",
  lieu: "Centre culturel",
};

globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = init?.method || (input instanceof Request ? input.method : "GET");
  if (!["GET", "HEAD"].includes(method)) throw new Error("SSR test: writes prohibited");
  let data;
  if (url.pathname === "/rest/v1/categories") data = [];
  else if (url.pathname === "/rest/v1/event_occurrences") {
    const slug = url.searchParams.get("slug");
    data = url.searchParams.has("id") ? [] : [{ ...event }];
    if (slug === "eq.festival-sans-image") {
      data = [{ ...event, slug: "festival-sans-image", image_url: null }];
    } else if (slug && slug !== `eq.${event.slug}`) data = [];
  } else throw new Error(`SSR test: unexpected request ${url.pathname}`);
  return new Response(method === "HEAD" ? null : JSON.stringify(data), {
    headers: { "Content-Type": "application/json", "Content-Range": `0-0/${data.length}` },
  });
};
