import assert from "node:assert/strict";

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3107";
for (const path of [
  "/",
  "/evenements",
  "/categories",
  "/a-propos",
  "/auth",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.png",
]) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  if (path === "/favicon.png") {
    assert.match(response.headers.get("content-type"), /image\/png/);
    console.log(`${path}: OK`);
    continue;
  }
  const body = await response.text();
  if (path === "/robots.txt") {
    assert.match(body, /Disallow: \/admin/);
    assert.match(body, /Sitemap: https?:\/\/.+\/sitemap.xml/);
  } else if (path === "/sitemap.xml") {
    assert.match(body, /<urlset/);
    assert.ok(!body.includes("/admin"));
  } else {
    assert.match(body, /<html[^>]+lang="fr"/);
    if (path === "/auth") assert.match(response.headers.get("x-robots-tag"), /noindex/);
    else assert.match(body, /rel="canonical"/);
  }
  console.log(`${path}: OK`);
}
const missing = await fetch(base + "/page-inexistante-test", {
  signal: AbortSignal.timeout(30000),
});
assert.equal(missing.status, 404);
assert.match(missing.headers.get("x-robots-tag"), /noindex/);
console.log("404: OK");
