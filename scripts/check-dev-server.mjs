import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Start Vite separately. This test never signs in or writes to Supabase.
const base = process.env.DEV_BASE_URL || "http://localhost:3000";
const logo = await readFile(new URL("../public/hemle-logo.png", import.meta.url));
for (const path of ["/hemle-logo.png", "/hemle-logo.png?integrity-check=1"]) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get("content-type") || "", /image\/png/);
  const received = Buffer.from(await response.arrayBuffer());
  assert.ok(
    received.equals(logo),
    `${path}: PNG served differs from the original (possible stream corruption)`,
  );
  console.log(`${path}: ${received.length} bytes, identical to disk`);
}

for (const path of [
  "/src/routes/evenements/$slug.tsx",
  "/src/routes/_authenticated/admin/evenements/$id.tsx",
]) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, `${path}: must not redirect to an undefined path`);
  assert.match(response.headers.get("content-type") || "", /javascript/);
  assert.ok((await response.text()).length > 0);
  console.log(`${path}: JavaScript served without redirect`);
}

const auth = await fetch(new URL("/auth", base), { signal: AbortSignal.timeout(30000) });
assert.equal(auth.status, 200);
assert.match(auth.headers.get("x-robots-tag") || "", /noindex/);
const html = await auth.text();
assert.match(html, /id="identifier"/);
assert.match(html, /id="password"/);
console.log("/auth: login form rendered on the server, noindex preserved");
