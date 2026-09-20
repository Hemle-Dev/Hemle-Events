export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;",
      "'": "&apos;",
    };
    return entities[character]!;
  });
}

export function sitemapXml(origin: string, events: { slug: string; updated_at: string }[]): string {
  const base = origin.replace(/\/$/, "");
  const pages = ["/", "/evenements", "/categories", "/a-propos"].map(
    (path) => `<url><loc>${escapeXml(base + path)}</loc></url>`,
  );
  for (const event of events) {
    const updated = new Date(event.updated_at);
    const lastmod = Number.isNaN(updated.getTime())
      ? ""
      : `<lastmod>${updated.toISOString()}</lastmod>`;
    pages.push(
      `<url><loc>${escapeXml(`${base}/evenements/${encodeURIComponent(event.slug)}`)}</loc>${lastmod}</url>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.join("")}</urlset>`;
}
