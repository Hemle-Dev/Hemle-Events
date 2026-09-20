import assert from "node:assert/strict";
import test from "node:test";
import { escapeXml, sitemapXml } from "../src/lib/seo.ts";

test("XML escapes user-controlled content", () => {
  assert.equal(escapeXml('<a x="&">'), "&lt;a x=&quot;&amp;&quot;&gt;");
});

test("sitemap includes canonical public pages and safely encoded event URLs", () => {
  const xml = sitemapXml("https://events.example/", [
    { slug: "été & art", updated_at: "2026-09-20T12:00:00Z" },
  ]);
  assert.ok(xml.includes("https://events.example/evenements/%C3%A9t%C3%A9%20%26%20art"));
  assert.ok(xml.includes("<lastmod>2026-09-20T12:00:00.000Z</lastmod>"));
  assert.ok(!xml.includes("/admin"));
  assert.equal((xml.match(/<url>/g) ?? []).length, 5);
});
