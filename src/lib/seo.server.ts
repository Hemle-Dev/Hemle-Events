import { createClient } from "@supabase/supabase-js";
import { SITE } from "./site";
import { sitemapXml } from "./seo";

export async function seoResponse(request: Request): Promise<Response | undefined> {
  const { pathname } = new URL(request.url);
  if (pathname !== "/robots.txt" && pathname !== "/sitemap.xml") return undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  if (pathname === "/robots.txt") {
    const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth\nDisallow: /api/\nSitemap: ${SITE.url}/sitemap.xml\n`;
    return new Response(request.method === "HEAD" ? null : body, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  // Deliberately anonymous: a sitemap must never expose staff-only drafts.
  const client = createClient(
    import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "",
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const events: { slug: string; updated_at: string }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client
      .from("events")
      .select("slug, updated_at")
      .eq("demo", false)
      .or(`statut.eq.publie,and(statut.eq.programme,published_at.lte.${new Date().toISOString()})`)
      .order("id")
      .range(offset, offset + 999);
    if (error) {
      console.error("Sitemap unavailable:", error.code);
      return new Response("Sitemap temporairement indisponible", {
        status: 503,
        headers: { "Retry-After": "300" },
      });
    }
    events.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    if (events.length >= 49000) {
      return new Response("Sitemap capacity exceeded", { status: 503 });
    }
  }
  return new Response(request.method === "HEAD" ? null : sitemapXml(SITE.url, events), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
